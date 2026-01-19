# Secure RAG System - HIPAA-Compliant Document Retrieval

This guide explains how to connect your healthcare database (EHR, PACS, Lab systems) to the Rady GenAI application **without exposing PHI to external LLMs**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YOUR SECURE ENVIRONMENT                              │
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐                │
│  │   PHI       │───►│  Ingestion   │───►│  ChromaDB       │                │
│  │  Database   │    │  Pipeline    │    │  (Local Vector  │                │
│  │  (EHR/PACS) │    │  + Chunking  │    │   Storage)      │                │
│  └─────────────┘    └──────────────┘    └────────┬────────┘                │
│                                                   │                         │
│                     LOCAL EMBEDDINGS              │                         │
│                     (sentence-transformers)       │                         │
│                     PHI NEVER LEAVES              │                         │
│                                                   │                         │
│  ┌─────────────┐    ┌──────────────┐    ┌────────▼────────┐                │
│  │   User      │───►│  PHI         │───►│  RAG            │                │
│  │   Query     │    │  Guardrail   │    │  Retriever      │                │
│  └─────────────┘    └──────────────┘    └────────┬────────┘                │
│                                                   │                         │
│                           Retrieved Context (PHI REDACTED)                  │
└───────────────────────────────────────────────────┼─────────────────────────┘
                                                    │
                                                    ▼
                              ┌──────────────────────────────────┐
                              │     External LLM (OpenAI)        │
                              │                                  │
                              │   Receives ONLY:                 │
                              │   ✓ Redacted context             │
                              │   ✓ Sanitized query              │
                              │   ✗ NO raw PHI ever leaves       │
                              └──────────────────────────────────┘
```

---

## Key Security Features

| Feature | Description |
|---------|-------------|
| **Local Embeddings** | Uses `sentence-transformers` model running locally. PHI never sent to external embedding APIs. |
| **PHI Redaction** | All retrieved content is automatically redacted before being sent to external LLM. |
| **Patient ID Hashing** | Patient IDs are SHA-256 hashed before storage - original IDs not stored. |
| **Local Vector Store** | ChromaDB runs in Docker on your infrastructure. No cloud vector DB. |
| **Audit Logging** | All document access is logged for HIPAA compliance. |

---

## Local Deployment Setup

### Step 1: Start the Services

```bash
cd ~/.gemini/antigravity/scratch/rady-genai
docker-compose up -d
```

This starts:
- **ChromaDB** on port 8001 (vector database)
- **Backend** with RAG integration
- All other services (frontend, LangFuse, etc.)

### Step 2: Verify RAG System

```bash
# Check RAG health
curl http://localhost:8000/rag/health
```

Expected response:
```json
{
  "status": "healthy",
  "total_documents": 0,
  "embedding_model": "all-MiniLM-L6-v2"
}
```

### Step 3: Load Sample Documents (for testing)

```bash
curl -X POST http://localhost:8000/rag/load-samples
```

This loads synthetic (non-real) patient records for demonstration.

### Step 4: Test RAG Query

```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are common symptoms of pneumonia?"}'
```

---

## API Endpoints

### Document Ingestion

#### Ingest Single Document
```bash
POST /rag/ingest
```

Request body:
```json
{
  "content": "Patient clinical note content...",
  "document_id": "DOC-12345",
  "source": "EHR",
  "patient_id": "PT-67890",
  "document_type": "clinical_note"
}
```

#### Batch Ingestion
```bash
POST /rag/ingest/batch
```

Request body:
```json
{
  "documents": [
    {"content": "...", "source": "EHR", "patient_id": "PT-001"},
    {"content": "...", "source": "Lab", "patient_id": "PT-002"}
  ]
}
```

#### File Upload
```bash
POST /rag/ingest/file
```

Supports: `.txt`, `.pdf`, `.json`

```bash
curl -X POST http://localhost:8000/rag/ingest/file \
  -F "file=@clinical_note.pdf" \
  -F "source=EHR" \
  -F "patient_id=PT-12345"
```

### Querying

#### Query RAG System
```bash
POST /rag/query
```

Request body:
```json
{
  "query": "What medications is the patient on?",
  "patient_id": "PT-12345",
  "n_results": 5,
  "include_sources": true
}
```

Response:
```json
{
  "context": "[Source 1: EHR - clinical_note]\n[PATIENT_NAME] presents with...",
  "num_results": 3,
  "sources": [
    {"index": 1, "source": "EHR", "document_type": "clinical_note", "relevance_score": 0.89}
  ],
  "message": "Query completed successfully"
}
```

### System Stats
```bash
GET /rag/stats
```

---

## Connecting Your Database

### Option 1: Direct API Integration

Create a script that extracts data from your EHR and sends to the ingestion API:

```python
import requests
from your_ehr_system import get_patient_records

def ingest_patient_records():
    records = get_patient_records()
    
    for record in records:
        response = requests.post(
            "http://localhost:8000/rag/ingest",
            json={
                "content": record["note_text"],
                "document_id": record["note_id"],
                "source": "EHR",
                "patient_id": record["patient_id"],
                "document_type": record["note_type"]
            }
        )
        print(f"Ingested {record['note_id']}: {response.json()}")

ingest_patient_records()
```

### Option 2: Batch ETL Pipeline

For large-scale ingestion, use the batch endpoint:

```python
import requests

def batch_ingest(records, batch_size=100):
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        
        documents = [
            {
                "content": r["text"],
                "document_id": r["id"],
                "source": r["source"],
                "patient_id": r["patient_id"],
                "document_type": r["type"]
            }
            for r in batch
        ]
        
        response = requests.post(
            "http://localhost:8000/rag/ingest/batch",
            json={"documents": documents}
        )
        
        result = response.json()
        print(f"Batch {i//batch_size + 1}: {result['total_chunks']} chunks created")
```

### Option 3: File-Based Ingestion

For document files (PDFs, clinical notes):

```bash
# Ingest all PDFs in a directory
for file in /path/to/documents/*.pdf; do
  curl -X POST http://localhost:8000/rag/ingest/file \
    -F "file=@$file" \
    -F "source=PACS" \
    -F "document_type=radiology_report"
done
```

---

## Supported Document Types

| Source | Document Types | Description |
|--------|---------------|-------------|
| **EHR** | `clinical_note`, `progress_note`, `discharge_summary` | Electronic health records |
| **PACS** | `radiology_report`, `ct_scan`, `mri_report` | Medical imaging reports |
| **Lab** | `lab_result`, `pathology_report` | Laboratory findings |
| **Pharmacy** | `medication_list`, `prescription` | Medication records |
| **Nursing** | `nursing_note`, `vital_signs` | Nursing documentation |

---

## AWS Cloud Deployment

For AWS deployment, the architecture changes to use managed services:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS VPC (Private)                          │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │  RDS        │───►│  Lambda      │───►│  RDS PostgreSQL │    │
│  │  (Source)   │    │  (ETL)       │    │  + pgvector     │    │
│  └─────────────┘    └──────────────┘    └────────┬────────┘    │
│                                                   │              │
│                     Amazon Bedrock                │              │
│                     (Embeddings - data stays     │              │
│                      in AWS)                      │              │
│                                                   │              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────▼────────┐    │
│  │  ECS        │───►│  PHI         │───►│  RAG            │    │
│  │  Backend    │    │  Guardrail   │    │  Retriever      │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Amazon Bedrock / OpenAI
                    (Redacted context only)
```

### Key AWS Components

| Component | Service | Purpose |
|-----------|---------|---------|
| Vector Store | RDS PostgreSQL + pgvector | Vector storage with encryption |
| Embeddings | Amazon Bedrock | Data stays in AWS |
| Secrets | AWS Secrets Manager | API keys and credentials |
| Encryption | KMS | Encrypt data at rest |
| Network | VPC Private Subnets | No public access to data |

---

## Security Best Practices

### 1. Network Isolation
- Keep ChromaDB in private network
- No direct internet access to vector store
- Use VPN for remote access

### 2. Access Control
- Implement role-based access to ingestion APIs
- Log all document access for audit
- Regular access reviews

### 3. Data Encryption
- Enable TLS for all API calls
- Encrypt ChromaDB volume at rest
- Use encrypted connections to source databases

### 4. PHI Handling
- Always use the PHI guardrail
- Never log raw PHI
- Hash all patient identifiers

---

## Troubleshooting

### ChromaDB Connection Failed
```bash
# Check if ChromaDB is running
docker ps | grep chromadb

# Check ChromaDB logs
docker logs rady-genai-chromadb-1
```

### Embeddings Model Not Loading
```bash
# Check backend logs
docker logs rady-genai-backend-1 | grep -i embedding

# The first load may take 1-2 minutes to download the model
```

### RAG Not Returning Results
```bash
# Check document count
curl http://localhost:8000/rag/stats

# If 0 documents, load samples:
curl -X POST http://localhost:8000/rag/load-samples
```

---

## Performance Tuning

| Parameter | Default | Description |
|-----------|---------|-------------|
| `chunk_size` | 500 | Characters per chunk |
| `chunk_overlap` | 50 | Overlap between chunks |
| `n_results` | 5 | Documents to retrieve |
| `embedding_model` | `all-MiniLM-L6-v2` | Fast, 384-dim embeddings |

For better accuracy, consider:
- `all-mpnet-base-v2` - Higher quality, 768 dimensions
- `pritamdeka/S-PubMedBert-MS-MARCO` - Medical domain-specific

---

## Summary

| Environment | Vector Store | Embeddings | PHI Safety |
|-------------|--------------|------------|------------|
| **Local (Docker)** | ChromaDB | sentence-transformers (local) | PHI redacted before LLM |
| **AWS Cloud** | RDS + pgvector | Amazon Bedrock | PHI redacted, stays in AWS |

**Key Guarantee:** PHI never leaves your infrastructure when connecting to external LLMs.
