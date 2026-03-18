"""
Scan Analysis Router
====================
AI-assisted preliminary reading of medical images (X-ray, CT, MRI, ultrasound)
using OpenAI GPT-4o Vision API. All readings must be reviewed by a qualified
radiologist before clinical use.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import base64
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/tiff", "image/bmp", "image/gif",
}

MAX_IMAGE_SIZE_MB = 20


class ScanAnalysisResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    scan_type: str
    confidence_note: str
    body_region: str


def _extract_section(text: str, section: str) -> str:
    """Extract a named section from structured LLM output."""
    lines = text.split("\n")
    in_section = False
    result = []
    section_headers = {"FINDINGS", "IMPRESSION", "RECOMMENDATIONS", "CONFIDENCE NOTE", "BODY REGION"}

    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith(section.upper() + ":"):
            in_section = True
            rest = stripped.split(":", 1)[1].strip()
            if rest:
                result.append(rest)
            continue
        if in_section:
            if any(stripped.upper().startswith(h + ":") for h in section_headers):
                break
            if stripped:
                result.append(stripped)

    return " ".join(result).strip() if result else "Not specified"


@router.post("/scan-analysis", response_model=ScanAnalysisResponse)
async def analyze_scan(
    file: UploadFile = File(...),
    scan_type: str = Form(default="Unknown"),
    clinical_context: str = Form(default=""),
):
    """
    Accept a medical image and return a structured AI-assisted preliminary reading.
    Requires OpenAI API key with GPT-4o access.
    """
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage
    except ImportError:
        raise HTTPException(status_code=503, detail="langchain_openai not installed")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    # Validate file type
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Upload a JPEG, PNG, or WebP image."
        )

    # Read and size-check
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_IMAGE_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"Image too large ({size_mb:.1f} MB). Maximum is {MAX_IMAGE_SIZE_MB} MB.")

    base64_image = base64.b64encode(contents).decode("utf-8")

    context_block = f"\nClinical context provided: {clinical_context}" if clinical_context.strip() else ""

    prompt = f"""You are a radiologist AI assistant at Rady Children's Hospital performing a preliminary scan review.
Scan type: {scan_type}{context_block}

Analyze this medical image carefully and respond in EXACTLY the following format (each section on its own line):

BODY REGION: [anatomical region shown — e.g., Chest, Abdomen, Brain, Extremity]

FINDINGS: [Detailed description of all visible structures, any abnormalities, densities, effusions, fractures, opacities, masses, or notable anatomy. Be specific and systematic.]

IMPRESSION: [Concise radiological impression — primary diagnosis or top differential diagnoses ranked by likelihood. If normal, state clearly.]

RECOMMENDATIONS: [Suggested next steps — additional imaging, clinical correlation, follow-up timeframe, or specialist referral if indicated.]

CONFIDENCE NOTE: [Note on image quality, any limitations of this AI analysis, and confirmation that a board-certified radiologist must review before clinical decisions are made.]

Pediatric context: all patients are children. Apply age-appropriate normal ranges in your assessment."""

    llm = ChatOpenAI(
        model="gpt-4o",
        api_key=api_key,
        temperature=0,
        timeout=60,
        max_tokens=1200,
    )

    message = HumanMessage(content=[
        {"type": "text", "text": prompt},
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:{content_type};base64,{base64_image}",
                "detail": "high",
            },
        },
    ])

    try:
        response = await llm.ainvoke([message])
    except Exception as e:
        logger.error(f"Scan analysis LLM error: {e}")
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {str(e)}")

    text = response.content

    return ScanAnalysisResponse(
        body_region=_extract_section(text, "BODY REGION"),
        findings=_extract_section(text, "FINDINGS"),
        impression=_extract_section(text, "IMPRESSION"),
        recommendations=_extract_section(text, "RECOMMENDATIONS"),
        scan_type=scan_type,
        confidence_note=_extract_section(text, "CONFIDENCE NOTE"),
    )
