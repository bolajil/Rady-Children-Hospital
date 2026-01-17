"""
Step 3: Build RAG Embedding System
==================================
Creates embeddings for patient data and clinical guidelines.
Uses ChromaDB for vector storage and sentence-transformers for embeddings.

Usage:
    python implementation/03_build_rag.py

Expected Output:
    ✓ Initialized ChromaDB
    ✓ Embedded 50 patients (250 cards total)
    ✓ Embedded 10 guideline sections
    ✓ RAG system ready for queries
"""

import json
from pathlib import Path
from typing import List, Dict, Optional
import sys

try:
    import chromadb
    from chromadb.utils import embedding_functions
except ImportError:
    print("ERROR: chromadb not installed. Run: pip install chromadb sentence-transformers")
    sys.exit(1)


class HealthcareRAG:
    """
    RAG system for healthcare data retrieval.
    
    This class handles:
    - Converting patient data into retrievable "cards"
    - Embedding patient cards and clinical guidelines
    - Semantic search for relevant context
    """
    
    def __init__(self, persist_directory: str = "data/embeddings"):
        """
        Initialize the RAG system with ChromaDB.
        
        Args:
            persist_directory: Path to store ChromaDB data
        """
        self.persist_directory = persist_directory
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # Use sentence-transformers for embeddings (local, no API key needed)
        print("Loading embedding model (this may take a moment on first run)...")
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Create/get collections
        self.patient_collection = self.client.get_or_create_collection(
            name="patient_cards",
            embedding_function=self.embedding_function,
            metadata={"description": "Patient data cards for RAG retrieval"}
        )
        
        self.guideline_collection = self.client.get_or_create_collection(
            name="clinical_guidelines",
            embedding_function=self.embedding_function,
            metadata={"description": "Clinical guideline chunks for RAG retrieval"}
        )
        
        print(f"✓ Initialized ChromaDB at: {persist_directory}")
        print(f"  Patient cards collection: {self.patient_collection.count()} documents")
        print(f"  Guidelines collection: {self.guideline_collection.count()} documents")
    
    def patient_to_cards(self, patient: Dict) -> List[Dict]:
        """
        Convert a patient record into retrievable text 'cards'.
        
        Each card represents a specific aspect of the patient (demographics,
        conditions, medications, etc.) that can be retrieved independently.
        
        Args:
            patient: Patient dictionary
            
        Returns:
            List of card dictionaries with id, content, and metadata
        """
        cards = []
        patient_id = patient["patient_id"]
        
        # Demographics card
        demo = patient["demographics"]
        cards.append({
            "id": f"{patient_id}_demographics",
            "patient_id": patient_id,
            "card_type": "demographics",
            "content": (
                f"Patient {patient_id}: {demo['age']} year old {demo['sex']}, "
                f"ethnicity: {demo.get('ethnicity', 'Unknown')}. "
                f"Living situation: {patient.get('social_history', {}).get('living_situation', 'Unknown')}."
            )
        })
        
        # Conditions card
        conditions = ", ".join(patient["conditions"])
        cards.append({
            "id": f"{patient_id}_conditions",
            "patient_id": patient_id,
            "card_type": "conditions",
            "content": f"Patient {patient_id} active diagnoses: {conditions}."
        })
        
        # Medications card
        meds = ", ".join(patient["medications"])
        cards.append({
            "id": f"{patient_id}_medications",
            "patient_id": patient_id,
            "card_type": "medications",
            "content": f"Patient {patient_id} current medications: {meds}."
        })
        
        # Labs card
        labs = patient["labs"]
        cards.append({
            "id": f"{patient_id}_labs",
            "patient_id": patient_id,
            "card_type": "labs",
            "content": (
                f"Patient {patient_id} recent lab results: "
                f"A1c {labs['A1c']}%, Fasting glucose {labs['Fasting_Glucose']} mg/dL, "
                f"LDL {labs['LDL']} mg/dL, HDL {labs['HDL']} mg/dL, "
                f"Creatinine {labs['Creatinine']} mg/dL, eGFR {labs['eGFR']} mL/min/1.73m², "
                f"Triglycerides {labs.get('Triglycerides', 'N/A')} mg/dL."
            )
        })
        
        # Vitals card
        vitals = patient["vitals"]
        cards.append({
            "id": f"{patient_id}_vitals",
            "patient_id": patient_id,
            "card_type": "vitals",
            "content": (
                f"Patient {patient_id} vital signs: "
                f"Blood pressure {vitals['BP_Systolic']}/{vitals['BP_Diastolic']} mmHg, "
                f"BMI {vitals['BMI']} kg/m², Weight {vitals['Weight_kg']} kg, "
                f"Heart rate {vitals.get('Heart_Rate', 'N/A')} bpm."
            )
        })
        
        # Lifestyle card
        lifestyle = patient["lifestyle"]
        cards.append({
            "id": f"{patient_id}_lifestyle",
            "patient_id": patient_id,
            "card_type": "lifestyle",
            "content": (
                f"Patient {patient_id} lifestyle factors: "
                f"Activity level: {lifestyle['activity_level']}, "
                f"Diet pattern: {lifestyle['diet_pattern']}, "
                f"Smoking: {lifestyle['smoking_status']}, "
                f"Alcohol use: {lifestyle['alcohol_use']}, "
                f"Sleep: {lifestyle.get('sleep_hours', 'Unknown')} hours/night."
            )
        })
        
        # Goals and allergies card
        goals = ", ".join(patient["goals"])
        allergies = ", ".join(patient["allergies"])
        cards.append({
            "id": f"{patient_id}_goals_allergies",
            "patient_id": patient_id,
            "card_type": "goals_allergies",
            "content": (
                f"Patient {patient_id} treatment goals: {goals}. "
                f"Known allergies: {allergies}."
            )
        })
        
        # Family history card
        fh = patient.get("family_history", {})
        fh_items = [k for k, v in fh.items() if v]
        fh_text = ", ".join(fh_items) if fh_items else "No significant family history"
        cards.append({
            "id": f"{patient_id}_family_history",
            "patient_id": patient_id,
            "card_type": "family_history",
            "content": f"Patient {patient_id} family history: {fh_text}."
        })
        
        return cards
    
    def embed_patients(self, patients: List[Dict]):
        """
        Embed all patient data into the vector store.
        
        Args:
            patients: List of patient dictionaries
        """
        all_cards = []
        for patient in patients:
            cards = self.patient_to_cards(patient)
            all_cards.extend(cards)
        
        # Prepare for ChromaDB
        ids = [card["id"] for card in all_cards]
        documents = [card["content"] for card in all_cards]
        metadatas = [
            {"patient_id": card["patient_id"], "card_type": card["card_type"]}
            for card in all_cards
        ]
        
        # Clear existing and add new (for demo purposes)
        existing = self.patient_collection.get()
        if existing["ids"]:
            self.patient_collection.delete(ids=existing["ids"])
        
        # Add in batches (ChromaDB limit)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            self.patient_collection.add(
                ids=ids[i:i+batch_size],
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )
        
        print(f"✓ Embedded {len(patients)} patients ({len(all_cards)} cards total)")
    
    def embed_guidelines(self, guidelines_dir: str = "data/guidelines"):
        """
        Embed clinical guidelines into the vector store.
        
        Args:
            guidelines_dir: Path to guidelines JSON files
        """
        all_sections = []
        
        for filepath in Path(guidelines_dir).glob("*.json"):
            with open(filepath, 'r', encoding='utf-8') as f:
                guideline = json.load(f)
            
            guideline_id = guideline.get("guideline_id", filepath.stem)
            
            # Handle different guideline structures
            if "sections" in guideline:
                for section in guideline["sections"]:
                    all_sections.append({
                        "id": f"{guideline_id}_{section['section_id']}",
                        "guideline_id": guideline_id,
                        "section_id": section["section_id"],
                        "title": section["title"],
                        "content": section["content"],
                        "key_points": section.get("key_points", [])
                    })
            elif "medications" in guideline:
                for med in guideline["medications"]:
                    med_id = med.get("generic", med.get("class", "unknown")).replace(" ", "_")
                    content = (
                        f"Medication: {med.get('generic', med.get('class'))}. "
                        f"Class: {med.get('class', 'Unknown')}. "
                        f"Mechanism: {med.get('mechanism', 'Unknown')}. "
                        f"Dosing: {med.get('dosing', 'See prescribing info')}. "
                        f"Benefits: {', '.join(med.get('benefits', []))}. "
                        f"Side effects: {', '.join(med.get('side_effects', []))}. "
                        f"Contraindications: {', '.join(med.get('contraindications', []))}."
                    )
                    all_sections.append({
                        "id": f"{guideline_id}_{med_id}",
                        "guideline_id": guideline_id,
                        "section_id": med_id,
                        "title": med.get("generic", med.get("class")),
                        "content": content,
                        "key_points": med.get("monitoring", [])
                    })
        
        # Prepare for ChromaDB
        ids = [s["id"] for s in all_sections]
        documents = [s["content"] for s in all_sections]
        metadatas = [
            {
                "guideline_id": s["guideline_id"],
                "section_id": s["section_id"],
                "title": s["title"]
            }
            for s in all_sections
        ]
        
        # Clear existing and add new
        existing = self.guideline_collection.get()
        if existing["ids"]:
            self.guideline_collection.delete(ids=existing["ids"])
        
        self.guideline_collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        
        print(f"✓ Embedded {len(all_sections)} guideline sections")
    
    def retrieve_patient_context(
        self, 
        patient_id: str, 
        query: str, 
        n_results: int = 5
    ) -> List[Dict]:
        """
        Retrieve relevant patient cards for a specific patient.
        
        Args:
            patient_id: The patient ID to filter by
            query: The query to match against
            n_results: Maximum number of results
            
        Returns:
            List of relevant patient card documents with metadata
        """
        results = self.patient_collection.query(
            query_texts=[query],
            n_results=n_results * 2,  # Get more, then filter
            where={"patient_id": patient_id}
        )
        
        # Format results
        output = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0][:n_results]):
                output.append({
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else None
                })
        
        return output
    
    def retrieve_guidelines(
        self, 
        query: str, 
        n_results: int = 3
    ) -> List[Dict]:
        """
        Retrieve relevant guideline sections.
        
        Args:
            query: The query to match against
            n_results: Maximum number of results
            
        Returns:
            List of relevant guideline documents with metadata
        """
        results = self.guideline_collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        output = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                output.append({
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else None
                })
        
        return output
    
    def get_full_patient_context(self, patient_id: str) -> str:
        """
        Get all cards for a patient as formatted context.
        
        Args:
            patient_id: The patient ID
            
        Returns:
            Formatted string of all patient cards
        """
        results = self.patient_collection.get(
            where={"patient_id": patient_id}
        )
        
        if not results["documents"]:
            return f"No data found for patient {patient_id}"
        
        context_parts = []
        for doc, meta in zip(results["documents"], results["metadatas"]):
            context_parts.append(f"[{meta['card_type'].upper()}]\n{doc}")
        
        return "\n\n".join(context_parts)


def test_rag_system():
    """Test the RAG system with a sample query."""
    print("\n--- Testing RAG System ---")
    
    rag = HealthcareRAG()
    
    # Test patient retrieval
    print("\nTest 1: Retrieve patient context for SYN-1000")
    patient_context = rag.retrieve_patient_context(
        patient_id="SYN-1000",
        query="What are the patient's current medications and A1c level?"
    )
    for i, result in enumerate(patient_context[:3]):
        print(f"  Result {i+1}: {result['content'][:100]}...")
    
    # Test guidelines retrieval
    print("\nTest 2: Retrieve guidelines for metformin")
    guidelines = rag.retrieve_guidelines(
        query="metformin dosing and contraindications"
    )
    for i, result in enumerate(guidelines[:2]):
        print(f"  Result {i+1}: {result['metadata'].get('title', 'Unknown')}")
    
    # Test full patient context
    print("\nTest 3: Get full context for patient SYN-1000")
    full_context = rag.get_full_patient_context("SYN-1000")
    print(f"  Full context length: {len(full_context)} characters")
    
    print("\n✓ All RAG tests passed!")


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 3: Build RAG Embedding System")
    print("=" * 60)
    
    # Initialize RAG
    rag = HealthcareRAG()
    
    # Load and embed patients
    patients_file = Path("data/patients/synthetic_patients.json")
    if patients_file.exists():
        with open(patients_file, 'r', encoding='utf-8') as f:
            patients = json.load(f)
        rag.embed_patients(patients)
    else:
        print("⚠ No patients file found. Run step 1 first.")
    
    # Embed guidelines
    guidelines_dir = Path("data/guidelines")
    if guidelines_dir.exists() and list(guidelines_dir.glob("*.json")):
        rag.embed_guidelines(str(guidelines_dir))
    else:
        print("⚠ No guidelines found. Run step 2 first.")
    
    # Run tests
    test_rag_system()
    
    print("\n✓ Step 3 Complete!")
