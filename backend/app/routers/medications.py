"""
Medication Guide Router
=======================
Pediatric medication search, drug interaction checking, and weight-based
dosing calculations. Powered by GPT-4o-mini with pediatric clinical references.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class MedicationSearchRequest(BaseModel):
    medication_name: str
    patient_age_years: Optional[float] = None
    patient_weight_kg: Optional[float] = None
    indication: Optional[str] = None


class MedicationInfo(BaseModel):
    name: str
    drug_class: str
    indications: str
    pediatric_dosing: str
    side_effects: str
    contraindications: str
    monitoring: str
    notes: str


class InteractionRequest(BaseModel):
    medications: List[str]
    patient_age_years: Optional[float] = None
    patient_weight_kg: Optional[float] = None


class InteractionItem(BaseModel):
    drug_pair: str
    severity: str  # none | mild | moderate | severe
    mechanism: str
    clinical_effect: str
    management: str


class InteractionResponse(BaseModel):
    overall_severity: str
    interactions: List[InteractionItem]
    summary: str
    recommendations: str


class DosingRequest(BaseModel):
    medication_name: str
    indication: str
    patient_age_years: float
    patient_weight_kg: float
    renal_impairment: bool = False
    hepatic_impairment: bool = False


class DosingResponse(BaseModel):
    medication_name: str
    indication: str
    dose_per_kg: str
    calculated_dose: str
    frequency: str
    route: str
    max_dose: str
    duration: str
    special_instructions: str
    cautions: str


def _get_llm():
    try:
        from langchain_openai import ChatOpenAI
    except ImportError:
        raise HTTPException(status_code=503, detail="langchain_openai not installed")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    return ChatOpenAI(model="gpt-4o-mini", api_key=api_key, temperature=0, timeout=30, max_tokens=1200)


def _extract(text: str, key: str, stop_keys: list = None) -> str:
    stop_keys = stop_keys or []
    lines = text.split("\n")
    in_section = False
    parts = []
    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith(key.upper() + ":"):
            in_section = True
            rest = stripped.split(":", 1)[1].strip()
            if rest:
                parts.append(rest)
            continue
        if in_section:
            if any(stripped.upper().startswith(sk.upper() + ":") for sk in stop_keys):
                break
            if stripped:
                parts.append(stripped)
    return " ".join(parts).strip() or "Not specified"


KEYS_MED = ["DRUG_CLASS", "INDICATIONS", "PEDIATRIC_DOSING", "SIDE_EFFECTS", "CONTRAINDICATIONS", "MONITORING", "NOTES"]


@router.post("/medications/search", response_model=MedicationInfo)
async def search_medication(req: MedicationSearchRequest):
    """Look up medication info with pediatric-specific dosing."""
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = _get_llm()

    patient_ctx = ""
    if req.patient_age_years is not None:
        patient_ctx += f" for a {req.patient_age_years:.1f}-year-old patient"
    if req.patient_weight_kg is not None:
        patient_ctx += f" weighing {req.patient_weight_kg:.1f} kg"
    if req.indication:
        patient_ctx += f" being treated for {req.indication}"

    system = (
        "You are a board-certified pediatric clinical pharmacist at Rady Children's Hospital. "
        "Provide accurate, evidence-based medication information based on Lexicomp Pediatric, "
        "Nelson's Pediatric Antimicrobial Therapy, and Harriet Lane Handbook. "
        "Always specify mg/kg dosing with maximum doses. Flag high-alert medications."
    )

    prompt = f"""Provide comprehensive pediatric information for: {req.medication_name}{patient_ctx}

Respond in EXACTLY this format:

DRUG_CLASS: [pharmacological class and mechanism]
INDICATIONS: [approved and common off-label pediatric indications]
PEDIATRIC_DOSING: [specific mg/kg dosing, frequency, route; weight-adjusted if patient weight provided; include maximum single dose and maximum daily dose; note neonatal/infant differences if relevant]
SIDE_EFFECTS: [common ≥10%, serious requiring monitoring, black box warnings]
CONTRAINDICATIONS: [absolute and relative contraindications; pediatric age restrictions]
MONITORING: [therapeutic drug monitoring, labs, clinical parameters to follow]
NOTES: [formulation availability, palatability, storage, compounding notes, cost considerations]

If this is a high-alert medication, begin NOTES with ⚠️ HIGH-ALERT MEDICATION.
Always remind that dosing must be verified with current clinical references before prescribing."""

    try:
        response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=prompt)])
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    t = response.content
    return MedicationInfo(
        name=req.medication_name,
        drug_class=_extract(t, "DRUG_CLASS", KEYS_MED),
        indications=_extract(t, "INDICATIONS", KEYS_MED),
        pediatric_dosing=_extract(t, "PEDIATRIC_DOSING", KEYS_MED),
        side_effects=_extract(t, "SIDE_EFFECTS", KEYS_MED),
        contraindications=_extract(t, "CONTRAINDICATIONS", KEYS_MED),
        monitoring=_extract(t, "MONITORING", KEYS_MED),
        notes=_extract(t, "NOTES", KEYS_MED),
    )


SEVERITY_ORDER = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}


@router.post("/medications/interactions", response_model=InteractionResponse)
async def check_interactions(req: InteractionRequest):
    """Check for clinically significant drug interactions between a list of medications."""
    from langchain_core.messages import HumanMessage, SystemMessage

    if len(req.medications) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 medications to check interactions.")

    llm = _get_llm()

    meds_str = ", ".join(req.medications)
    age_ctx = f" in a {req.patient_age_years:.1f}-year-old patient" if req.patient_age_years else ""

    prompt = f"""Check ALL pairwise drug interactions between: {meds_str}{age_ctx}

For each pair that has ANY interaction, provide:
INTERACTION: [Drug A] + [Drug B]
SEVERITY: [none | mild | moderate | severe]
MECHANISM: [pharmacokinetic or pharmacodynamic mechanism]
CLINICAL_EFFECT: [what happens clinically]
MANAGEMENT: [how to manage — avoid, monitor, dose adjust, timing separation, etc.]
---

After all pairs, provide:
SUMMARY: [Overall interaction profile for this regimen]
RECOMMENDATIONS: [Consolidated clinical recommendations for the prescriber]

If no clinically significant interactions exist between a pair, skip that pair entirely.
If no interactions at all, state: NO_INTERACTIONS: No clinically significant interactions identified."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a clinical pharmacist specializing in pediatric drug safety. Be precise and clinically actionable."),
            HumanMessage(content=prompt),
        ])
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    text = response.content
    interactions: List[InteractionItem] = []
    overall = "none"

    # Parse interaction blocks
    blocks = text.split("---")
    for block in blocks:
        lines = block.strip().split("\n")
        item: dict = {}
        for line in lines:
            stripped = line.strip()
            for key in ["INTERACTION", "SEVERITY", "MECHANISM", "CLINICAL_EFFECT", "MANAGEMENT"]:
                if stripped.upper().startswith(key + ":"):
                    item[key.lower()] = stripped.split(":", 1)[1].strip()
        if "interaction" in item and "severity" in item:
            sev = item.get("severity", "none").lower()
            if SEVERITY_ORDER.get(sev, 0) > SEVERITY_ORDER.get(overall, 0):
                overall = sev
            interactions.append(InteractionItem(
                drug_pair=item.get("interaction", "Unknown pair"),
                severity=sev,
                mechanism=item.get("mechanism", "Unknown"),
                clinical_effect=item.get("clinical_effect", "Unknown"),
                management=item.get("management", "Monitor clinically"),
            ))

    summary = _extract(text, "SUMMARY", ["RECOMMENDATIONS"])
    recommendations = _extract(text, "RECOMMENDATIONS", [])

    if not interactions:
        interactions = []
        summary = "No clinically significant drug interactions identified between the specified medications."
        recommendations = "No specific interaction management required. Continue standard monitoring."
        overall = "none"

    return InteractionResponse(
        overall_severity=overall,
        interactions=interactions,
        summary=summary,
        recommendations=recommendations,
    )


@router.post("/medications/dosing", response_model=DosingResponse)
async def calculate_dosing(req: DosingRequest):
    """Calculate weight-based pediatric dosing for a specific medication and indication."""
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = _get_llm()

    impairment = []
    if req.renal_impairment:
        impairment.append("renal impairment")
    if req.hepatic_impairment:
        impairment.append("hepatic impairment")
    impairment_ctx = f" with {' and '.join(impairment)}" if impairment else ""

    prompt = f"""Calculate the pediatric dose for:
Medication: {req.medication_name}
Indication: {req.indication}
Patient: {req.patient_age_years:.1f} years old, {req.patient_weight_kg:.1f} kg{impairment_ctx}

Respond in EXACTLY this format:

DOSE_PER_KG: [e.g., 10 mg/kg]
CALCULATED_DOSE: [e.g., {req.patient_weight_kg * 10:.0f} mg — show calculation]
FREQUENCY: [e.g., every 8 hours]
ROUTE: [e.g., oral, IV, IM]
MAX_DOSE: [single dose max and daily max]
DURATION: [typical treatment duration for this indication]
SPECIAL_INSTRUCTIONS: [with food, infusion rate, dilution, etc.]
CAUTIONS: [dose adjustments needed, monitoring, any concerns for this patient]

Base on Harriet Lane Handbook and current Rady Children's protocols.
If renal/hepatic impairment requires dose adjustment, specify the adjustment."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a pediatric clinical pharmacist. Provide precise weight-based dosing calculations."),
            HumanMessage(content=prompt),
        ])
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    t = response.content
    KEYS = ["DOSE_PER_KG", "CALCULATED_DOSE", "FREQUENCY", "ROUTE", "MAX_DOSE", "DURATION", "SPECIAL_INSTRUCTIONS", "CAUTIONS"]

    return DosingResponse(
        medication_name=req.medication_name,
        indication=req.indication,
        dose_per_kg=_extract(t, "DOSE_PER_KG", KEYS),
        calculated_dose=_extract(t, "CALCULATED_DOSE", KEYS),
        frequency=_extract(t, "FREQUENCY", KEYS),
        route=_extract(t, "ROUTE", KEYS),
        max_dose=_extract(t, "MAX_DOSE", KEYS),
        duration=_extract(t, "DURATION", KEYS),
        special_instructions=_extract(t, "SPECIAL_INSTRUCTIONS", KEYS),
        cautions=_extract(t, "CAUTIONS", KEYS),
    )
