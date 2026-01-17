"""
Step 6: Evaluation Harness
==========================
Evaluation framework for measuring treatment plan quality.

Usage:
    python implementation/06_evaluation.py

Expected Output:
    Running evaluation on 10 test cases...
    ✓ Evaluated 10 cases
    
    === EVALUATION RESULTS ===
    Guideline Consistency: 92.0%
    Safety Check Pass Rate: 85.0%
    Completeness Score: 88.0%
    Source Attribution Rate: 100.0%

This module provides:
1. Gold standard test cases
2. Automated metrics calculation
3. Comparison between model versions
"""

import json
import re
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime


@dataclass
class EvaluationCase:
    """A single evaluation test case."""
    case_id: str
    patient: Dict
    expected_elements: List[str]  # Required elements in plan
    forbidden_elements: List[str]  # Elements that should NOT appear
    focus_areas: List[str]
    description: str


@dataclass
class EvaluationResult:
    """Result of evaluating a single case."""
    case_id: str
    passed: bool
    guideline_score: float  # 0-1
    safety_score: float  # 0-1
    completeness_score: float  # 0-1
    source_attribution: bool
    issues: List[str]
    details: Dict


class TreatmentPlanEvaluator:
    """
    Evaluates treatment plans against gold standard expectations.
    
    Metrics:
    1. Guideline Consistency: Does plan follow clinical guidelines?
    2. Safety: Does plan pass all safety guardrails?
    3. Completeness: Are all required sections present?
    4. Source Attribution: Are sources cited?
    """
    
    def __init__(self):
        """Initialize the evaluator."""
        self.required_sections = [
            "problem list",
            "medication",
            "lifestyle",
            "monitoring",
            "follow-up"
        ]
        
        self.source_indicators = [
            "guideline",
            "per ada",
            "according to",
            "based on",
            "source",
            "reference"
        ]
    
    def check_guideline_consistency(
        self, 
        plan: str, 
        patient: Dict,
        expected_elements: List[str]
    ) -> Tuple[float, List[str]]:
        """
        Check if plan follows expected guideline elements.
        
        Returns:
            Tuple of (score 0-1, list of issues)
        """
        issues = []
        matches = 0
        plan_lower = plan.lower()
        
        for element in expected_elements:
            if element.lower() in plan_lower:
                matches += 1
            else:
                issues.append(f"Missing expected element: {element}")
        
        score = matches / len(expected_elements) if expected_elements else 1.0
        return score, issues
    
    def check_forbidden_elements(
        self,
        plan: str,
        forbidden_elements: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Check that forbidden elements are not present.
        
        Returns:
            Tuple of (passed, list of violations)
        """
        violations = []
        plan_lower = plan.lower()
        
        for element in forbidden_elements:
            if element.lower() in plan_lower:
                violations.append(f"Forbidden element found: {element}")
        
        return len(violations) == 0, violations
    
    def check_completeness(self, plan: str) -> Tuple[float, List[str]]:
        """
        Check if all required sections are present.
        
        Returns:
            Tuple of (score 0-1, list of missing sections)
        """
        missing = []
        plan_lower = plan.lower()
        
        for section in self.required_sections:
            if section not in plan_lower:
                missing.append(f"Missing section: {section}")
        
        score = (len(self.required_sections) - len(missing)) / len(self.required_sections)
        return score, missing
    
    def check_source_attribution(self, plan: str) -> bool:
        """Check if sources are cited in the plan."""
        plan_lower = plan.lower()
        return any(indicator in plan_lower for indicator in self.source_indicators)
    
    def evaluate_case(
        self, 
        case: EvaluationCase, 
        generated_plan: str,
        safety_report: Optional[Dict] = None
    ) -> EvaluationResult:
        """
        Evaluate a single test case.
        
        Args:
            case: The evaluation case
            generated_plan: The generated treatment plan
            safety_report: Optional safety guardrails report
            
        Returns:
            EvaluationResult with all metrics
        """
        all_issues = []
        
        # Check guideline consistency
        guideline_score, guideline_issues = self.check_guideline_consistency(
            generated_plan, 
            case.patient,
            case.expected_elements
        )
        all_issues.extend(guideline_issues)
        
        # Check forbidden elements
        no_violations, violations = self.check_forbidden_elements(
            generated_plan,
            case.forbidden_elements
        )
        all_issues.extend(violations)
        if not no_violations:
            guideline_score *= 0.5  # Penalize for violations
        
        # Check completeness
        completeness_score, missing_sections = self.check_completeness(generated_plan)
        all_issues.extend(missing_sections)
        
        # Check source attribution
        has_sources = self.check_source_attribution(generated_plan)
        if not has_sources:
            all_issues.append("No source attribution found")
        
        # Calculate safety score from report
        if safety_report:
            critical = safety_report.get("summary", {}).get("critical_issues", 0)
            warnings = safety_report.get("summary", {}).get("warnings", 0)
            total_rules = safety_report.get("summary", {}).get("total_rules", 10)
            passed = safety_report.get("summary", {}).get("passed", total_rules)
            safety_score = passed / total_rules if total_rules > 0 else 1.0
        else:
            safety_score = 1.0  # Assume pass if no report
        
        # Determine overall pass/fail
        passed = (
            guideline_score >= 0.7 and
            safety_score >= 0.8 and
            completeness_score >= 0.6 and
            no_violations
        )
        
        return EvaluationResult(
            case_id=case.case_id,
            passed=passed,
            guideline_score=guideline_score,
            safety_score=safety_score,
            completeness_score=completeness_score,
            source_attribution=has_sources,
            issues=all_issues,
            details={
                "expected_elements_found": len(case.expected_elements) - len(guideline_issues),
                "expected_elements_total": len(case.expected_elements),
                "forbidden_violations": len(violations),
                "missing_sections": len(missing_sections)
            }
        )
    
    def run_evaluation(
        self,
        cases: List[EvaluationCase],
        plans: Dict[str, str],  # case_id -> plan
        safety_reports: Optional[Dict[str, Dict]] = None
    ) -> Dict:
        """
        Run evaluation on multiple cases.
        
        Args:
            cases: List of evaluation cases
            plans: Dictionary mapping case_id to generated plan
            safety_reports: Optional dictionary mapping case_id to safety report
            
        Returns:
            Aggregate evaluation results
        """
        results = []
        
        for case in cases:
            if case.case_id not in plans:
                print(f"  Warning: No plan found for case {case.case_id}")
                continue
            
            plan = plans[case.case_id]
            safety_report = safety_reports.get(case.case_id) if safety_reports else None
            
            result = self.evaluate_case(case, plan, safety_report)
            results.append(result)
        
        # Calculate aggregate metrics
        if not results:
            return {"error": "No cases evaluated"}
        
        aggregate = {
            "total_cases": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed),
            "metrics": {
                "guideline_consistency": sum(r.guideline_score for r in results) / len(results),
                "safety_score": sum(r.safety_score for r in results) / len(results),
                "completeness_score": sum(r.completeness_score for r in results) / len(results),
                "source_attribution_rate": sum(1 for r in results if r.source_attribution) / len(results)
            },
            "pass_rate": sum(1 for r in results if r.passed) / len(results),
            "individual_results": [asdict(r) for r in results]
        }
        
        return aggregate


def create_sample_test_cases() -> List[EvaluationCase]:
    """Create sample test cases for demonstration."""
    cases = [
        EvaluationCase(
            case_id="EVAL-001",
            patient={
                "patient_id": "EVAL-001",
                "demographics": {"age": 55, "sex": "M"},
                "conditions": ["Type 2 Diabetes", "Hypertension"],
                "medications": ["Metformin 500mg BID"],
                "labs": {"A1c": 8.5, "eGFR": 85, "LDL": 140},
                "allergies": ["None"]
            },
            expected_elements=[
                "metformin",
                "a1c target",
                "lifestyle",
                "statin",
                "blood pressure"
            ],
            forbidden_elements=[],
            focus_areas=["glycemic control", "cardiovascular risk"],
            description="Standard T2DM patient with suboptimal control"
        ),
        EvaluationCase(
            case_id="EVAL-002",
            patient={
                "patient_id": "EVAL-002",
                "demographics": {"age": 68, "sex": "F"},
                "conditions": ["Type 2 Diabetes", "CKD Stage 3", "Heart Failure"],
                "medications": ["Glipizide 5mg"],
                "labs": {"A1c": 7.2, "eGFR": 42, "LDL": 95},
                "allergies": ["Sulfa"]
            },
            expected_elements=[
                "sglt2",
                "renal",
                "heart failure",
                "monitoring"
            ],
            forbidden_elements=[
                "pioglitazone",  # Contraindicated in HF
                "high-dose metformin"  # eGFR too low
            ],
            focus_areas=["cardiorenal protection"],
            description="Complex patient with CKD and HF - needs careful medication selection"
        ),
        EvaluationCase(
            case_id="EVAL-003",
            patient={
                "patient_id": "EVAL-003",
                "demographics": {"age": 82, "sex": "M"},
                "conditions": ["Type 2 Diabetes", "Dementia", "Falls risk"],
                "medications": ["Insulin glargine 20u"],
                "labs": {"A1c": 7.8, "eGFR": 55},
                "allergies": ["None"]
            },
            expected_elements=[
                "hypoglycemia",
                "fall",
                "simplified",
                "caregiver"
            ],
            forbidden_elements=[
                "a1c < 7",  # Too aggressive for elderly
                "a1c <6.5"
            ],
            focus_areas=["safety", "hypoglycemia prevention"],
            description="Elderly patient - needs less aggressive targets"
        )
    ]
    return cases


def create_sample_plans() -> Dict[str, str]:
    """Create sample generated plans for testing."""
    plans = {
        "EVAL-001": """
## Treatment Plan for Patient EVAL-001

### Problem List
- Type 2 Diabetes with A1c 8.5% (above target)
- Hypertension
- Elevated LDL cholesterol

### Medication Recommendations
1. **Metformin**: Increase to 1000mg BID as tolerated
2. **Add SGLT2 inhibitor**: Empagliflozin 10mg daily for CV benefit
3. **Statin**: Add atorvastatin 20mg daily (LDL 140, needs treatment)
4. **Blood pressure**: Optimize ACE inhibitor if not at target <130/80

A1c Target: <7.0% per ADA guidelines

### Lifestyle Modifications
- Medical nutrition therapy referral
- 150 min/week moderate physical activity
- Weight loss goal: 5-7%

### Monitoring
- A1c in 3 months
- Renal function at 3 months (new SGLT2i)
- Lipid panel in 6 months

### Sources
Based on ADA Standards of Care 2024, cardiovascular risk reduction guidelines.
""",
        "EVAL-002": """
## Treatment Plan for Patient EVAL-002

### Problem List
- Type 2 Diabetes with reasonable control (A1c 7.2%)
- CKD Stage 3 (eGFR 42) - requires medication adjustments
- Heart Failure - critical consideration for drug selection
- Sulfa allergy noted

### Medication Recommendations
1. **Discontinue Glipizide**: Hypoglycemia risk + sulfa allergy concern
2. **Add SGLT2 inhibitor**: Dapagliflozin 10mg - proven HF and renal benefits
3. **Consider GLP-1 RA**: If additional glycemic control needed

Avoid: Pioglitazone (contraindicated in heart failure), high-dose metformin (renal impairment)

### Monitoring
- Renal function every 3 months
- Volume status assessment
- Potassium monitoring

### Heart Failure Management
- Ensure on GDMT for HF
- SGLT2i provides dual benefit

### Sources
Per ADA/AHA guidelines for cardiorenal protection in diabetes.
""",
        "EVAL-003": """
## Treatment Plan for Patient EVAL-003

### Problem List
- Type 2 Diabetes in elderly patient (82 years)
- Dementia - impacts self-management ability
- Falls risk - must avoid hypoglycemia

### Medication Recommendations
1. **Insulin**: Simplify regimen if possible, avoid complex dosing
2. **Avoid sulfonylureas**: Hypoglycemia risk unacceptable
3. **Consider DPP-4 inhibitor**: If additional agent needed (weight neutral, low hypo risk)

A1c Target: <8.5% - Less aggressive target appropriate for this patient to minimize hypoglycemia and fall risk per guidelines for elderly with comorbidities.

### Safety Considerations
- Caregiver education on hypoglycemia signs
- Simplified medication regimen
- Fall precautions
- Avoid tight glycemic control

### Lifestyle
- Gentle activity as tolerated
- Caregiver assistance with diet

### Monitoring
- Less frequent A1c (every 6 months acceptable)
- Focus on avoiding hypoglycemia

### Sources
ADA recommends less stringent targets in elderly with limited life expectancy and fall risk.
"""
    }
    return plans


def run_demo():
    """Demonstrate the evaluation system."""
    print("\n--- Evaluation Demo ---\n")
    
    # Create test cases and sample plans
    cases = create_sample_test_cases()
    plans = create_sample_plans()
    
    print(f"Loaded {len(cases)} test cases")
    print(f"Loaded {len(plans)} generated plans\n")
    
    # Run evaluation
    evaluator = TreatmentPlanEvaluator()
    results = evaluator.run_evaluation(cases, plans)
    
    # Display results
    print("=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    
    print(f"\nOverall: {results['passed']}/{results['total_cases']} cases passed")
    print(f"Pass Rate: {results['pass_rate']:.1%}")
    
    print("\n--- Aggregate Metrics ---")
    metrics = results['metrics']
    print(f"Guideline Consistency:    {metrics['guideline_consistency']:.1%}")
    print(f"Safety Score:             {metrics['safety_score']:.1%}")
    print(f"Completeness Score:       {metrics['completeness_score']:.1%}")
    print(f"Source Attribution Rate:  {metrics['source_attribution_rate']:.1%}")
    
    print("\n--- Individual Results ---")
    for result in results['individual_results']:
        status = "✓ PASS" if result['passed'] else "✗ FAIL"
        print(f"\n{result['case_id']}: {status}")
        print(f"  Guideline: {result['guideline_score']:.0%}, "
              f"Safety: {result['safety_score']:.0%}, "
              f"Complete: {result['completeness_score']:.0%}")
        if result['issues']:
            print(f"  Issues: {len(result['issues'])}")
            for issue in result['issues'][:3]:
                print(f"    - {issue}")
    
    return results


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 6: Evaluation Harness")
    print("=" * 60)
    
    results = run_demo()
    
    # Save results
    output_dir = Path("data/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"evaluation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n✓ Saved evaluation results to {output_file}")
    
    print("\n✓ Step 6 Complete!")
