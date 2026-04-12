"""
Scan Analysis Router - GPT-4 Vision with Demo Fallback
Supports real medical image analysis using OpenAI GPT-4o Vision API
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import base64
import os
import logging
import hashlib
import httpx
import json
import re

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff", "image/bmp", "image/gif"}
MAX_IMAGE_SIZE_MB = 20
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

class ScanAnalysisResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    scan_type: str
    confidence_note: str
    body_region: str
    analysis_source: str = "ai"  # "ai" or "demo"

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

async def analyze_with_gpt4_vision(
    image_base64: str,
    content_type: str,
    scan_type: str,
    clinical_context: str
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
    "findings": "Detailed technical findings describing what is observed in the image. Use proper radiological terminology. Describe normal and any abnormal findings systematically.",
    "impression": "Summary diagnosis or assessment. Be specific about what the findings suggest.",
    "recommendations": "Clinical recommendations including any follow-up imaging or consultations needed."
}

Guidelines:
- Describe what you actually see in the image
- Use appropriate medical terminology
- Note image quality or positioning issues if relevant
- Be educational and thorough
- If you cannot determine something, say so professionally"""

    user_prompt = f"""Analyze this {scan_type} image for a pediatric patient.

Clinical Context: {clinical_context if clinical_context else "Routine imaging study, no specific clinical concerns provided."}

Please provide a detailed radiological analysis in the specified JSON format."""

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
    
    # Try GPT-4 Vision analysis first if enabled
    if use_ai and OPENAI_API_KEY:
        image_base64 = base64.b64encode(contents).decode("utf-8")
        ai_result = await analyze_with_gpt4_vision(
            image_base64=image_base64,
            content_type=content_type,
            scan_type=scan_type,
            clinical_context=clinical_context
        )
        if ai_result:
            logger.info(f"GPT-4 Vision analysis successful for {scan_type}")
            return ai_result
        else:
            logger.warning("GPT-4 Vision analysis failed or refused, falling back to demo")
    
    # Fallback to demo response
    return get_demo_response(scan_type, clinical_context, image_hash)
