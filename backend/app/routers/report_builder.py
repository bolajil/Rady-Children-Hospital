"""
Report Builder Router
=====================
Generate structured clinical documentation (SOAP notes, discharge summaries,
referral letters, progress notes) from physician-provided clinical inputs.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

REPORT_TEMPLATES = {
    "soap": "SOAP Note",
    "discharge": "Discharge Summary",
    "referral": "Referral Letter",
    "progress": "Progress Note",
    "consult": "Consultation Note",
    "procedure": "Procedure Note",
}


class ReportRequest(BaseModel):
    report_type: str = "soap"
    patient_name: str = ""
    patient_age: str = ""
    patient_mrn: str = ""
    patient_dob: str = ""
    chief_complaint: str = ""
    history_of_present_illness: str = ""
    past_medical_history: str = ""
    allergies: str = ""
    current_medications: str = ""
    vital_signs: str = ""
    physical_exam: str = ""
    lab_results: str = ""
    imaging_findings: str = ""
    assessment: str = ""
    plan: str = ""
    doctor_name: str = ""
    department: str = ""
    additional_notes: str = ""


class ReportResponse(BaseModel):
    report: str
    report_type: str
    template_name: str


@router.post("/generate-report", response_model=ReportResponse)
async def generate_report(req: ReportRequest):
    """Generate a structured clinical note from input fields."""
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage
    except ImportError:
        raise HTTPException(status_code=503, detail="langchain_openai not installed")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    template_name = REPORT_TEMPLATES.get(req.report_type, "Clinical Note")

    # Build context block from non-empty fields
    fields = {
        "Patient Name": req.patient_name,
        "Date of Birth": req.patient_dob,
        "Age": req.patient_age,
        "MRN": req.patient_mrn,
        "Attending Physician": req.doctor_name,
        "Department": req.department,
        "Chief Complaint": req.chief_complaint,
        "History of Present Illness": req.history_of_present_illness,
        "Past Medical History": req.past_medical_history,
        "Allergies": req.allergies,
        "Current Medications": req.current_medications,
        "Vital Signs": req.vital_signs,
        "Physical Examination": req.physical_exam,
        "Laboratory Results": req.lab_results,
        "Imaging / Radiology Findings": req.imaging_findings,
        "Assessment": req.assessment,
        "Plan": req.plan,
        "Additional Notes": req.additional_notes,
    }
    context_lines = [f"{k}: {v}" for k, v in fields.items() if v.strip()]
    context = "\n".join(context_lines) if context_lines else "No clinical information provided."

    system = (
        "You are a medical documentation specialist at Rady Children's Hospital. "
        "Generate professional, concise, and complete clinical documentation using standard medical terminology. "
        "Use [PENDING] placeholders for any missing required information. "
        "Format with clear section headers using ALL CAPS followed by a colon. "
        "Use pediatric-appropriate clinical language throughout."
    )

    type_instructions = {
        "soap": (
            "Generate a complete SOAP note with sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN. "
            "Under OBJECTIVE include vitals, physical exam, and relevant labs/imaging. "
            "Under PLAN number each action item."
        ),
        "discharge": (
            "Generate a Discharge Summary with: ADMISSION DIAGNOSIS, HOSPITAL COURSE, DISCHARGE DIAGNOSIS, "
            "DISCHARGE MEDICATIONS, FOLLOW-UP INSTRUCTIONS, DISCHARGE CONDITION."
        ),
        "referral": (
            "Generate a professional Referral Letter with: PATIENT INFORMATION, REASON FOR REFERRAL, "
            "RELEVANT HISTORY, CURRENT MEDICATIONS, CLINICAL FINDINGS, SPECIFIC REQUEST."
        ),
        "progress": (
            "Generate a Progress Note with: INTERVAL HISTORY, CURRENT STATUS, PHYSICAL EXAMINATION, "
            "ASSESSMENT, UPDATED PLAN."
        ),
        "consult": (
            "Generate a Consultation Note with: REASON FOR CONSULTATION, HISTORY, EXAMINATION, "
            "INVESTIGATIONS REVIEWED, IMPRESSION, RECOMMENDATIONS."
        ),
        "procedure": (
            "Generate a Procedure Note with: PROCEDURE NAME, INDICATION, CONSENT, TECHNIQUE, "
            "FINDINGS, COMPLICATIONS, POST-PROCEDURE PLAN."
        ),
    }

    instructions = type_instructions.get(req.report_type, "Generate a complete clinical note.")

    prompt = f"""Generate a {template_name} for the following patient encounter.

{instructions}

CLINICAL INFORMATION:
{context}

Produce a complete, professional medical document ready for chart entry.
Include today's date as [DATE] and sign with the physician's name or [PHYSICIAN NAME] if not provided."""

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=api_key,
        temperature=0.1,
        timeout=45,
        max_tokens=2000,
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=prompt),
        ])
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=502, detail=f"Report generation failed: {str(e)}")

    return ReportResponse(
        report=response.content,
        report_type=req.report_type,
        template_name=template_name,
    )
