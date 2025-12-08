# Rady Children's Health GenAI Agent

A secure, HIPAA-compliant GenAI agent for pediatric healthcare with RAG (Retrieval-Augmented Generation) capabilities, built with FastAPI, LangChain, and Next.js.

**Version:** v1.2.0

---

## 🚀 Quick Start

### Option 1: Pull from DockerHub (Easiest)
```bash
# Pull pre-built images
docker pull bolajil/rady-backend:v1.2.0
docker pull bolajil/rady-frontend:v1.2.0

# Create .env file
echo "OPENAI_API_KEY=your-key-here" > .env

# Run
docker-compose -f docker-compose.prod.yml up
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation (Swagger): http://localhost:8000/docs

### Option 2: Build Locally
```bash
# Clone repository
git clone https://github.com/bolajil/rady-genai.git
cd rady-genai

# Build and run
docker-compose up --build
```

---

## 📁 Project Structure

```
rady-genai/
├── backend/              # FastAPI + LangChain + RAG
│   ├── app/
│   │   ├── main.py       # API entry point
│   │   ├── agent.py      # LangChain agent with tools
│   │   ├── vector_store.py  # FAISS vector database
│   │   └── rag_tool.py   # RAG search tool
│   ├── data/
│   │   ├── documents/    # Medical documents for RAG
│   │   └── vector_store/ # FAISS index
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # Next.js application
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml     # Development
├── docker-compose.prod.yml # Production
└── README.md
```

---

## ⚙️ Configuration

### Environment variables
- `OPENAI_API_KEY` (required) — backend uses this for model access.
- Optional variables can be added to `backend/.env.example` and mirrored in your local `.env`.

### Changing the “Call Clinic” phone button
The green phone button shown in the sidebar dials **Rady Children's Hospital: 858-576-1700**.

To change it:
- Sidebar button: `frontend/app/components/Sidebar.tsx`
  - Look for the anchor with `href="tel:+18585761700"` and update the number.
- Reusable mobile button: `frontend/app/components/MobileCallButton.tsx`
  - Pass `phoneNumber` and `label` props where used, or change the default values in the component.

After editing, restart the frontend dev server for changes to reflect.

---

## 👤 Demo Login Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Owner (Admin)** | owner@example.com | ownerpass | Full access (Admin, EHR, Chat, Appointments) |
| **Doctor** | doctor@example.com | doctorpass | EHR, Chat, Appointments |
| **Patient (Emma)** | emma.parent@example.com | patient1 | Chat, Appointments only |
| **Patient (Liam)** | liam.parent@example.com | patient2 | Chat, Appointments only |

### Role-Based Access Control

| Page | Owner | Doctor | Patient |
|------|-------|--------|---------|
| Admin Dashboard | ✅ | ❌ | ❌ |
| HIPAA Compliance | ✅ | ❌ | ❌ |
| Health Records (EHR) | ✅ | ✅ | ❌ |
| Chat | ✅ | ✅ | ✅ |
| Appointments | ✅ | ✅ | ✅ |

---

## 🏥 Features

### AI Agent Capabilities
- **Multi-Tool LangChain Agent** with GPT-4
- **RAG Search** - Semantic search over medical knowledge base
- **Patient Information Lookup** (FHIR-ready)
- **Medication Database** - Drug information and dosing
- **HIPAA-Compliant Logging** - All access tracked

### RAG (Retrieval-Augmented Generation)
- **FAISS Vector Database** - Local, fast similarity search
- **OpenAI Embeddings** - High-quality semantic understanding
- **Document Management** - Upload PDFs and text files
- **Automated Loading** - Batch process medical literature

### Security & Compliance
- ✅ Non-root Docker containers
- ✅ Health checks and monitoring
- ✅ Audit logging for all patient data access
- ✅ Environment-based secrets management
- ✅ HIPAA compliance considerations

### HIPAA Compliance Dashboard (Admin Only)
- **Audit Logging** - All PHI access tracked with timestamps
- **Violation Detection** - Automatic flagging of suspicious activity
- **Real-time Monitoring** - View access events as they happen
- **Severity Classification** - Critical, High, Medium, Low

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - High-performance async API framework
- **LangChain** - AI agent orchestration
- **OpenAI GPT-4** - Medical reasoning and chat
- **FAISS** - Vector database for RAG
- **OpenAI Embeddings** - Document embeddings (1536-dim)
- **Python 3.11** - Modern Python features

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React** - Component-based UI

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **DockerHub** - Image registry (bolajil/rady-*)
- **GitHub** - Source control

---

## 📊 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/chat` | Chat with AI agent |
| POST | `/chat/stream` | Streaming chat (SSE) |
| POST | `/feedback` | Submit feedback (thumbs up/down) |
| GET | `/feedback` | Get all feedback |

### EHR Endpoints (Requires Owner/Doctor role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ehr/patients` | Get all patients |
| GET | `/ehr/patients/{id}` | Get specific patient |
| GET | `/ehr/patients/search?q=` | Search patients |

### Appointments Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | Get all appointments |
| GET | `/appointments/patient/{id}` | Get appointments for patient |

### API Testing (JSON Bodies)

**POST /chat:**
```json
{
  "query": "What is the correct acetaminophen dose for a 25-pound toddler?",
  "session_id": "demo-001"
}
```

**POST /chat/stream:**
```json
{
  "query": "What are the signs of an ear infection in toddlers?",
  "session_id": "demo-001"
}
```

**POST /feedback:**
```json
{
  "conversation_id": "demo-001",
  "message_index": 1,
  "question": "What is the correct acetaminophen dose?",
  "answer": "For a 25-pound toddler...",
  "rating": "up",
  "timestamp": "2024-12-03T10:00:00Z"
}
```

### Interactive Documentation
Visit http://localhost:8000/docs when running for full API documentation with "Try it out" functionality.

---

## 🚢 Deployment

### Deploy to DockerHub

**PowerShell:**
```powershell
# Login to DockerHub
docker login

# Run deployment script
.\deploy-dockerhub.ps1 v1.0.0
```

**Git Bash:**
```bash
# Login to DockerHub
docker login

# Run deployment script
./deploy-dockerhub.sh v1.0.0
```

### Deploy to GitHub

**PowerShell:**
```powershell
# Run deployment script
.\deploy-github.ps1 https://github.com/bolajil/rady-genai.git
```

**Git Bash:**
```bash
# Run deployment script (use PowerShell for this script)
powershell.exe -File ./deploy-github.ps1 https://github.com/bolajil/rady-genai.git
```

### Infrastructure Links
- **DockerHub**: https://hub.docker.com/u/bolajil
  - `bolajil/rady-backend:latest`
  - `bolajil/rady-frontend:latest`
- **GitHub**: https://github.com/bolajil/rady-genai

---

## 🧪 Testing

### Backend Testing

**PowerShell:**
```powershell
cd backend
.\venv\Scripts\activate

# Check dependencies
python check_dependencies.py

# Test setup
python test_setup.py

# Run API tests
python test_api.py
```

**Git Bash:**
```bash
cd backend
source venv/Scripts/activate

# Check dependencies
python check_dependencies.py

# Test setup
python test_setup.py

# Run API tests
python test_api.py
```

### Load Medical Documents

**PowerShell:**
```powershell
cd backend
.\venv\Scripts\activate

# Place documents in data/documents/
# Then load them:
python load_documents.py

# Or watch for new files:
python load_documents.py --watch
```

**Git Bash:**
```bash
cd backend
source venv/Scripts/activate

# Place documents in data/documents/
# Then load them:
python load_documents.py

# Or watch for new files:
python load_documents.py --watch
```

---

## 📝 Configuration

### Environment Variables

Create `backend/.env`:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

Without this key:
- Agent runs in **mock mode** with limited functionality
- RAG embeddings will not work
- Get your key: https://platform.openai.com/api-keys

---

## 🔍 RAG Knowledge Base

### Adding Medical Documents
```bash
# 1. Place PDFs or TXT files in:
backend/data/documents/

# 2. Load them:
cd backend
python load_documents.py
```

### Search the Knowledge Base
```bash
# Via API
curl -X POST http://localhost:8000/kb/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pediatric asthma treatment", "num_results": 5}'

# Via Agent
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Search the knowledge base for asthma guidelines"}'
```

---

## 🏃 Development

### Local Development (No Docker)

**Backend (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Backend (Git Bash):**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (Both):**
```bash
cd frontend
npm install
npm run dev
```

### With Docker (Recommended)
```bash
docker-compose up --build
```

---

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **ReDoc**: http://localhost:8000/redoc (alternative API docs)

---

## 🤝 Contributing

This project is for Rady Children's Health. For contributions:
1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

---

## 🔒 Security Notes

- Never commit `.env` files
- Rotate API keys regularly
- Use Docker secrets in production
- Enable audit logging for PHI access
- Follow HIPAA guidelines for deployment

---

## 🏥 HIPAA Compliance Implementation

### Current Implementation (Demo/Development)

The application includes a HIPAA compliance system with:

| Component | Location | Description |
|-----------|----------|-------------|
| Audit Logger | `backend/app/audit.py` | Tracks all PHI access events |
| Compliance API | `backend/app/routers/compliance.py` | Admin endpoints for audit data |
| Compliance Dashboard | `frontend/app/compliance/page.tsx` | Visual dashboard for admins |

### Violation Detection (Automatic)

| Violation Type | Severity | Trigger |
|----------------|----------|---------|
| Unauthorized Access | HIGH | Invalid credentials or permissions |
| After-Hours Access | LOW | PHI access outside 7 AM - 7 PM |
| Bulk Data Access | HIGH | Accessing 10+ patients in 10 minutes |
| Excessive Queries | MEDIUM | More than 20 accesses per hour |
| Cross-Patient Access | CRITICAL | Patient viewing another patient's data |

### Testing the Compliance Dashboard

1. Login as **owner** (`owner@example.com` / `ownerpass`)
2. Click **"HIPAA Compliance"** in sidebar
3. Click **"Generate Sample Events (Demo)"** to create test violations
4. View violations by severity and full audit log

---

## 🚀 Production Deployment Guide

### Step 1: Database Setup (Replace In-Memory Storage)

**PostgreSQL Schema for Audit Logs:**

```sql
-- Create audit log table (append-only, no updates/deletes)
CREATE TABLE hipaa_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    patient_id VARCHAR(100),
    ip_address INET,
    details JSONB,
    is_violation BOOLEAN DEFAULT FALSE,
    violation_severity VARCHAR(20),
    violation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_audit_timestamp ON hipaa_audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON hipaa_audit_log(user_id);
CREATE INDEX idx_audit_patient ON hipaa_audit_log(patient_id);
CREATE INDEX idx_audit_violations ON hipaa_audit_log(is_violation) WHERE is_violation = TRUE;

-- Prevent modifications (trigger to block UPDATE/DELETE)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'HIPAA audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_audit_updates
    BEFORE UPDATE OR DELETE ON hipaa_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Partition by month for performance (optional)
-- CREATE TABLE hipaa_audit_log_2024_12 PARTITION OF hipaa_audit_log
--     FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

### Step 2: Environment Configuration

**Production `.env` file:**

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/rady_db

# OpenAI
OPENAI_API_KEY=sk-your-production-key

# Security
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRY_HOURS=8

# HIPAA Compliance
HIPAA_AUDIT_ENABLED=true
HIPAA_LOG_RETENTION_YEARS=6
HIPAA_ALERT_EMAIL=compliance@radychildrens.org

# Alerting (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
ALERT_EMAIL_FROM=noreply@radychildrens.org

# Cloud Provider (choose one)
AWS_REGION=us-west-2
# or
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

### Step 3: Cloud Provider Setup

#### Option A: AWS (Recommended)

```bash
# 1. Request BAA (Business Associate Agreement)
# Go to: AWS Artifact → Agreements → Accept HIPAA BAA

# 2. Create RDS PostgreSQL (HIPAA-eligible)
aws rds create-db-instance \
    --db-instance-identifier rady-hipaa-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --storage-encrypted \
    --kms-key-id alias/aws/rds \
    --master-username admin \
    --master-user-password <secure-password>

# 3. Enable CloudTrail for API logging
aws cloudtrail create-trail \
    --name rady-hipaa-trail \
    --s3-bucket-name rady-audit-logs \
    --is-multi-region-trail \
    --enable-log-file-validation

# 4. Deploy with ECS/Fargate
# See docker-compose.aws.yml for configuration
```

#### Option B: Azure

```bash
# 1. Accept HIPAA BAA
# Go to: Azure Portal → Compliance → Regulatory Compliance

# 2. Create Azure SQL Database
az sql server create \
    --name rady-hipaa-server \
    --resource-group rady-rg \
    --location westus2 \
    --admin-user admin \
    --admin-password <secure-password>

# 3. Enable transparent data encryption (TDE)
az sql db tde set \
    --database rady-db \
    --server rady-hipaa-server \
    --resource-group rady-rg \
    --status Enabled

# 4. Deploy with Azure Container Apps
# See docker-compose.azure.yml for configuration
```

### Step 4: Real-Time Alerting Setup

**Add to `backend/app/audit.py`:**

```python
import smtplib
from email.mime.text import MIMEText

def send_violation_alert(event: AuditEvent):
    """Send email alert for critical violations."""
    if event.violation_severity not in ['critical', 'high']:
        return
    
    msg = MIMEText(f'''
HIPAA Violation Alert

Severity: {event.violation_severity.upper()}
Time: {event.timestamp}
User: {event.user_email} ({event.user_role})
Resource: {event.resource_type}/{event.resource_id}
Patient: {event.patient_id}

Reason: {event.violation_reason}

Please investigate immediately.
    ''')
    
    msg['Subject'] = f'[HIPAA ALERT] {event.violation_severity.upper()} Violation Detected'
    msg['From'] = os.getenv('ALERT_EMAIL_FROM')
    msg['To'] = os.getenv('HIPAA_ALERT_EMAIL')
    
    with smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT'))) as server:
        server.starttls()
        server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASSWORD'))
        server.send_message(msg)
```

### Step 5: Compliance Checklist

#### Technical Requirements

- [ ] **Encryption at Rest** - AES-256 for all databases
- [ ] **Encryption in Transit** - TLS 1.3 for all connections
- [ ] **Access Logging** - All PHI access tracked
- [ ] **Audit Log Retention** - 6 years minimum
- [ ] **Immutable Logs** - No modification/deletion allowed
- [ ] **Access Controls** - Role-based permissions
- [ ] **Session Timeouts** - 15-minute inactivity logout
- [ ] **Password Policy** - 12+ chars, complexity requirements

#### Administrative Requirements

- [ ] **BAA Signed** - With cloud provider (AWS/Azure/GCP)
- [ ] **Privacy Officer** - Designated contact
- [ ] **Incident Response Plan** - Documented procedures
- [ ] **Employee Training** - Annual HIPAA training
- [ ] **Risk Assessment** - Annual security review
- [ ] **Breach Notification** - 60-day notification process

#### Optional Certifications

- [ ] **SOC 2 Type II** - Security audit certification
- [ ] **HITRUST** - Healthcare-specific certification
- [ ] **ISO 27001** - Information security management

### Step 6: Monitoring & Maintenance

**Daily Tasks (Automated):**
- Review new violations in dashboard
- Check for after-hours access patterns
- Monitor system health metrics

**Weekly Tasks:**
- Review audit log summary
- Check for bulk access patterns
- Verify backup integrity

**Monthly Tasks:**
- Security patch updates
- Access review (remove inactive users)
- Compliance dashboard review with privacy officer

**Annual Tasks:**
- Full risk assessment
- Penetration testing
- HIPAA training refresh
- Policy review and updates

---

## 📄 License

Proprietary - Rady Children's Health

---

## 📞 Support

**Technical Issues:**
- Check API documentation: http://localhost:8000/docs
- Review logs: `docker-compose logs`

**HIPAA Compliance Questions:**
- Contact: compliance@radychildrens.org

**Contact:**
- Development Team: [Contact Information]

---

**Built with ❤️ for Rady Children's Health**


