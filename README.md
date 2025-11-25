# Rady Children's Health GenAI Agent

A secure, HIPAA-compliant GenAI agent for healthcare applications built with FastAPI, LangChain, and Next.js.

# Rady Children's Health GenAI Agent

A secure, HIPAA-compliant GenAI agent for pediatric healthcare with RAG (Retrieval-Augmented Generation) capabilities, built with FastAPI, LangChain, and Next.js.

---

## 🚀 Quick Start

### Option 1: Pull from DockerHub (Easiest)
```bash
# Pull pre-built images
docker pull bolajil/rady-backend:latest
docker pull bolajil/rady-frontend:latest

# Create .env file
echo "OPENAI_API_KEY=your-key-here" > .env

# Run
docker-compose -f docker-compose.prod.yml up
```

**Access:**
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Frontend: http://localhost:3000

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
- `GET /health` - Health check
- `POST /chat` - Chat with AI agent
- `POST /kb/search` - Search knowledge base
- `GET /kb/stats` - Knowledge base statistics
- `GET /kb/documents` - List uploaded documents

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

## 📄 License

Proprietary - Rady Children's Health

---

## 📞 Support

**Technical Issues:**
- Check API documentation: http://localhost:8000/docs
- Review logs: `docker-compose logs`

**Contact:**
- Development Team: [Contact Information]

---

**Built with ❤️ for Rady Children's Health**

