"""
Step 1: Synthetic Patient Data Generator
========================================
Generates fake patient profiles for development/testing.
NO REAL PHI - Safe for version control.

Usage:
    python implementation/01_generate_patients.py

Expected Output:
    ✓ Saved 50 synthetic patients to data/patients/synthetic_patients.json
    --- Sample Patient ---
    { ... patient JSON ... }
"""

import json
import random
from datetime import datetime
from pathlib import Path


def generate_synthetic_patients(num_patients: int = 50) -> list:
    """
    Generate synthetic patient profiles for Type 2 Diabetes use case.
    
    Args:
        num_patients: Number of patients to generate (default: 50)
    
    Returns:
        List of patient dictionaries
    """
    
    conditions_pool = [
        "Type 2 Diabetes", "Hypertension", "Hyperlipidemia", 
        "Obesity", "Coronary Artery Disease", "Chronic Kidney Disease Stage 2",
        "Peripheral Neuropathy", "Retinopathy", "GERD", "Osteoarthritis"
    ]
    
    medications_pool = [
        "Metformin 1000mg BID", "Metformin 500mg BID",
        "Glipizide 5mg daily", "Lisinopril 10mg daily",
        "Atorvastatin 20mg daily", "Aspirin 81mg daily",
        "Empagliflozin 10mg daily", "Semaglutide 0.5mg weekly",
        "Amlodipine 5mg daily", "Losartan 50mg daily"
    ]
    
    diet_patterns = ["high carb", "balanced", "mediterranean", "low carb", "unrestricted"]
    activity_levels = ["sedentary", "low", "moderate", "active"]
    ethnicities = ["Caucasian", "African American", "Hispanic", "Asian", "Other"]
    
    patients = []
    
    for i in range(num_patients):
        # Ensure Type 2 Diabetes is always present for this use case
        conditions = ["Type 2 Diabetes"]
        additional_conditions = random.sample(
            [c for c in conditions_pool if c != "Type 2 Diabetes"], 
            random.randint(1, 4)
        )
        conditions.extend(additional_conditions)
        
        # Generate correlated lab values (worse A1c = often worse other values)
        a1c = round(random.uniform(6.5, 11.0), 1)
        base_risk = (a1c - 6.5) / 4.5  # Normalized risk factor
        
        patient = {
            "patient_id": f"SYN-{1000 + i}",
            "demographics": {
                "age": random.randint(35, 75),
                "sex": random.choice(["M", "F"]),
                "ethnicity": random.choice(ethnicities)
            },
            "conditions": conditions,
            "medications": random.sample(medications_pool, random.randint(1, 5)),
            "labs": {
                "A1c": a1c,
                "LDL": int(80 + base_risk * 100 + random.randint(-20, 20)),
                "HDL": int(60 - base_risk * 30 + random.randint(-10, 10)),
                "Triglycerides": int(100 + base_risk * 200 + random.randint(-30, 30)),
                "Creatinine": round(0.8 + base_risk * 0.8 + random.uniform(-0.2, 0.2), 2),
                "eGFR": int(120 - base_risk * 60 + random.randint(-15, 15)),
                "Fasting_Glucose": int(100 + a1c * 15 + random.randint(-20, 20)),
                "ALT": random.randint(15, 60),
                "AST": random.randint(15, 50)
            },
            "vitals": {
                "BP_Systolic": int(120 + base_risk * 30 + random.randint(-10, 10)),
                "BP_Diastolic": int(75 + base_risk * 15 + random.randint(-5, 5)),
                "BMI": round(25 + base_risk * 15 + random.uniform(-3, 3), 1),
                "Weight_kg": random.randint(60, 130),
                "Heart_Rate": random.randint(60, 100)
            },
            "lifestyle": {
                "activity_level": random.choices(
                    activity_levels, 
                    weights=[0.3, 0.35, 0.25, 0.1]  # Bias towards lower activity
                )[0],
                "diet_pattern": random.choice(diet_patterns),
                "smoking_status": random.choice(["never", "former", "current"]),
                "alcohol_use": random.choice(["none", "occasional", "moderate", "heavy"]),
                "sleep_hours": random.randint(4, 9)
            },
            "goals": random.sample([
                "lower A1c", "lose weight", "improve blood pressure",
                "reduce cardiovascular risk", "improve kidney function",
                "reduce medication burden", "improve energy levels"
            ], random.randint(1, 3)),
            "allergies": random.choice([
                ["None"], ["Penicillin"], ["Sulfa"], 
                ["Penicillin", "Sulfa"], ["NSAIDS"]
            ]),
            "family_history": {
                "diabetes": random.choice([True, False]),
                "heart_disease": random.choice([True, False]),
                "stroke": random.choice([True, False]),
                "cancer": random.choice([True, False])
            },
            "social_history": {
                "employment": random.choice(["employed", "retired", "disabled", "unemployed"]),
                "living_situation": random.choice(["alone", "with spouse", "with family", "assisted living"]),
                "insurance": random.choice(["private", "medicare", "medicaid", "uninsured"])
            },
            "created_date": datetime.now().isoformat(),
            "last_visit": (datetime.now()).strftime("%Y-%m-%d")
        }
        
        # Ensure eGFR is within reasonable bounds
        patient["labs"]["eGFR"] = max(30, min(120, patient["labs"]["eGFR"]))
        
        patients.append(patient)
    
    return patients


def save_patients(patients: list, output_path: str):
    """Save patients to JSON file."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(patients, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved {len(patients)} synthetic patients to {output_path}")


def validate_patients(patients: list) -> dict:
    """Validate generated patient data."""
    stats = {
        "total": len(patients),
        "with_diabetes": sum(1 for p in patients if "Type 2 Diabetes" in p["conditions"]),
        "avg_a1c": sum(p["labs"]["A1c"] for p in patients) / len(patients),
        "avg_age": sum(p["demographics"]["age"] for p in patients) / len(patients),
        "low_egfr_count": sum(1 for p in patients if p["labs"]["eGFR"] < 60),
        "sulfa_allergy_count": sum(1 for p in patients if "Sulfa" in p["allergies"])
    }
    return stats


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 1: Generate Synthetic Patient Data")
    print("=" * 60)
    
    # Generate patients
    patients = generate_synthetic_patients(50)
    
    # Save to file
    output_path = "data/patients/synthetic_patients.json"
    save_patients(patients, output_path)
    
    # Validate and show stats
    stats = validate_patients(patients)
    print(f"\n--- Dataset Statistics ---")
    print(f"Total patients: {stats['total']}")
    print(f"Patients with T2DM: {stats['with_diabetes']}")
    print(f"Average A1c: {stats['avg_a1c']:.1f}%")
    print(f"Average age: {stats['avg_age']:.0f} years")
    print(f"Low eGFR (<60): {stats['low_egfr_count']}")
    print(f"Sulfa allergies: {stats['sulfa_allergy_count']}")
    
    # Show sample patient
    print(f"\n--- Sample Patient ---")
    print(json.dumps(patients[0], indent=2))
    
    print("\n✓ Step 1 Complete!")
