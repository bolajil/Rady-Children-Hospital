"""
Scan Analysis Router - GPT-4 Vision + OCR/IDP Pipeline
Supports real medical image analysis using OpenAI GPT-4o Vision API with:
- Stage 1: OCR/IDP text extraction (embedded labels, measurements, patient data)
- Stage 2: Enriched radiological analysis using extracted context
- Tesseract fallback when available
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import base64
import os
import logging
import hashlib
import httpx
import json
import re
import io
from app.phi_guardrail import get_guardrail

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff", "image/bmp", "image/gif"}
MAX_IMAGE_SIZE_MB = 20
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Attempt to import Tesseract (optional — degrades gracefully if not installed)
try:
    import pytesseract
    from PIL import Image
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False

# PHI fields in ocr_fields that must always be scrubbed before returning to the client
_OCR_PHI_KEYS = {"patient_name", "patient_id", "dob"}

# Supplemental patterns — ORDER MATTERS: combined patterns must run before their parts.
_SCAN_PHI_PATTERNS = [
    # 1. "FirstName LastName - rID: 232421" — combined, must match BEFORE rID is replaced separately
    (re.compile(
        r'[A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20}\s*[-–]\s*r?ID[:\s#]*\d{4,12}\b',
        re.IGNORECASE
    ), "[PATIENT_NAME - RECORD_ID]"),
    # 2. "FirstName LastName" preceding any ID/MRN/DOB/number — before ID numbers are replaced
    (re.compile(
        r'(?:(?:patient|name|pt)[:\s]+)?[A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20}(?=\s*[-–,]?\s*(?:r?ID|MRN|DOB|\d))',
        re.IGNORECASE
    ), "[PATIENT_NAME]"),
    # 3. Standalone record/PACS IDs after names are already handled
    (re.compile(r'\b(?:r?ID|Record\s*ID)[:\s#]*\d{4,12}\b', re.IGNORECASE), "[RECORD_ID]"),
    # 4. Age label: "Age: 20 years"
    (re.compile(r'\bAge\s*:\s*\d{1,3}\s*(?:years?|yrs?|y\.?o\.?)?\b', re.IGNORECASE), "[AGE]"),
    # 5. Gender label: "Gender: Male/Female/M/F"
    (re.compile(r'\bGender\s*:\s*(?:Male|Female|M|F|Non-binary|Other)\b', re.IGNORECASE), "[GENDER]"),
]


def _redact_phi_from_ocr_text(raw_text: str, session_id: str = "scan-ocr") -> str:
    """
    Redact PHI from OCR-extracted text.
    Applies two layers:
    1. Generic PHI guardrail (SSN, email, phone, address, MRN, DOB patterns)
    2. Scan-label-specific patterns (rID, Age:, Gender:, bare names near IDs)
    """
    if not raw_text:
        return raw_text
    redacted = raw_text

    # Layer 1: existing guardrail detector — use REDACT tokens but immediately
    # convert them to generic [REDACTED] so no PHI leaks through
    try:
        guardrail = get_guardrail()
        phi_matches = guardrail.detector.detect(redacted)
        # Replace in reverse order to preserve indices
        for match in reversed(phi_matches):
            placeholder = f"[{match.phi_type.value.upper()}]"
            redacted = redacted[:match.start] + placeholder + redacted[match.end:]
    except Exception as e:
        logger.warning(f"PHI guardrail detection error: {e}")

    # Layer 2: scan-specific supplemental patterns
    for pattern, placeholder in _SCAN_PHI_PATTERNS:
        redacted = pattern.sub(placeholder, redacted)

    return redacted


def _scrub_phi_from_ocr_fields(fields: Optional[dict]) -> Optional[dict]:
    """
    Redact PHI from structured OCR fields.
    - Keys in _OCR_PHI_KEYS are always replaced with "[REDACTED]" regardless of value.
    - String values in all other keys are content-scanned and redacted.
    - List values have each item individually content-scanned and redacted.
    """
    if not fields:
        return fields
    scrubbed = {}
    for key, val in fields.items():
        if key in _OCR_PHI_KEYS:
            scrubbed[key] = "[REDACTED]"
        elif isinstance(val, list):
            scrubbed[key] = [_redact_phi_from_ocr_text(str(item)) for item in val]
        elif isinstance(val, str):
            scrubbed[key] = _redact_phi_from_ocr_text(val)
        else:
            scrubbed[key] = val
    return scrubbed


class ScanAnalysisResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    scan_type: str
    confidence_note: str
    body_region: str
    analysis_source: str = "ai"  # "ai", "ai+ocr", or "demo"
    # OCR/IDP fields (populated when text is found in the image)
    extracted_text: Optional[str] = None
    ocr_fields: Optional[dict] = None  # structured: patient_id, date, measurements, etc.
    ocr_source: Optional[str] = None   # "tesseract", "gpt4o-ocr", or None

# Multiple demo responses for variety
DEMO_RESPONSES = {
    "X-Ray": [
        {
            "body_region": "Chest",
            "findings": "PA and lateral chest radiographs demonstrate clear lung fields bilaterally. No focal consolidation, pleural effusion, or pneumothorax. Cardiac silhouette is normal in size. Mediastinal contours are unremarkable. Bony thorax is intact. No acute cardiopulmonary process identified.",
            "impression": "Normal chest radiograph for age. No acute cardiopulmonary abnormality.",
            "recommendations": "No imaging follow-up required. Clinical correlation if respiratory symptoms persist.",
        },
        {
            "body_region": "Hand/Wrist",
            "findings": "AP and lateral views of the hand demonstrate normal bone mineralization. All phalanges, metacarpals, and carpal bones are intact. No fracture, dislocation, or osseous lesion. Joint spaces preserved. Growth plates are open and age-appropriate. Soft tissues unremarkable.",
            "impression": "Normal pediatric hand radiograph. No acute osseous abnormality. Growth plates appropriate for stated age.",
            "recommendations": "No imaging follow-up indicated. Clinical reassessment if symptoms persist.",
        },
        {
            "body_region": "Abdomen",
            "findings": "Supine abdominal radiograph shows normal bowel gas pattern. No evidence of obstruction or free air. Soft tissue structures appear normal. No calcifications or foreign bodies identified. Visualized skeletal structures unremarkable.",
            "impression": "Normal abdominal radiograph. No acute abnormality identified.",
            "recommendations": "Clinical correlation recommended. Consider ultrasound if abdominal pathology suspected.",
        },
    ],
    "MRI": [
        {
            "body_region": "Brain",
            "findings": "Multiplanar MRI of the brain demonstrates normal signal intensity of the cerebral parenchyma. No evidence of acute infarct, hemorrhage, or mass lesion. Ventricles are normal in size and configuration. Midline structures are maintained. No abnormal enhancement following contrast administration. Major intracranial vessels demonstrate normal flow voids.",
            "impression": "Normal MRI of the pediatric brain. No intracranial pathology identified.",
            "recommendations": "No imaging follow-up required based on current findings.",
        },
        {
            "body_region": "Knee",
            "findings": "MRI of the knee demonstrates intact anterior and posterior cruciate ligaments. Medial and lateral menisci show normal signal and morphology. Articular cartilage appears preserved. No joint effusion or synovitis. Extensor mechanism intact. Bone marrow signal is normal throughout.",
            "impression": "Normal MRI of the pediatric knee. No internal derangement or acute pathology.",
            "recommendations": "Clinical correlation with physical therapy if indicated.",
        },
        {
            "body_region": "Spine",
            "findings": "MRI of the spine demonstrates normal vertebral body height and alignment. Intervertebral discs show normal signal intensity and morphology. Spinal cord demonstrates normal caliber and signal. No cord compression or neural foraminal narrowing. Paraspinal soft tissues unremarkable.",
            "impression": "Normal MRI of the spine. No disc herniation, cord abnormality, or osseous lesion.",
            "recommendations": "No additional imaging needed. Conservative management as clinically indicated.",
        },
    ],
    "CT Scan": [
        {
            "body_region": "Head",
            "findings": "Non-contrast CT of the head demonstrates normal brain parenchymal attenuation. No acute intracranial hemorrhage or mass effect. Ventricles are normal in size. No midline shift. Calvarium is intact. Paranasal sinuses and mastoid air cells are clear.",
            "impression": "Normal non-contrast CT of the head. No acute intracranial abnormality.",
            "recommendations": "MRI may be considered for further evaluation if clinically indicated.",
        },
        {
            "body_region": "Abdomen/Pelvis",
            "findings": "Contrast-enhanced CT of the abdomen and pelvis demonstrates normal solid organ enhancement. Liver, spleen, and kidneys appear normal. No lymphadenopathy. Bowel loops demonstrate normal caliber and enhancement. No free fluid or abscess. Appendix is normal in appearance.",
            "impression": "Normal CT of the abdomen and pelvis. No acute pathology identified.",
            "recommendations": "Clinical correlation recommended. Consider ultrasound for focused evaluation if needed.",
        },
    ],
    "Ultrasound": [
        {
            "body_region": "Abdomen",
            "findings": "Ultrasound of the abdomen demonstrates normal hepatic echotexture without focal lesion. Gallbladder is normal without stones or wall thickening. Common bile duct is not dilated. Pancreas is unremarkable. Spleen is normal in size. Both kidneys demonstrate normal size and echogenicity without hydronephrosis or stones.",
            "impression": "Normal abdominal ultrasound. No acute pathology identified.",
            "recommendations": "No imaging follow-up required. Clinical correlation as needed.",
        },
        {
            "body_region": "Renal",
            "findings": "Renal ultrasound demonstrates bilateral kidneys of normal size and echogenicity. No hydronephrosis, stones, or masses. Bladder is adequately distended without wall thickening. No post-void residual abnormality.",
            "impression": "Normal renal ultrasound. No evidence of obstruction or structural abnormality.",
            "recommendations": "Routine follow-up as clinically indicated.",
        },
    ],
    "PET Scan": [
        {
            "body_region": "Whole Body",
            "findings": "FDG-PET/CT demonstrates normal physiologic tracer distribution. No hypermetabolic focus suspicious for malignancy. Normal uptake in brain, heart, and genitourinary system. No pathologic lymph node activity. Skeletal structures show no concerning metabolic activity.",
            "impression": "Normal FDG-PET/CT. No evidence of hypermetabolic disease.",
            "recommendations": "Clinical correlation recommended. Follow-up as clinically indicated.",
        },
    ],
    "Fluoroscopy": [
        {
            "body_region": "Upper GI",
            "findings": "Fluoroscopic upper GI study demonstrates normal swallowing mechanism. Esophagus shows normal caliber and peristalsis. No stricture, web, or hiatal hernia. Gastroesophageal junction appears competent. Stomach demonstrates normal contour without ulcer or mass. Duodenum is unremarkable.",
            "impression": "Normal upper GI fluoroscopy. No reflux, stricture, or anatomic abnormality.",
            "recommendations": "No additional imaging needed based on current findings.",
        },
    ],
}

def _extract_text_tesseract(image_bytes: bytes) -> Optional[str]:
    """Run Tesseract OCR on image bytes. Returns raw text or None."""
    if not _TESSERACT_AVAILABLE:
        return None
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        text = pytesseract.image_to_string(img, config="--psm 6")
        cleaned = text.strip()
        return cleaned if len(cleaned) > 3 else None
    except Exception as e:
        logger.warning(f"Tesseract OCR failed: {e}")
        return None


async def _extract_text_gpt4o_ocr(
    image_base64: str,
    content_type: str,
) -> Optional[str]:
    """Use GPT-4o Vision in pure OCR mode to extract all text embedded in the image."""
    if not OPENAI_API_KEY:
        return None
    ocr_prompt = (
        "You are a medical image OCR engine. Extract ALL visible text from this image exactly as it appears. "
        "Classify extracted text into the correct field — especially separate CLINICAL PRESENTATION / "
        "clinical indication text (the reason the scan was ordered) from technical scan parameters.\n\n"
        "Return ONLY a JSON object in this exact format:\n"
        '{"raw_text": "all extracted text verbatim, newline-separated", '
        '"fields": {'
        '"patient_id": "", '
        '"patient_name": "", '
        '"dob": "", '
        '"scan_date": "", '
        '"scan_time": "", '
        '"modality": "", '
        '"institution": "", '
        '"clinical_indication": "", '
        '"measurements": [], '
        '"markers": [], '
        '"kv": "", '
        '"ma": "", '
        '"exposure": "", '
        '"views": [], '
        '"other": []}}\n\n'
        "Rules:\n"
        "- clinical_indication: the patient complaint or reason for imaging "
        "(e.g. 'Thumb injury', 'Chest pain', 'R/O pneumonia'). NEVER put this in 'other'.\n"
        "- views: imaging views listed on the image (e.g. Frontal, Lateral, AP, PA, Oblique).\n"
        "- markers: laterality or orientation markers (R, L, PA, AP, etc.).\n"
        "- measurements: any numeric measurements with units visible on the image.\n"
        "- other: only text that does not fit any other category.\n"
        "- If a field is not present, leave it as empty string or empty list.\n"
        "- Do NOT invent or infer values — only transcribe what is literally visible."
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": ocr_prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{content_type};base64,{image_base64}",
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 800,
                    "temperature": 0.0,
                },
            )
        if response.status_code != 200:
            logger.warning(f"GPT-4o OCR request failed: {response.status_code}")
            return None
        content = response.json()["choices"][0]["message"]["content"]
        # Extract JSON block
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        raw_json = json_match.group(1) if json_match else content
        parsed = json.loads(raw_json)
        return parsed  # dict with raw_text + fields
    except Exception as e:
        logger.warning(f"GPT-4o OCR extraction failed: {e}")
        return None


def _build_ocr_context_string(ocr_data) -> str:
    """Turn OCR output into a readable context string for the radiology prompt."""
    if not ocr_data:
        return ""
    if isinstance(ocr_data, str):
        return f"OCR-extracted text from image: {ocr_data}"
    parts = []
    fields = ocr_data.get("fields", {})
    # Clinical indication comes first — most relevant to the radiologist
    if fields.get("clinical_indication"):
        parts.append(f"Clinical Indication (from image overlay): {fields['clinical_indication']}")
    structured = []
    if fields.get("scan_date"):
        structured.append(f"Scan Date: {fields['scan_date']}")
    if fields.get("modality"):
        structured.append(f"Modality: {fields['modality']}")
    if fields.get("institution"):
        structured.append(f"Institution: {fields['institution']}")
    if fields.get("views"):
        structured.append(f"Views: {', '.join(str(v) for v in fields['views'])}")
    if fields.get("measurements"):
        structured.append(f"Measurements: {', '.join(str(m) for m in fields['measurements'])}")
    if fields.get("markers"):
        structured.append(f"Laterality/Markers: {', '.join(str(m) for m in fields['markers'])}")
    if fields.get("kv"):
        structured.append(f"kVp: {fields['kv']}")
    if fields.get("ma"):
        structured.append(f"mA: {fields['ma']}")
    if structured:
        parts.append("Technical parameters: " + " | ".join(structured))
    raw = ocr_data.get("raw_text", "").strip()
    if raw:
        parts.append(f"Full OCR text: {raw}")
    return "\n".join(parts)


def _extract_clinical_indication(ocr_data) -> str:
    """Pull clinical_indication out of OCR data for merging into clinical_context."""
    if not ocr_data or not isinstance(ocr_data, dict):
        return ""
    return ocr_data.get("fields", {}).get("clinical_indication", "").strip()


async def analyze_with_gpt4_vision(
    image_base64: str,
    content_type: str,
    scan_type: str,
    clinical_context: str,
    ocr_context: str = "",
) -> ScanAnalysisResponse | None:
    """
    Analyze medical image using GPT-4o Vision API.
    Returns None if analysis fails or is refused.
    """
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not configured, using demo response")
        return None
    
    # Build the analysis prompt
    system_prompt = """You are an expert pediatric radiologist AI assistant providing preliminary image analysis for educational and clinical decision support purposes.

IMPORTANT: This is a DEMONSTRATION system for a children's hospital. Provide detailed, realistic radiological findings based on what you observe in the image.

For each image analysis, you MUST respond in this EXACT JSON format:
{
    "body_region": "Identified anatomical region (e.g., Chest, Hand, Brain, Abdomen)",
    "findings": "Detailed technical findings describing what is observed in the image. Use proper radiological terminology. Describe normal and any abnormal findings systematically. If a clinical indication is provided, specifically evaluate that region and report whether imaging supports or contradicts the clinical concern.",
    "impression": "Summary diagnosis or assessment. ALWAYS correlate with the stated clinical indication. If the clinical indication mentions injury/pain/concern and imaging appears normal, explicitly state: 'No acute [injury type] identified on [modality]; clinical suspicion warrants [next step]'.",
    "recommendations": "Clinical recommendations. If clinical indication suggests injury but imaging is negative, ALWAYS recommend clinical correlation and specify when MRI, CT, or orthopedic/specialist referral should be considered."
}

Guidelines:
- Describe what you actually see in the image with anatomical precision
- Use appropriate radiological terminology
- ALWAYS explicitly correlate imaging findings with the clinical indication
- When imaging appears normal but clinical concern exists: say so clearly and recommend appropriate follow-up
- Do not dismiss a clinical concern just because plain film appears normal — many injuries (ligament tears, occult fractures, bone bruises) are invisible on X-ray
- Note image quality or positioning issues if relevant"""

    ocr_section = f"\n\nOCR-Extracted Image Text (technical metadata and clinical indication from image overlay):\n{ocr_context}" if ocr_context else ""

    user_prompt = f"""Analyze this {scan_type} image for a pediatric patient.

Clinical Context: {clinical_context if clinical_context else "Routine imaging study, no specific clinical concerns provided."}{ocr_section}

Provide a detailed radiological analysis. If a clinical indication is present (either from the Clinical Context or OCR overlay), explicitly address whether the imaging findings support or rule out the stated concern. In your recommendations, state the appropriate next steps if clinical suspicion remains despite negative plain film findings."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{content_type};base64,{image_base64}",
                                        "detail": "high"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.3
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                return None
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Check for refusal patterns
            refusal_patterns = [
                "i can't assist",
                "i cannot assist", 
                "i'm not able to",
                "i am not able to",
                "cannot analyze medical",
                "cannot provide medical",
                "i'm sorry",
                "i apologize"
            ]
            if any(pattern in content.lower() for pattern in refusal_patterns):
                logger.warning(f"GPT-4 Vision refused analysis: {content[:100]}")
                return None
            
            # Parse JSON from response
            # Try to extract JSON from markdown code blocks if present
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find raw JSON
                json_match = re.search(r'\{[^{}]*"body_region"[^{}]*\}', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = content
            
            try:
                parsed = json.loads(json_str)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse GPT response as JSON: {content[:200]}")
                return None
            
            confidence_note = (
                "AI-ASSISTED ANALYSIS: This preliminary reading was generated by GPT-4 Vision AI. "
                "All findings MUST be verified by a board-certified pediatric radiologist before any clinical decision-making. "
                "AI analysis is for decision support only and does not constitute a formal radiological report."
            )
            
            return ScanAnalysisResponse(
                body_region=parsed.get("body_region", "Not specified"),
                findings=parsed.get("findings", "Unable to extract findings from AI response."),
                impression=parsed.get("impression", "Unable to extract impression from AI response."),
                recommendations=parsed.get("recommendations", "Radiologist review recommended."),
                scan_type=scan_type,
                confidence_note=confidence_note,
                analysis_source="ai"
            )
            
    except httpx.TimeoutException:
        logger.error("OpenAI API timeout")
        return None
    except Exception as e:
        logger.error(f"GPT-4 Vision analysis error: {str(e)}")
        return None


def get_demo_response(scan_type: str, clinical_context: str, image_hash: str) -> ScanAnalysisResponse:
    """Return contextual demo response based on scan type and image characteristics."""
    
    responses = DEMO_RESPONSES.get(scan_type, DEMO_RESPONSES["X-Ray"])
    
    # Use image hash to consistently select same response for same image
    index = int(image_hash, 16) % len(responses)
    base = responses[index]
    
    # Customize findings based on clinical context
    findings = base["findings"]
    if clinical_context:
        context_lower = clinical_context.lower()
        
        # Add contextual notes based on keywords
        if any(word in context_lower for word in ["pain", "tenderness", "swelling"]):
            findings += f" Clinical context of '{clinical_context}' noted. No corresponding imaging abnormality identified to explain symptoms."
        elif any(word in context_lower for word in ["fever", "infection"]):
            findings += f" In context of reported {clinical_context}, no imaging findings suggestive of infectious process."
        elif any(word in context_lower for word in ["trauma", "injury", "fall"]):
            findings += f" Despite history of {clinical_context}, no acute traumatic findings identified on current imaging."
        elif clinical_context.strip():
            findings += f" Clinical context: {clinical_context}."
    
    confidence_note = (
        "AI-ASSISTED PRELIMINARY READING: This analysis is generated for demonstration purposes. "
        "All findings must be verified by a board-certified pediatric radiologist before clinical decision-making. "
        "Image quality and patient positioning may affect interpretation accuracy."
    )
    
    return ScanAnalysisResponse(
        body_region=base["body_region"],
        findings=findings,
        impression=base["impression"],
        recommendations=base["recommendations"],
        scan_type=scan_type,
        confidence_note=confidence_note,
        analysis_source="demo"
    )


@router.post("/scan-analysis", response_model=ScanAnalysisResponse)
async def analyze_scan(
    file: UploadFile = File(...),
    scan_type: str = Form(default="X-Ray"),
    clinical_context: str = Form(default=""),
    use_ai: bool = Form(default=True),  # Allow disabling AI for testing
):
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")
    
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    
    if size_mb > MAX_IMAGE_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"Image too large ({size_mb:.1f} MB). Maximum is {MAX_IMAGE_SIZE_MB} MB.")
    
    # Create hash of image for consistent demo response selection
    image_hash = hashlib.md5(contents).hexdigest()[:8]
    
    logger.info(f"Scan analysis: type={scan_type}, size={size_mb:.2f}MB, context='{clinical_context[:50]}', use_ai={use_ai}")

    image_base64 = base64.b64encode(contents).decode("utf-8")

    # ── Stage 1: OCR / IDP text extraction ─────────────────────────────────
    ocr_raw_text: Optional[str] = None
    ocr_structured: Optional[dict] = None
    ocr_source: Optional[str] = None

    # Try Tesseract first (fast, free, no API cost)
    if _TESSERACT_AVAILABLE:
        tesseract_text = _extract_text_tesseract(contents)
        if tesseract_text:
            ocr_raw_text = tesseract_text
            ocr_source = "tesseract"
            logger.info(f"Tesseract OCR extracted {len(tesseract_text)} chars")

    # Use GPT-4o OCR pass when AI enabled (richer structured extraction)
    if use_ai and OPENAI_API_KEY:
        gpt_ocr = await _extract_text_gpt4o_ocr(image_base64, content_type)
        if gpt_ocr and isinstance(gpt_ocr, dict):
            raw = gpt_ocr.get("raw_text", "").strip()
            fields = gpt_ocr.get("fields", {})
            # Only override Tesseract if GPT-4o found meaningful text
            if raw and len(raw) > 3:
                ocr_raw_text = raw
                ocr_source = "gpt4o-ocr"
                # Merge structured fields (keep non-empty values)
                non_empty_fields = {k: v for k, v in fields.items() if v and v != [] and v != ""}
                if non_empty_fields:
                    ocr_structured = non_empty_fields
            logger.info(f"GPT-4o OCR extracted {len(raw)} chars, {len(ocr_structured or {})} structured fields")

    # ── PHI Guardrail: redact before returning to client or passing to LLM ────
    if ocr_raw_text:
        ocr_raw_text = _redact_phi_from_ocr_text(ocr_raw_text, session_id=image_hash)
        logger.info("PHI guardrail applied to OCR text output")
    if ocr_structured:
        ocr_structured = _scrub_phi_from_ocr_fields(ocr_structured)

    # ── Merge OCR clinical indication into clinical context ─────────────────
    # If the image overlay has a clinical indication (e.g. "Thumb injury") and the
    # user didn't already supply one, inject it so the radiologist prompt is aware.
    ocr_indication = (ocr_structured or {}).get("clinical_indication", "") if ocr_structured else ""
    if ocr_indication and "[REDACTED]" not in ocr_indication:
        if clinical_context:
            enriched_context = f"{clinical_context}. Clinical indication from image: {ocr_indication}"
        else:
            enriched_context = f"Clinical indication from image overlay: {ocr_indication}"
    else:
        enriched_context = clinical_context

    ocr_context = _build_ocr_context_string(
        {"raw_text": ocr_raw_text or "", "fields": ocr_structured or {}}
    ) if (ocr_raw_text or ocr_structured) else ""

    # ── Stage 2: Radiological analysis (enriched with OCR context) ──────────
    if use_ai and OPENAI_API_KEY:
        ai_result = await analyze_with_gpt4_vision(
            image_base64=image_base64,
            content_type=content_type,
            scan_type=scan_type,
            clinical_context=enriched_context,
            ocr_context=ocr_context,
        )
        if ai_result:
            # Attach OCR data to response
            ai_result.extracted_text = ocr_raw_text
            ai_result.ocr_fields = ocr_structured
            ai_result.ocr_source = ocr_source
            if ocr_raw_text:
                ai_result.analysis_source = "ai+ocr"
            logger.info(f"GPT-4 Vision analysis successful for {scan_type} (ocr={ocr_source})")
            return ai_result
        else:
            logger.warning("GPT-4 Vision analysis failed or refused, falling back to demo")

    # ── Fallback: demo response (attach OCR if we got it) ───────────────────
    demo = get_demo_response(scan_type, clinical_context, image_hash)
    demo.extracted_text = ocr_raw_text
    demo.ocr_fields = ocr_structured
    demo.ocr_source = ocr_source
    return demo
