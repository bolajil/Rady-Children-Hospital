"""
Scan Analysis Router - Enhanced Demo Version
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import base64
import os
import logging
import hashlib

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff", "image/bmp", "image/gif"}
MAX_IMAGE_SIZE_MB = 20

class ScanAnalysisResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    scan_type: str
    confidence_note: str
    body_region: str

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
    )


@router.post("/scan-analysis", response_model=ScanAnalysisResponse)
async def analyze_scan(
    file: UploadFile = File(...),
    scan_type: str = Form(default="X-Ray"),
    clinical_context: str = Form(default=""),
):
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")
    
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    
    if size_mb > MAX_IMAGE_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"Image too large ({size_mb:.1f} MB). Maximum is {MAX_IMAGE_SIZE_MB} MB.")
    
    # Create hash of image for consistent response selection
    image_hash = hashlib.md5(contents).hexdigest()[:8]
    
    logger.info(f"Scan analysis: type={scan_type}, size={size_mb:.2f}MB, context='{clinical_context[:50]}'")
    
    return get_demo_response(scan_type, clinical_context, image_hash)
