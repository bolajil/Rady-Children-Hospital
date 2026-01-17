"""
Step 4: Treatment Plan Orchestrator
===================================
Coordinates RAG retrieval and LLM generation to create treatment plans.
Supports multiple LLM providers (OpenAI, Google, local models).

Usage:
    python implementation/04_orchestrator.py

Expected Output:
    ✓ Retrieved patient context
    ✓ Retrieved relevant guidelines
    ✓ Generated treatment plan
    [Treatment plan displayed]

Note: Requires API key in .env file for cloud LLMs.
      Can run in mock mode without API keys for testing.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Note: python-dotenv not installed. Using environment variables directly.")

# Import RAG system
try:
    from implementation.three_build_rag import HealthcareRAG
except ImportError:
    # If running directly, try alternative import
    from pathlib import Path
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "rag_module", 
        Path(__file__).parent / "03_build_rag.py"
    )
    rag_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rag_module)
    HealthcareRAG = rag_module.HealthcareRAG


# Prompt Templates
SYSTEM_PROMPT = """You are a clinical decision support assistant helping physicians create personalized treatment plans for patients with Type 2 Diabetes.

IMPORTANT GUIDELINES:
1. Your output is a DRAFT for clinician review, NOT a final medical decision
2. Always cite which guidelines or patient data informed your recommendations
3. Flag any areas of uncertainty or where additional specialist input may be needed
4. Consider the whole patient: comorbidities, medications, lifestyle, and goals
5. Be specific with dosing, monitoring schedules, and follow-up plans

OUTPUT FORMAT:
Structure your response using the following sections:
- Problem List & Risk Assessment
- Medication Recommendations (with rationale)
- Lifestyle Modifications
- Monitoring & Follow-up Plan
- Red Flag Symptoms to Watch For
- Sources Used"""

TREATMENT_PLAN_PROMPT = """Based on the following patient information and clinical guidelines, create a comprehensive treatment plan.

=== PATIENT INFORMATION ===
{patient_context}

=== RELEVANT CLINICAL GUIDELINES ===
{guidelines_context}

=== PATIENT'S STATED GOALS ===
{patient_goals}

=== REQUEST ===
Create a personalized treatment plan that:
1. Addresses the patient's current A1c and other key metrics
2. Optimizes medication therapy based on comorbidities
3. Provides specific lifestyle recommendations
4. Includes a monitoring schedule
5. Lists warning signs that should prompt immediate medical attention

Focus especially on: {focus_areas}"""


class TreatmentPlanOrchestrator:
    """
    Orchestrates the treatment plan generation process.
    
    Flow:
    1. Retrieve patient context from RAG
    2. Retrieve relevant guidelines from RAG
    3. Build prompt with context
    4. Call LLM for generation
    5. Return structured output
    """
    
    def __init__(self, llm_provider: str = "mock"):
        """
        Initialize the orchestrator.
        
        Args:
            llm_provider: One of "openai", "google", "anthropic", or "mock"
        """
        self.llm_provider = llm_provider
        self.rag = HealthcareRAG()
        self.llm_client = self._init_llm_client()
        
        print(f"✓ Initialized orchestrator with {llm_provider} LLM")
    
    def _init_llm_client(self):
        """Initialize the LLM client based on provider."""
        if self.llm_provider == "openai":
            try:
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not found in environment")
                return OpenAI(api_key=api_key)
            except ImportError:
                print("OpenAI package not installed. Falling back to mock mode.")
                self.llm_provider = "mock"
                return None
        elif self.llm_provider == "google":
            try:
                import google.generativeai as genai
                api_key = os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("GOOGLE_API_KEY not found in environment")
                genai.configure(api_key=api_key)
                return genai.GenerativeModel('gemini-pro')
            except ImportError:
                print("Google AI package not installed. Falling back to mock mode.")
                self.llm_provider = "mock"
                return None
        else:
            # Mock mode - no API needed
            return None
    
    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call the LLM with the given prompts."""
        if self.llm_provider == "openai" and self.llm_client:
            response = self.llm_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            return response.choices[0].message.content
        
        elif self.llm_provider == "google" and self.llm_client:
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = self.llm_client.generate_content(full_prompt)
            return response.text
        
        else:
            # Mock response for testing without API
            return self._generate_mock_response(user_prompt)
    
    def _generate_mock_response(self, prompt: str) -> str:
        """Generate a mock treatment plan for testing."""
        return """## Treatment Plan (MOCK - For Testing Only)

### Problem List & Risk Assessment
1. **Type 2 Diabetes** - A1c above target, indicating suboptimal glycemic control
2. **Hypertension** - Blood pressure above goal of <130/80
3. **Hyperlipidemia** - LDL likely above target based on cardiovascular risk

**Risk Factors Identified:**
- Elevated A1c increases microvascular complication risk
- Combined hypertension and diabetes significantly elevates cardiovascular risk
- Lifestyle factors (low activity, suboptimal diet) contributing to poor control

### Medication Recommendations

| Medication | Recommendation | Rationale |
|------------|---------------|-----------|
| Metformin | Continue current dose if tolerating | First-line therapy, renal function adequate |
| SGLT2 Inhibitor | Consider adding empagliflozin 10mg daily | CV and renal protection, weight loss benefit |
| ACE Inhibitor | Add or optimize lisinopril | BP control + renal protection in diabetes |
| Statin | Ensure on moderate-high intensity statin | CV risk reduction per guidelines |

### Lifestyle Modifications

**Nutrition:**
- Refer to registered dietitian for medical nutrition therapy
- Target: Reduce refined carbohydrates, increase fiber to 25-30g/day
- Consider Mediterranean or DASH diet pattern
- Limit sodium to <2300mg daily for blood pressure

**Physical Activity:**
- Start with 10-15 minute walks after meals (immediate glucose benefit)
- Progress to 150 min/week moderate activity over 4-6 weeks
- Add resistance training 2x/week when baseline established

**Other:**
- Address sleep if inadequate (target 7-8 hours)
- Screen for sleep apnea given BMI
- Smoking cessation if applicable

### Monitoring & Follow-up

| Test | Frequency | Target |
|------|-----------|--------|
| A1c | 3 months | <7.0% |
| Blood Pressure | Each visit | <130/80 |
| eGFR + UACR | 6 months | Stable/improving |
| Lipid Panel | 6 months | LDL <100 (or <70 if ASCVD) |
| Foot Exam | Each visit | No lesions |
| Eye Exam | Annual | No retinopathy |

**Next Appointment:** 3 months for A1c recheck and medication adjustment

### Red Flag Symptoms

Seek immediate medical attention for:
- Symptoms of hypoglycemia (shakiness, sweating, confusion) - especially if on new medications
- Signs of DKA: nausea, vomiting, abdominal pain, fruity breath (rare with SGLT2i)
- Chest pain or shortness of breath
- Sudden vision changes
- Foot wounds that don't heal

### Sources Used
- Patient demographics and lab values from EHR
- ADA Standards of Care 2024: Glycemic Targets, Pharmacologic Approaches
- Lifestyle Guidelines: Nutrition and Physical Activity sections
- Medication Reference: SGLT2 Inhibitor prescribing considerations

---
*This is a DRAFT treatment plan for clinician review. Recommendations should be validated against current patient status and clinical judgment.*
"""
    
    def generate_treatment_plan(
        self, 
        patient_id: str,
        focus_areas: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a treatment plan for a patient.
        
        Args:
            patient_id: The patient ID to generate plan for
            focus_areas: Optional list of areas to focus on
            
        Returns:
            Dictionary with treatment plan and metadata
        """
        start_time = datetime.now()
        
        # Default focus areas
        if focus_areas is None:
            focus_areas = ["glycemic control", "cardiovascular risk reduction", "lifestyle optimization"]
        
        # Step 1: Get patient context
        print(f"\n[1/4] Retrieving patient context for {patient_id}...")
        patient_context = self.rag.get_full_patient_context(patient_id)
        
        if "No data found" in patient_context:
            return {
                "success": False,
                "error": f"Patient {patient_id} not found in database",
                "patient_id": patient_id
            }
        print(f"  ✓ Retrieved patient context ({len(patient_context)} chars)")
        
        # Step 2: Get patient goals from context
        goals_results = self.rag.retrieve_patient_context(
            patient_id=patient_id,
            query="patient treatment goals",
            n_results=1
        )
        patient_goals = goals_results[0]["content"] if goals_results else "No specific goals documented"
        
        # Step 3: Get relevant guidelines
        print("[2/4] Retrieving relevant guidelines...")
        guideline_queries = [
            "diabetes A1c targets and glycemic control",
            "medication selection for type 2 diabetes",
            "lifestyle and nutrition recommendations diabetes"
        ]
        
        all_guidelines = []
        for query in guideline_queries:
            results = self.rag.retrieve_guidelines(query, n_results=2)
            all_guidelines.extend(results)
        
        # Deduplicate and format guidelines
        seen_ids = set()
        unique_guidelines = []
        for g in all_guidelines:
            gid = g["metadata"].get("section_id", str(g["content"][:50]))
            if gid not in seen_ids:
                seen_ids.add(gid)
                unique_guidelines.append(g)
        
        guidelines_context = "\n\n".join([
            f"[{g['metadata'].get('title', 'Guideline')}]\n{g['content']}"
            for g in unique_guidelines[:5]
        ])
        print(f"  ✓ Retrieved {len(unique_guidelines)} guideline sections")
        
        # Step 4: Build and send prompt
        print("[3/4] Generating treatment plan...")
        user_prompt = TREATMENT_PLAN_PROMPT.format(
            patient_context=patient_context,
            guidelines_context=guidelines_context,
            patient_goals=patient_goals,
            focus_areas=", ".join(focus_areas)
        )
        
        treatment_plan = self._call_llm(SYSTEM_PROMPT, user_prompt)
        print("  ✓ Treatment plan generated")
        
        # Step 5: Package response
        print("[4/4] Packaging response...")
        end_time = datetime.now()
        
        result = {
            "success": True,
            "patient_id": patient_id,
            "treatment_plan": treatment_plan,
            "metadata": {
                "generated_at": end_time.isoformat(),
                "generation_time_seconds": (end_time - start_time).total_seconds(),
                "llm_provider": self.llm_provider,
                "focus_areas": focus_areas,
                "guidelines_used": [g["metadata"].get("title", "Unknown") for g in unique_guidelines[:5]],
                "patient_cards_used": len(patient_context.split("["))
            }
        }
        
        return result


def run_demo():
    """Run a demonstration of the orchestrator."""
    print("\n--- Treatment Plan Demo ---\n")
    
    # Initialize orchestrator (use mock mode for testing without API)
    orchestrator = TreatmentPlanOrchestrator(llm_provider="mock")
    
    # Generate treatment plan
    result = orchestrator.generate_treatment_plan(
        patient_id="SYN-1000",
        focus_areas=["glycemic control", "medication optimization", "weight management"]
    )
    
    if result["success"]:
        print("\n" + "=" * 60)
        print("GENERATED TREATMENT PLAN")
        print("=" * 60)
        print(result["treatment_plan"])
        print("\n" + "=" * 60)
        print("METADATA")
        print("=" * 60)
        print(json.dumps(result["metadata"], indent=2))
    else:
        print(f"Error: {result['error']}")
    
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 4: Treatment Plan Orchestrator")
    print("=" * 60)
    
    # Check for required data
    if not Path("data/embeddings").exists():
        print("\n⚠ Embeddings not found. Running step 3 first...")
        # You would run step 3 here
    
    # Run demo
    result = run_demo()
    
    # Save sample output
    output_dir = Path("data/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"treatment_plan_{result['patient_id']}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    print(f"\n✓ Saved output to {output_file}")
    
    print("\n✓ Step 4 Complete!")
