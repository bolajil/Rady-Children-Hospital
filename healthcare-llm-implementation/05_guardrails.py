"""
Step 5: Clinical Safety Guardrails
==================================
Implements rule-based and LLM-based safety checks for treatment plans.

Usage:
    python implementation/05_guardrails.py

Expected Output:
    ✓ Loaded safety rules
    Running safety checks on sample treatment plan...
    ✓ Passed: 8 rules
    ⚠ Warnings: 2 items
    ✗ Critical: 0 items

This module provides:
1. Rule-based checks (drug interactions, contraindications, dosing)
2. LLM-as-critic pattern for guideline compliance
3. Structured safety report generation
"""

import json
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
from pathlib import Path


class SeverityLevel(Enum):
    """Severity levels for safety issues."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class SafetyIssue:
    """Represents a safety issue found during validation."""
    rule_id: str
    severity: SeverityLevel
    message: str
    recommendation: str
    source: str  # "rule" or "llm_critic"


# ============================================================================
# RULE-BASED SAFETY CHECKS
# ============================================================================

SAFETY_RULES = {
    # Renal function checks
    "metformin_egfr": {
        "description": "Metformin contraindicated if eGFR < 30",
        "severity": SeverityLevel.CRITICAL,
        "check": lambda patient, plan: not (
            "metformin" in plan.lower() and 
            patient.get("labs", {}).get("eGFR", 100) < 30
        ),
        "failure_message": "Metformin mentioned but eGFR < 30 mL/min (contraindicated)",
        "recommendation": "Discontinue metformin. Consider DPP-4 inhibitor or GLP-1 RA as alternatives."
    },
    
    "metformin_egfr_caution": {
        "description": "Metformin dose reduction if eGFR 30-45",
        "severity": SeverityLevel.WARNING,
        "check": lambda patient, plan: not (
            "metformin" in plan.lower() and 
            30 <= patient.get("labs", {}).get("eGFR", 100) < 45 and
            "reduce" not in plan.lower() and "lower dose" not in plan.lower()
        ),
        "failure_message": "Metformin at full dose but eGFR 30-45 (requires dose reduction)",
        "recommendation": "Reduce metformin dose to maximum 1000mg daily. Monitor renal function closely."
    },
    
    # Allergy checks
    "sulfa_sulfonylurea": {
        "description": "Caution with sulfonylureas if sulfa allergy (cross-reactivity rare but possible)",
        "severity": SeverityLevel.WARNING,
        "check": lambda patient, plan: not (
            any(med in plan.lower() for med in ["glipizide", "glyburide", "glimepiride", "sulfonylurea"]) and
            "sulfa" in str(patient.get("allergies", [])).lower()
        ),
        "failure_message": "Sulfonylurea mentioned but patient has sulfa allergy",
        "recommendation": "Consider alternative agent. If sulfonylurea essential, monitor closely for allergic reaction."
    },
    
    # Heart failure checks
    "pioglitazone_hf": {
        "description": "Pioglitazone contraindicated in heart failure",
        "severity": SeverityLevel.CRITICAL,
        "check": lambda patient, plan: not (
            "pioglitazone" in plan.lower() and
            any("heart failure" in cond.lower() or "chf" in cond.lower() 
                for cond in patient.get("conditions", []))
        ),
        "failure_message": "Pioglitazone mentioned but patient has heart failure (contraindicated)",
        "recommendation": "Avoid thiazolidinediones. Consider SGLT2 inhibitor which has HF benefit."
    },
    
    # Hypoglycemia risk
    "hypoglycemia_elderly": {
        "description": "Avoid aggressive glycemic targets in elderly",
        "severity": SeverityLevel.WARNING,
        "check": lambda patient, plan: not (
            patient.get("demographics", {}).get("age", 0) >= 75 and
            ("a1c < 6.5" in plan.lower() or "a1c <6.5" in plan.lower() or 
             "target a1c 6" in plan.lower())
        ),
        "failure_message": "Aggressive A1c target (<6.5%) in elderly patient (≥75 years)",
        "recommendation": "Consider less stringent A1c target (< 8%) to reduce hypoglycemia risk."
    },
    
    "multiple_hypoglycemic_agents": {
        "description": "Warning for multiple hypoglycemia-causing agents",
        "severity": SeverityLevel.WARNING,
        "check": lambda patient, plan: not (
            sum(1 for med in ["insulin", "sulfonylurea", "glipizide", "glyburide", "glimepiride", "meglitinide"] 
                if med in plan.lower()) >= 2
        ),
        "failure_message": "Multiple agents with hypoglycemia risk recommended",
        "recommendation": "Ensure hypoglycemia education provided. Consider CGM or frequent SMBG."
    },
    
    # Standard of care checks
    "statin_missing": {
        "description": "Statin should be recommended for diabetic patients 40-75",
        "severity": SeverityLevel.WARNING,
        "check": lambda patient, plan: (
            patient.get("demographics", {}).get("age", 0) < 40 or
            patient.get("demographics", {}).get("age", 0) > 75 or
            any(word in plan.lower() for word in ["statin", "atorvastatin", "rosuvastatin", "simvastatin"])
        ),
        "failure_message": "No statin mentioned for diabetic patient aged 40-75",
        "recommendation": "Per guidelines, all diabetic patients 40-75 should be on at least moderate-intensity statin."
    },
    
    "bp_target_check": {
        "description": "Blood pressure target should be mentioned if hypertension present",
        "severity": SeverityLevel.INFO,
        "check": lambda patient, plan: (
            "hypertension" not in str(patient.get("conditions", [])).lower() or
            any(term in plan.lower() for term in ["blood pressure", "bp target", "130/80", "140/90"])
        ),
        "failure_message": "Hypertension present but no BP target mentioned",
        "recommendation": "Include BP target (typically <130/80 for diabetics) in treatment plan."
    },
    
    # Lifestyle inclusion checks
    "lifestyle_mentioned": {
        "description": "Lifestyle modifications should be included",
        "severity": SeverityLevel.INFO,
        "check": lambda patient, plan: any(
            term in plan.lower() for term in 
            ["lifestyle", "diet", "exercise", "physical activity", "nutrition", "weight"]
        ),
        "failure_message": "No lifestyle modification recommendations included",
        "recommendation": "Lifestyle modification is foundational therapy. Include diet and exercise recommendations."
    },
    
    # Monitoring checks
    "monitoring_plan": {
        "description": "Follow-up and monitoring should be specified",
        "severity": SeverityLevel.INFO,
        "check": lambda patient, plan: any(
            term in plan.lower() for term in 
            ["follow-up", "monitoring", "recheck", "3 month", "6 month", "annual"]
        ),
        "failure_message": "No monitoring or follow-up plan specified",
        "recommendation": "Include specific monitoring schedule (A1c every 3-6 months, annual eye/foot exams)."
    }
}


class SafetyGuardrails:
    """
    Implements safety checks for treatment plans.
    
    Two-layer approach:
    1. Rule-based checks: Fast, deterministic, catches known issues
    2. LLM-as-critic: Deeper analysis for guideline compliance (optional)
    """
    
    def __init__(self):
        """Initialize the guardrails system."""
        self.rules = SAFETY_RULES
        print(f"✓ Loaded {len(self.rules)} safety rules")
    
    def run_rule_checks(
        self, 
        patient: Dict, 
        treatment_plan: str
    ) -> List[SafetyIssue]:
        """
        Run all rule-based safety checks.
        
        Args:
            patient: Patient data dictionary
            treatment_plan: Generated treatment plan text
            
        Returns:
            List of SafetyIssue objects for any failures
        """
        issues = []
        
        for rule_id, rule in self.rules.items():
            try:
                passed = rule["check"](patient, treatment_plan)
                if not passed:
                    issues.append(SafetyIssue(
                        rule_id=rule_id,
                        severity=rule["severity"],
                        message=rule["failure_message"],
                        recommendation=rule["recommendation"],
                        source="rule"
                    ))
            except Exception as e:
                # Log error but don't fail entire check
                print(f"  Warning: Rule '{rule_id}' raised exception: {e}")
        
        return issues
    
    def generate_safety_report(
        self, 
        patient: Dict, 
        treatment_plan: str,
        include_passing: bool = False
    ) -> Dict:
        """
        Generate a comprehensive safety report.
        
        Args:
            patient: Patient data dictionary
            treatment_plan: Generated treatment plan text
            include_passing: Whether to include passing checks in report
            
        Returns:
            Dictionary with safety report
        """
        issues = self.run_rule_checks(patient, treatment_plan)
        
        # Categorize by severity
        critical = [i for i in issues if i.severity == SeverityLevel.CRITICAL]
        warnings = [i for i in issues if i.severity == SeverityLevel.WARNING]
        info = [i for i in issues if i.severity == SeverityLevel.INFO]
        
        # Calculate passing rules
        failing_rule_ids = {i.rule_id for i in issues}
        passing_rules = [rid for rid in self.rules.keys() if rid not in failing_rule_ids]
        
        # Determine overall status
        if critical:
            overall_status = "BLOCKED"
            status_message = "Critical safety issues found. Plan should not proceed without review."
        elif warnings:
            overall_status = "REVIEW_REQUIRED"
            status_message = "Warnings found. Clinician review required before proceeding."
        else:
            overall_status = "PASSED"
            status_message = "All critical checks passed. Standard review recommended."
        
        report = {
            "overall_status": overall_status,
            "status_message": status_message,
            "summary": {
                "total_rules": len(self.rules),
                "passed": len(passing_rules),
                "critical_issues": len(critical),
                "warnings": len(warnings),
                "info": len(info)
            },
            "critical_issues": [
                {
                    "rule_id": i.rule_id,
                    "message": i.message,
                    "recommendation": i.recommendation
                }
                for i in critical
            ],
            "warnings": [
                {
                    "rule_id": i.rule_id,
                    "message": i.message,
                    "recommendation": i.recommendation
                }
                for i in warnings
            ],
            "info": [
                {
                    "rule_id": i.rule_id,
                    "message": i.message,
                    "recommendation": i.recommendation
                }
                for i in info
            ]
        }
        
        if include_passing:
            report["passing_rules"] = passing_rules
        
        return report
    
    def get_critic_prompt(self, patient: Dict, treatment_plan: str) -> str:
        """
        Generate a prompt for LLM-as-critic review.
        
        This can be sent to a second LLM for deeper analysis.
        
        Args:
            patient: Patient data dictionary
            treatment_plan: Generated treatment plan text
            
        Returns:
            Critic prompt string
        """
        patient_summary = f"""
Patient: {patient.get('patient_id', 'Unknown')}
Age: {patient.get('demographics', {}).get('age', 'Unknown')}
Conditions: {', '.join(patient.get('conditions', []))}
Medications: {', '.join(patient.get('medications', []))}
Key Labs: A1c {patient.get('labs', {}).get('A1c', '?')}%, eGFR {patient.get('labs', {}).get('eGFR', '?')}
Allergies: {', '.join(patient.get('allergies', []))}
"""
        
        critic_prompt = f"""You are a clinical safety reviewer. Your job is to find problems in treatment plans before they reach patients.

=== PATIENT SUMMARY ===
{patient_summary}

=== TREATMENT PLAN TO REVIEW ===
{treatment_plan}

=== YOUR TASK ===
Review this treatment plan and identify:
1. Recommendations that contradict clinical guidelines
2. Potential drug interactions or contraindications
3. Missing standard-of-care elements
4. Any recommendations not supported by the patient data
5. Dosing issues or monitoring gaps

Output your review as JSON:
{{
    "overall_safe": true/false,
    "confidence": "high/medium/low",
    "critical_issues": [
        {{"issue": "description", "recommendation": "what to do"}}
    ],
    "warnings": [
        {{"issue": "description", "recommendation": "what to do"}}
    ],
    "missing_elements": ["list of missing standard elements"],
    "strengths": ["positive aspects of the plan"]
}}
"""
        return critic_prompt


def run_demo():
    """Demonstrate the guardrails system."""
    print("\n--- Guardrails Demo ---\n")
    
    # Sample patient with some issues to catch
    test_patient = {
        "patient_id": "TEST-001",
        "demographics": {"age": 78, "sex": "M"},
        "conditions": ["Type 2 Diabetes", "Hypertension", "Heart Failure"],
        "medications": ["Lisinopril 10mg"],
        "labs": {"A1c": 7.8, "eGFR": 35, "LDL": 130},
        "vitals": {"BP_Systolic": 145, "BP_Diastolic": 90},
        "allergies": ["Sulfa"],
        "lifestyle": {"activity_level": "sedentary"}
    }
    
    # Sample treatment plan with intentional issues
    test_plan = """
## Treatment Plan for Patient TEST-001

### Medications
1. Continue Metformin 1000mg BID (current therapy)
2. Add Glipizide 5mg daily for better glycemic control
3. Consider Pioglitazone if above not sufficient
4. Target A1c: <6.5%

### Lifestyle
- Encourage increased physical activity

### Follow-up
- See in 3 months
"""
    
    # Run guardrails
    guardrails = SafetyGuardrails()
    report = guardrails.generate_safety_report(test_patient, test_plan)
    
    # Display results
    print(f"Overall Status: {report['overall_status']}")
    print(f"Message: {report['status_message']}\n")
    
    print(f"Summary: {report['summary']['passed']}/{report['summary']['total_rules']} rules passed")
    
    if report['critical_issues']:
        print(f"\n🚨 CRITICAL ISSUES ({len(report['critical_issues'])}):")
        for issue in report['critical_issues']:
            print(f"  - [{issue['rule_id']}] {issue['message']}")
            print(f"    → {issue['recommendation']}")
    
    if report['warnings']:
        print(f"\n⚠️  WARNINGS ({len(report['warnings'])}):")
        for issue in report['warnings']:
            print(f"  - [{issue['rule_id']}] {issue['message']}")
            print(f"    → {issue['recommendation']}")
    
    if report['info']:
        print(f"\nℹ️  INFO ({len(report['info'])}):")
        for issue in report['info']:
            print(f"  - [{issue['rule_id']}] {issue['message']}")
    
    # Show critic prompt
    print("\n" + "=" * 60)
    print("LLM CRITIC PROMPT (for second-pass review):")
    print("=" * 60)
    critic_prompt = guardrails.get_critic_prompt(test_patient, test_plan)
    print(critic_prompt[:500] + "...\n")
    
    return report


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 5: Clinical Safety Guardrails")
    print("=" * 60)
    
    report = run_demo()
    
    # Save report
    output_dir = Path("data/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(output_dir / "safety_report_demo.json", 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n✓ Saved safety report to data/outputs/safety_report_demo.json")
    
    print("\n✓ Step 5 Complete!")
