from datetime import date, datetime
from app.models.patient import Patient, HealthRecord, Vitals, Medication, Diagnosis

# Sample Patients
SAMPLE_PATIENTS = [
    Patient(
        id="P001",
        mrn="MRN-2024-001",
        first_name="Emma",
        last_name="Johnson",
        date_of_birth=date(2018, 5, 15),
        age=6,
        gender="Female",
        phone="(555) 123-4567",
        email="emma.parent@example.com",
        address="123 Main St, San Diego, CA 92101",
        emergency_contact={
            "name": "Sarah Johnson",
            "relationship": "Mother",
            "phone": "(555) 123-4567"
        }
    ),
    Patient(
        id="P002",
        mrn="MRN-2024-002",
        first_name="Liam",
        last_name="Martinez",
        date_of_birth=date(2020, 8, 22),
        age=4,
        gender="Male",
        phone="(555) 234-5678",
        email="liam.parent@example.com",
        address="456 Oak Ave, San Diego, CA 92102",
        emergency_contact={
            "name": "Maria Martinez",
            "relationship": "Mother",
            "phone": "(555) 234-5678"
        }
    ),
    Patient(
        id="P003",
        mrn="MRN-2024-003",
        first_name="Sophia",
        last_name="Chen",
        date_of_birth=date(2015, 3, 10),
        age=9,
        gender="Female",
        phone="(555) 345-6789",
        email="sophia.parent@example.com",
        address="789 Pine Rd, San Diego, CA 92103",
        emergency_contact={
            "name": "Wei Chen",
            "relationship": "Father",
            "phone": "(555) 345-6789"
        }
    ),
    Patient(
        id="P004",
        mrn="MRN-2024-004",
        first_name="Noah",
        last_name="Williams",
        date_of_birth=date(2022, 11, 5),
        age=2,
        gender="Male",
        phone="(555) 456-7890",
        email="noah.parent@example.com",
        address="321 Elm St, San Diego, CA 92104",
        emergency_contact={
            "name": "Jennifer Williams",
            "relationship": "Mother",
            "phone": "(555) 456-7890"
        }
    ),
    Patient(
        id="P005",
        mrn="MRN-2024-005",
        first_name="Olivia",
        last_name="Brown",
        date_of_birth=date(2017, 7, 18),
        age=7,
        gender="Female",
        phone="(555) 567-8901",
        email="olivia.parent@example.com",
        address="654 Maple Dr, San Diego, CA 92105",
        emergency_contact={
            "name": "Michael Brown",
            "relationship": "Father",
            "phone": "(555) 567-8901"
        }
    ),
]

# Sample Health Records
SAMPLE_HEALTH_RECORDS = {
    "P001": HealthRecord(
        patient_id="P001",
        vitals=Vitals(
            height="115 cm",
            weight="20 kg",
            blood_pressure="95/60 mmHg",
            heart_rate="85 bpm",
            temperature="98.6°F",
            respiratory_rate="20 breaths/min",
            oxygen_saturation="99%",
            last_updated="2024-11-28"
        ),
        medications=[
            Medication(
                name="Amoxicillin",
                dosage="250mg",
                frequency="3x daily",
                start_date="2024-11-20",
                end_date="2024-11-30",
                prescriber="Dr. Sarah Smith",
                status="active"
            )
        ],
        allergies=["Penicillin", "Peanuts"],
        diagnoses=[
            Diagnosis(
                condition="Acute Otitis Media",
                date="2024-11-20",
                status="Active",
                icd_code="H66.90"
            )
        ],
        immunizations=[
            {"vaccine": "DTaP", "date": "2024-05-15", "dose": "5th"},
            {"vaccine": "MMR", "date": "2023-05-15", "dose": "2nd"},
            {"vaccine": "Varicella", "date": "2023-05-15", "dose": "2nd"}
        ],
        lab_results=[
            {"test": "CBC", "date": "2024-11-20", "result": "Normal", "status": "completed"}
        ],
        visit_history=[
            {"date": "2024-11-20", "reason": "Ear pain", "provider": "Dr. Sarah Smith", "diagnosis": "Acute Otitis Media"}
        ]
    ),
    "P002": HealthRecord(
        patient_id="P002",
        vitals=Vitals(
            height="105 cm",
            weight="16 kg",
            blood_pressure="90/55 mmHg",
            heart_rate="90 bpm",
            temperature="98.4°F",
            respiratory_rate="22 breaths/min",
            oxygen_saturation="98%",
            last_updated="2024-11-25"
        ),
        medications=[],
        allergies=["None known"],
        diagnoses=[
            Diagnosis(
                condition="Well Child Visit",
                date="2024-11-25",
                status="Resolved",
                icd_code="Z00.129"
            )
        ],
        immunizations=[
            {"vaccine": "DTaP", "date": "2024-08-22", "dose": "4th"},
            {"vaccine": "IPV", "date": "2024-08-22", "dose": "4th"},
            {"vaccine": "MMR", "date": "2024-08-22", "dose": "1st"}
        ],
        lab_results=[],
        visit_history=[
            {"date": "2024-11-25", "reason": "Annual checkup", "provider": "Dr. James Lee", "diagnosis": "Healthy"}
        ]
    ),
    "P003": HealthRecord(
        patient_id="P003",
        vitals=Vitals(
            height="135 cm",
            weight="30 kg",
            blood_pressure="100/65 mmHg",
            heart_rate="75 bpm",
            temperature="98.7°F",
            respiratory_rate="18 breaths/min",
            oxygen_saturation="99%",
            last_updated="2024-11-15"
        ),
        medications=[
            Medication(
                name="Albuterol Inhaler",
                dosage="90 mcg",
                frequency="As needed",
                start_date="2023-03-10",
                prescriber="Dr. Emily Rodriguez",
                status="active"
            )
        ],
        allergies=["Dust mites", "Cat dander"],
        diagnoses=[
            Diagnosis(
                condition="Asthma, mild persistent",
                date="2023-03-10",
                status="Active",
                icd_code="J45.30"
            )
        ],
        immunizations=[
            {"vaccine": "Tdap", "date": "2024-03-10", "dose": "1st"},
            {"vaccine": "HPV", "date": "2024-03-10", "dose": "1st"},
            {"vaccine": "Flu", "date": "2024-10-15", "dose": "Annual"}
        ],
        lab_results=[
            {"test": "Spirometry", "date": "2024-11-15", "result": "FEV1 85%", "status": "completed"}
        ],
        visit_history=[
            {"date": "2024-11-15", "reason": "Asthma follow-up", "provider": "Dr. Emily Rodriguez", "diagnosis": "Asthma controlled"}
        ]
    ),
    "P004": HealthRecord(
        patient_id="P004",
        vitals=Vitals(
            height="88 cm",
            weight="12 kg",
            blood_pressure="85/50 mmHg",
            heart_rate="100 bpm",
            temperature="98.5°F",
            respiratory_rate="24 breaths/min",
            oxygen_saturation="99%",
            last_updated="2024-11-28"
        ),
        medications=[],
        allergies=["None known"],
        diagnoses=[
            Diagnosis(
                condition="Upper Respiratory Infection",
                date="2024-11-28",
                status="Active",
                icd_code="J06.9"
            )
        ],
        immunizations=[
            {"vaccine": "DTaP", "date": "2024-05-05", "dose": "3rd"},
            {"vaccine": "IPV", "date": "2024-05-05", "dose": "3rd"},
            {"vaccine": "Hib", "date": "2024-05-05", "dose": "3rd"}
        ],
        lab_results=[],
        visit_history=[
            {"date": "2024-11-28", "reason": "Cough and runny nose", "provider": "Dr. Sarah Smith", "diagnosis": "URI"}
        ]
    ),
    "P005": HealthRecord(
        patient_id="P005",
        vitals=Vitals(
            height="122 cm",
            weight="24 kg",
            blood_pressure="98/62 mmHg",
            heart_rate="80 bpm",
            temperature="98.6°F",
            respiratory_rate="19 breaths/min",
            oxygen_saturation="99%",
            last_updated="2024-11-10"
        ),
        medications=[],
        allergies=["Shellfish"],
        diagnoses=[
            Diagnosis(
                condition="Seasonal Allergies",
                date="2024-04-15",
                status="Active",
                icd_code="J30.2"
            )
        ],
        immunizations=[
            {"vaccine": "DTaP", "date": "2022-07-18", "dose": "5th"},
            {"vaccine": "MMR", "date": "2021-07-18", "dose": "2nd"},
            {"vaccine": "Flu", "date": "2024-10-10", "dose": "Annual"}
        ],
        lab_results=[
            {"test": "Allergy Panel", "date": "2024-04-15", "result": "Positive for pollen", "status": "completed"}
        ],
        visit_history=[
            {"date": "2024-11-10", "reason": "Annual checkup", "provider": "Dr. James Lee", "diagnosis": "Healthy"}
        ]
    ),
}

def get_all_patients():
    return SAMPLE_PATIENTS

def get_patient_by_id(patient_id: str):
    for patient in SAMPLE_PATIENTS:
        if patient.id == patient_id:
            return patient
    return None

def get_health_record(patient_id: str):
    return SAMPLE_HEALTH_RECORDS.get(patient_id)

def search_patients(query: str):
    query = query.lower()
    results = []
    for patient in SAMPLE_PATIENTS:
        if (query in patient.first_name.lower() or 
            query in patient.last_name.lower() or 
            query in patient.mrn.lower()):
            results.append(patient)
    return results
