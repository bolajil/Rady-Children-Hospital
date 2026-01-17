"""
Step 2: Clinical Guidelines Database Creator
=============================================
Creates clinical guideline documents for RAG retrieval.
Based on ADA Standards of Care (summarized for demo purposes).

Usage:
    python implementation/02_create_guidelines.py

Expected Output:
    ✓ Saved diabetes guidelines to data/guidelines/diabetes_guidelines.json
    ✓ Saved lifestyle guidelines to data/guidelines/lifestyle_guidelines.json
    ✓ Saved medication guidelines to data/guidelines/medication_guidelines.json
"""

import json
from pathlib import Path


DIABETES_GUIDELINES = {
    "guideline_id": "ADA-2024-T2DM",
    "title": "Type 2 Diabetes Management Guidelines",
    "source": "American Diabetes Association Standards of Care 2024 (Summarized for Demo)",
    "version": "1.0",
    "last_updated": "2024-01-01",
    "sections": [
        {
            "section_id": "glycemic_targets",
            "title": "Glycemic Targets",
            "content": """
Recommended glycemic targets for adults with diabetes:

A1C TARGETS:
- General target: <7.0% for most non-pregnant adults
- Stricter target: <6.5% if achievable without significant hypoglycemia
- Less strict target: <8.0% for:
  * Elderly patients (>65 years)
  * Limited life expectancy
  * Extensive comorbidities
  * Long duration of diabetes with difficulty achieving goal
  * History of severe hypoglycemia

SELF-MONITORING TARGETS:
- Fasting/Pre-prandial glucose: 80-130 mg/dL
- Post-prandial glucose (1-2 hours after meal): <180 mg/dL
- Bedtime glucose: 100-140 mg/dL

INDIVIDUALIZATION FACTORS:
- Patient preferences and values
- Hypoglycemia risk
- Disease duration
- Life expectancy
- Comorbidities (especially cardiovascular disease, CKD)
- Established vascular complications
- Resources and support system
            """,
            "key_points": [
                "A1c <7% for most adults",
                "Individualize based on patient factors",
                "Avoid hypoglycemia, especially in elderly",
                "More stringent goals if safely achievable"
            ],
            "evidence_level": "A"
        },
        {
            "section_id": "first_line_therapy",
            "title": "First-Line Pharmacotherapy",
            "content": """
METFORMIN as first-line therapy:

INDICATIONS:
- First-line agent for most patients with Type 2 Diabetes
- Continue if tolerated and not contraindicated

DOSING:
- Start: 500mg once or twice daily with meals
- Titration: Increase by 500mg every 1-2 weeks
- Target: 1000mg twice daily (2000mg/day maximum)
- Extended-release formulation may reduce GI side effects

CONTRAINDICATIONS:
- eGFR <30 mL/min/1.73m² (contraindicated)
- eGFR 30-45 mL/min/1.73m² (reduce dose, do not initiate)
- Acute or chronic metabolic acidosis
- Before iodinated contrast procedures (hold if eGFR <60)

MONITORING:
- Renal function: At initiation, then at least annually
- B12 levels: Consider periodic monitoring with long-term use
- GI tolerance: Common side effects are dose-related

WHEN TO ADD SECOND AGENT:
- A1c not at target after 3 months of metformin monotherapy
- Consider earlier combination therapy if A1c ≥1.5% above target
            """,
            "key_points": [
                "Metformin is first-line unless contraindicated",
                "Titrate slowly to minimize GI side effects",
                "Check eGFR before starting and annually",
                "Add second agent if not at goal after 3 months"
            ],
            "evidence_level": "A"
        },
        {
            "section_id": "second_line_agents",
            "title": "Second-Line Agent Selection",
            "content": """
SELECT SECOND-LINE AGENT BASED ON PATIENT CHARACTERISTICS:

IF ASCVD (Atherosclerotic Cardiovascular Disease) PRESENT:
- Preferred: GLP-1 RA with proven CV benefit (semaglutide, liraglutide, dulaglutide)
- Alternative: SGLT2 inhibitor with proven CV benefit

IF HEART FAILURE PRESENT:
- Preferred: SGLT2 inhibitor (empagliflozin, dapagliflozin, canagliflozin)
- These have proven heart failure hospitalization reduction

IF CKD (Chronic Kidney Disease) PRESENT:
- eGFR 25-60 or albuminuria: SGLT2 inhibitor preferred
- Alternative: GLP-1 RA with proven renal benefit
- SGLT2 inhibitors slow CKD progression

IF WEIGHT LOSS IS PRIORITY:
- Preferred: GLP-1 RA (especially semaglutide - highest weight loss)
- Alternative: SGLT2 inhibitor (moderate weight loss)
- Avoid: Sulfonylureas, insulin (weight gain)

IF COST IS A MAJOR CONCERN:
- Sulfonylurea (generic, very low cost)
- Pioglitazone (generic, low cost)
- Note: Higher hypoglycemia risk with sulfonylureas
- Note: Fluid retention/HF risk with pioglitazone

IF HYPOGLYCEMIA RISK IS HIGH:
- Avoid: Sulfonylureas, meglitinides
- Prefer: GLP-1 RA, SGLT2 inhibitors, DPP-4 inhibitors
            """,
            "key_points": [
                "Match agent to patient comorbidities",
                "ASCVD → GLP-1 RA or SGLT2i with CV benefit",
                "Heart failure → SGLT2 inhibitor",
                "CKD → SGLT2 inhibitor",
                "Cost-sensitive → Sulfonylurea but with caution"
            ],
            "evidence_level": "A"
        },
        {
            "section_id": "blood_pressure",
            "title": "Blood Pressure Management",
            "content": """
BLOOD PRESSURE TARGETS:
- General target: <130/80 mmHg for most patients
- May consider <140/90 mmHg for higher-risk patients

FIRST-LINE ANTIHYPERTENSIVES:
- ACE inhibitor OR ARB (especially if albuminuria present)
- Dihydropyridine CCB
- Thiazide-like diuretic

IF ALBUMINURIA PRESENT:
- ACE inhibitor or ARB is strongly recommended
- Provides renal protection beyond BP lowering
- Do not combine ACE inhibitor + ARB

IF BP NOT CONTROLLED:
- Add second agent from different class
- Consider adding third agent if needed
- Loop diuretic if eGFR <30 (thiazides less effective)

MONITORING:
- Check BP at every visit
- Home BP monitoring recommended
- Assess for orthostatic hypotension, especially in elderly
            """,
            "key_points": [
                "Target <130/80 for most diabetic patients",
                "ACE/ARB first-line if albuminuria",
                "Multi-drug therapy often needed",
                "Monitor for orthostatic hypotension"
            ],
            "evidence_level": "A"
        },
        {
            "section_id": "lipid_management",
            "title": "Lipid Management",
            "content": """
STATIN THERAPY RECOMMENDATIONS:

HIGH-INTENSITY STATIN (LDL reduction ≥50%):
- All diabetic patients with ASCVD
- Atorvastatin 40-80mg or Rosuvastatin 20-40mg

MODERATE-INTENSITY STATIN (LDL reduction 30-49%):
- All diabetic patients aged 40-75 without ASCVD
- Atorvastatin 10-20mg, Rosuvastatin 5-10mg, Simvastatin 20-40mg

ADDITIONAL CONSIDERATIONS:
- Age <40: Consider statin if additional CV risk factors
- Age >75: Continue if tolerating; individualize if starting
- LDL goal: <70 mg/dL if ASCVD; <100 mg/dL otherwise

IF LDL NOT AT GOAL ON MAXIMALLY TOLERATED STATIN:
- Add ezetimibe 10mg daily
- Consider PCSK9 inhibitor if very high risk

MONITORING:
- Lipid panel at initiation, 4-12 weeks after starting/changing
- Then annually
- Check liver enzymes if symptoms suggest hepatotoxicity
            """,
            "key_points": [
                "All diabetics 40-75 need at least moderate-intensity statin",
                "High-intensity statin if ASCVD present",
                "Add ezetimibe if LDL not at goal",
                "LDL target <70 if ASCVD, <100 otherwise"
            ],
            "evidence_level": "A"
        },
        {
            "section_id": "monitoring_schedule",
            "title": "Monitoring and Follow-up",
            "content": """
GLYCEMIC MONITORING:
- A1c: Every 3 months if not at goal, every 6 months if stable
- Self-monitoring of blood glucose: Individualized frequency

KIDNEY MONITORING:
- eGFR: At least annually
- Urine albumin-to-creatinine ratio: At least annually
- More frequent if abnormal or on nephrotoxic medications

CARDIOVASCULAR MONITORING:
- Blood pressure: Every visit
- Lipid panel: Annually (more often if adjusting therapy)
- ECG: Consider baseline, especially if symptoms

EYE EXAM:
- Dilated retinal exam: At diagnosis, then annually
- May reduce to every 2 years if no retinopathy

FOOT EXAM:
- Visual inspection: Every visit
- Comprehensive exam: Annually (monofilament, pulses, inspection)

OTHER MONITORING:
- Weight: Every visit
- Depression screening: Annually
- Immunizations: Annual flu, pneumococcal, hepatitis B
            """,
            "key_points": [
                "A1c every 3-6 months depending on control",
                "Annual kidney function and urine albumin",
                "Annual dilated eye exam",
                "Foot exam at every visit"
            ],
            "evidence_level": "B"
        }
    ]
}


LIFESTYLE_GUIDELINES = {
    "guideline_id": "LIFESTYLE-T2DM-2024",
    "title": "Lifestyle Recommendations for Type 2 Diabetes",
    "source": "ADA/ACC/AHA Guidelines (Summarized for Demo)",
    "version": "1.0",
    "sections": [
        {
            "section_id": "nutrition",
            "title": "Medical Nutrition Therapy",
            "content": """
GENERAL PRINCIPLES:
- Individualized meal planning with registered dietitian
- No single ideal macronutrient distribution
- Focus on overall diet quality

RECOMMENDED DIET PATTERNS:
- Mediterranean diet: High evidence for CV benefit
- DASH diet: Effective for blood pressure control
- Plant-based diets: May improve glycemic control
- Low-carbohydrate diets: Effective for glycemic control and weight loss

CARBOHYDRATE RECOMMENDATIONS:
- Focus on quality over quantity
- Emphasize whole grains, vegetables, legumes, fruits
- Limit refined carbohydrates and added sugars
- Carbohydrate counting beneficial for insulin users

SPECIFIC TARGETS:
- Fiber: 25-30g daily (or 14g per 1000 kcal)
- Sodium: <2300mg daily, <1500mg if hypertensive
- Saturated fat: <10% of total calories
- Avoid trans fats
- Sugar-sweetened beverages: Eliminate or minimize

WEIGHT MANAGEMENT:
- 5% weight loss: Improves glycemic control
- 7% weight loss: Significant metabolic benefit
- Consider very low-calorie diet if BMI >30 and supervised
            """,
            "key_points": [
                "Individualize diet plan",
                "Mediterranean and DASH diets have strong evidence",
                "5-7% weight loss significantly improves outcomes",
                "Reduce refined carbs and added sugars"
            ]
        },
        {
            "section_id": "physical_activity",
            "title": "Physical Activity Recommendations",
            "content": """
AEROBIC EXERCISE:
- Duration: ≥150 min/week of moderate-intensity OR 75 min/week vigorous
- Frequency: Spread over at least 3 days, no more than 2 consecutive days without
- Examples: Brisk walking, cycling, swimming, dancing

RESISTANCE TRAINING:
- Frequency: 2-3 sessions per week on non-consecutive days
- Exercises: 8-10 exercises involving major muscle groups
- Sets/Reps: 1-3 sets of 10-15 repetitions

FLEXIBILITY AND BALANCE:
- Frequency: 2-3 sessions per week
- Especially important for older adults
- Yoga and tai chi have additional stress reduction benefits

REDUCING SEDENTARY TIME:
- Break up prolonged sitting every 30 minutes
- Light walking or standing breaks improve glucose levels

PRECAUTIONS:
- Check blood glucose before and after exercise
- Carry fast-acting carbohydrate if on insulin/sulfonylurea
- Proper footwear essential for those with neuropathy
- Avoid high-impact if proliferative retinopathy present
- ECG screening if starting vigorous activity in sedentary patient >40 years
            """,
            "key_points": [
                "150 min/week moderate aerobic activity",
                "Resistance training 2-3x per week",
                "Break up sitting every 30 minutes",
                "Special precautions if on insulin"
            ]
        },
        {
            "section_id": "smoking_cessation",
            "title": "Tobacco Cessation",
            "content": """
IMPORTANCE:
- Smoking dramatically increases cardiovascular risk in diabetes
- Smoking worsens glycemic control
- Smoking accelerates microvascular complications

APPROACH:
- Ask about tobacco use at every visit
- Advise all smokers to quit
- Assess readiness to quit
- Assist with quit plan and pharmacotherapy
- Arrange follow-up

PHARMACOTHERAPY OPTIONS:
- Nicotine replacement therapy (patch, gum, lozenge)
- Bupropion (also helps with weight)
- Varenicline (most effective but assess psychiatric history)
- Combination therapy may be more effective

E-CIGARETTES:
- Not recommended as smoking cessation aid
- Not proven safer than traditional cigarettes
            """,
            "key_points": [
                "Address smoking at every visit",
                "Pharmacotherapy significantly improves quit rates",
                "Cardiovascular benefits begin immediately after quitting"
            ]
        },
        {
            "section_id": "sleep_health",
            "title": "Sleep and Stress Management",
            "content": """
SLEEP RECOMMENDATIONS:
- Duration: 7-8 hours per night for adults
- Screen for obstructive sleep apnea if BMI >30 or symptoms present
- Poor sleep worsens insulin resistance and hunger hormones

SLEEP APNEA:
- Prevalence: Very high in obese diabetic patients
- Screening: STOP-BANG questionnaire
- Treatment: CPAP improves glucose control and blood pressure

STRESS AND MENTAL HEALTH:
- Diabetes distress is common (affects 30-40%)
- Screen for depression annually
- Consider referral to mental health specialist
- Stress management techniques: mindfulness, relaxation training

ALCOHOL:
- If consumed: Moderate intake (≤1 drink/day women, ≤2 men)
- Avoid if: History of pancreatitis, liver disease, pregnancy
- Be aware: Alcohol can cause delayed hypoglycemia if on insulin
            """,
            "key_points": [
                "7-8 hours sleep recommended",
                "Screen for sleep apnea in obese patients",
                "Annual depression screening",
                "Limit alcohol to moderate intake"
            ]
        }
    ]
}


MEDICATION_GUIDELINES = {
    "guideline_id": "MEDS-T2DM-2024",
    "title": "Medication Reference for Type 2 Diabetes",
    "source": "Clinical Pharmacology Reference (Demo)",
    "version": "1.0",
    "medications": [
        {
            "class": "Biguanide",
            "generic": "Metformin",
            "mechanism": "Decreases hepatic glucose production, improves insulin sensitivity",
            "dosing": "500-1000mg BID with meals, max 2550mg/day",
            "benefits": ["No hypoglycemia", "Weight neutral/loss", "CV benefit", "Low cost"],
            "side_effects": ["GI upset", "B12 deficiency (long-term)", "Lactic acidosis (rare)"],
            "contraindications": ["eGFR <30", "Metabolic acidosis", "Before iodinated contrast"],
            "monitoring": ["eGFR annually", "B12 if symptoms"]
        },
        {
            "class": "SGLT2 Inhibitor",
            "examples": ["Empagliflozin", "Dapagliflozin", "Canagliflozin"],
            "mechanism": "Inhibits renal glucose reabsorption, causes glycosuria",
            "dosing": "Empagliflozin 10-25mg daily, Dapagliflozin 5-10mg daily",
            "benefits": ["CV benefit", "Renal protection", "Weight loss", "BP reduction", "No hypoglycemia"],
            "side_effects": ["Genital mycotic infections", "UTI", "Volume depletion", "Euglycemic DKA (rare)"],
            "contraindications": ["eGFR <25 (for glycemic effect)", "Recurrent DKA", "Type 1 diabetes"],
            "monitoring": ["eGFR", "Volume status", "Signs of DKA"]
        },
        {
            "class": "GLP-1 Receptor Agonist",
            "examples": ["Semaglutide", "Liraglutide", "Dulaglutide", "Tirzepatide"],
            "mechanism": "Enhances glucose-dependent insulin secretion, slows gastric emptying, reduces appetite",
            "dosing": "Semaglutide 0.25mg weekly → 0.5mg → 1mg → 2mg",
            "benefits": ["Significant weight loss", "CV benefit", "Renal benefit", "Low hypoglycemia risk"],
            "side_effects": ["Nausea", "Vomiting", "Diarrhea", "Pancreatitis (rare)"],
            "contraindications": ["Personal/family history MEN2 or medullary thyroid carcinoma", "Pancreatitis history"],
            "monitoring": ["GI tolerance", "Signs of pancreatitis", "Thyroid nodules"]
        },
        {
            "class": "Sulfonylurea",
            "examples": ["Glipizide", "Glyburide", "Glimepiride"],
            "mechanism": "Stimulates insulin secretion from pancreatic beta cells",
            "dosing": "Glipizide 5-20mg daily before meals",
            "benefits": ["Very effective A1c reduction", "Low cost", "Long track record"],
            "side_effects": ["Hypoglycemia", "Weight gain"],
            "contraindications": ["Severe renal/hepatic impairment", "Sulfa allergy (cross-reactivity rare but possible)"],
            "monitoring": ["Blood glucose", "Hypoglycemia symptoms", "Renal function"]
        },
        {
            "class": "DPP-4 Inhibitor",
            "examples": ["Sitagliptin", "Linagliptin", "Saxagliptin"],
            "mechanism": "Inhibits DPP-4 enzyme, increasing incretin levels",
            "dosing": "Sitagliptin 100mg daily (adjust for renal function)",
            "benefits": ["Weight neutral", "Low hypoglycemia", "Well tolerated"],
            "side_effects": ["Nasopharyngitis", "Headache", "Pancreatitis (rare)"],
            "contraindications": ["History of pancreatitis"],
            "monitoring": ["Renal function (for dose adjustment)"]
        }
    ]
}


def save_guidelines():
    """Save all guideline files to JSON."""
    guidelines_dir = Path("data/guidelines")
    guidelines_dir.mkdir(parents=True, exist_ok=True)
    
    files = [
        ("diabetes_guidelines.json", DIABETES_GUIDELINES),
        ("lifestyle_guidelines.json", LIFESTYLE_GUIDELINES),
        ("medication_guidelines.json", MEDICATION_GUIDELINES)
    ]
    
    for filename, data in files:
        filepath = guidelines_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {filename}")


def show_summary():
    """Display summary of created guidelines."""
    print("\n--- Guidelines Summary ---")
    print(f"Diabetes Guidelines: {len(DIABETES_GUIDELINES['sections'])} sections")
    print(f"Lifestyle Guidelines: {len(LIFESTYLE_GUIDELINES['sections'])} sections")
    print(f"Medication Guidelines: {len(MEDICATION_GUIDELINES['medications'])} medication classes")
    
    print("\n--- Section Titles ---")
    print("Diabetes Guidelines:")
    for section in DIABETES_GUIDELINES['sections']:
        print(f"  - {section['title']}")
    
    print("\nLifestyle Guidelines:")
    for section in LIFESTYLE_GUIDELINES['sections']:
        print(f"  - {section['title']}")


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 2: Create Clinical Guidelines Database")
    print("=" * 60)
    
    save_guidelines()
    show_summary()
    
    print("\n✓ Step 2 Complete!")
