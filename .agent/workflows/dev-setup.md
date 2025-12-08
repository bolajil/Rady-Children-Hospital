---
description: How to set up the development environment
---

# Development Environment Setup

This workflow guides you through setting up your local development environment for the Rady Children's GenAI Agent.

## 1. Prerequisites

### Install required software
- Python 3.12+
- Node.js 18+
- Docker Desktop
- Git

### Verify installations
// turbo
```bash
python --version
node --version
npm --version
docker --version
git --version
```

## 2. Clone Repository

```bash
git clone <repository-url>
cd rady-genai
```

## 3. Backend Setup

### Create and activate virtual environment
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
```

### Install dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Set up environment variables
```bash
copy .env.example .env
# Edit .env with your configuration
```

### Initialize database
```bash
python -m app.scripts.init_db
```

## 4. Frontend Setup

### Install dependencies
```bash
cd frontend
npm install
```

### Set up environment variables
```bash
copy .env.example .env.local
# Edit .env.local with your configuration
```

## 5. Start Development Servers

### Option 1: Using Docker Compose (Recommended)
// turbo-all
```bash
cd ..
docker-compose up -d
```

### Option 2: Run services individually

#### Backend
```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

#### Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```

## 6. Verify Setup

### Check backend
// turbo
```bash
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

### Check frontend
Open browser to: http://localhost:3000

## 7. Install Development Tools

### Backend dev tools
```bash
cd backend
.\venv\Scripts\activate
pip install pytest pytest-cov black flake8 mypy
```

### Frontend dev tools
```bash
cd frontend
npm install --save-dev @types/node @types/react eslint prettier
```

## 8. Configure IDE

### VS Code (Recommended)
- Install Python extension
- Install ESLint extension
- Install Prettier extension
- Install Docker extension

### Settings
Create `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "./backend/venv/Scripts/python.exe",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## 9. Run Initial Tests

### Backend tests
```bash
cd backend
.\venv\Scripts\activate
pytest tests/ -v
```

### Frontend tests
```bash
cd frontend
npm test
```

## 10. Common Issues

### Python version mismatch
- See PYTHON_VERSION_FIX.md for solutions

### Port already in use
```bash
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process
taskkill /PID <process-id> /F
```

### Docker issues
```bash
# Reset Docker
docker-compose down -v
docker system prune -a
```

## Next Steps

- Read README.md for project overview
- Review IMPLEMENTATION_GUIDE.md for architecture details
- Check out STEP_BY_STEP_GUIDE.md for feature implementation
- Join the development Slack channel for support
