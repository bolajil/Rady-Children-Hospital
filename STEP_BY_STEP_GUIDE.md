# Step-by-Step Implementation Guide - Rady Children's GenAI Agent

This guide provides granular, step-by-step instructions for implementing each component of the Rady Children's GenAI Agent project.

---

## 📋 Phase 1: Environment Setup & Project Initialization

### Task 1.1: Install Prerequisites

**Step 1.1.1**: Install Python 3.11+
```bash
# Windows (using winget)
winget install Python.Python.3.11

# Verify installation
python --version
```

**Step 1.1.2**: Install Node.js 18+
```bash
# Windows (using winget)
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version
npm --version
```

**Step 1.1.3**: Install Docker Desktop
```bash
# Download from https://www.docker.com/products/docker-desktop/
# Install and start Docker Desktop

# Verify installation
docker --version
docker-compose --version
```

**Step 1.1.4**: Install Terraform
```bash
# Windows (using chocolatey)
choco install terraform

# Or download from https://www.terraform.io/downloads

# Verify installation
terraform --version
```

**Step 1.1.5**: Install AWS CLI
```bash
# Windows (MSI installer)
# Download from https://aws.amazon.com/cli/

# Verify installation
aws --version

# Configure AWS credentials
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-west-2), Output format (json)
```

### Task 1.2: Clone and Initialize Project

**Step 1.2.1**: Navigate to project directory
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai
```

**Step 1.2.2**: Initialize Git repository
```bash
git init
git add .
git commit -m "Initial project scaffolding"
```

**Step 1.2.3**: Create environment files
```bash
# Backend .env
cd backend
New-Item -Path ".env" -ItemType File
```

**Step 1.2.4**: Configure backend .env file
```bash
# Edit backend/.env with the following:
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rady_db
SECRET_KEY=your_secret_key_here_generate_with_openssl
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

**Step 1.2.5**: Create frontend .env.local
```bash
cd ../frontend
New-Item -Path ".env.local" -ItemType File
```

**Step 1.2.6**: Configure frontend .env.local
```bash
# Edit frontend/.env.local with:
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Rady Children's GenAI Agent"
```

---

## 📦 Phase 2: Backend Development (FastAPI + LangChain)

### Task 2.1: Setup Backend Virtual Environment

**Step 2.1.1**: Create virtual environment
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\backend
python -m venv venv
```

**Step 2.1.2**: Activate virtual environment
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows CMD
venv\Scripts\activate.bat
```

**Step 2.1.3**: Upgrade pip
```bash
python -m pip install --upgrade pip
```

**Step 2.1.4**: Install dependencies
```bash
pip install -r requirements.txt
```

**Step 2.1.5**: Verify installation
```bash
pip list
# Should see fastapi, uvicorn, langchain, etc.
```

### Task 2.2: Create Database Models

**Step 2.2.1**: Create models directory
```bash
mkdir app\models
New-Item -Path "app\models\__init__.py" -ItemType File
```

**Step 2.2.2**: Create database configuration file
Create `backend/app/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/rady_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2.2.3**: Create user model
Create `backend/app/models/user.py`:
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_clinician = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Step 2.2.4**: Create audit log model
Create `backend/app/models/audit_log.py`:
```python
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from datetime import datetime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    action = Column(String, nullable=False)
    resource_type = Column(String)
    resource_id = Column(String)
    details = Column(JSON)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
```

### Task 2.3: Implement LangChain Tools

**Step 2.3.1**: Create tools directory
```bash
mkdir app\tools
New-Item -Path "app\tools\__init__.py" -ItemType File
```

**Step 2.3.2**: Create EMR retriever tool
Create `backend/app/tools/emr_retriever.py`:
```python
from langchain.tools import BaseTool
from typing import Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class EMRInput(BaseModel):
    patient_id: str = Field(description="The patient ID to retrieve records for")

class EMRRetrieverTool(BaseTool):
    name = "emr_retriever"
    description = """
    Retrieves patient data from Electronic Medical Records (FHIR-compliant).
    Use this when you need to access patient medical history, lab results, 
    medications, or other clinical data. Input should be a patient ID.
    """
    args_schema = EMRInput
    
    def _run(self, patient_id: str) -> str:
        """
        Retrieve EMR data for a patient.
        In production, this would integrate with your FHIR server.
        """
        # Log access for HIPAA compliance
        logger.info(f"HIPAA_AUDIT: EMR access for patient_id={patient_id}")
        
        # TODO: Implement actual FHIR API integration
        # Example: fhir_client.get_patient(patient_id)
        
        # Mock response for development
        return f"""
        Patient ID: {patient_id}
        Status: Active patient record found
        Last Visit: 2024-01-15
        Current Medications: [List would be retrieved from FHIR]
        Allergies: [List would be retrieved from FHIR]
        
        Note: This is a mock response. Implement FHIR integration for production.
        """
    
    async def _arun(self, patient_id: str) -> str:
        """Async version of the tool."""
        return self._run(patient_id)
```

**Step 2.3.3**: Create clinical guidelines tool
Create `backend/app/tools/clinical_guidelines.py`:
```python
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

class GuidelineInput(BaseModel):
    condition: str = Field(description="The medical condition to look up guidelines for")

class ClinicalGuidelinesTool(BaseTool):
    name = "clinical_guidelines"
    description = """
    Retrieves clinical practice guidelines for specific conditions.
    Use this when you need evidence-based treatment recommendations.
    Input should be a medical condition or disease name.
    """
    args_schema = GuidelineInput
    
    def _run(self, condition: str) -> str:
        """
        Retrieve clinical guidelines.
        In production, integrate with medical knowledge bases.
        """
        # TODO: Integrate with medical databases (UpToDate, PubMed, etc.)
        
        return f"""
        Clinical Guidelines for: {condition}
        
        [In production, this would return evidence-based guidelines from:
        - American Academy of Pediatrics
        - CDC Guidelines
        - UpToDate
        - PubMed/Clinical trials]
        
        Implement integration with medical knowledge databases.
        """
    
    async def _arun(self, condition: str) -> str:
        return self._run(condition)
```

**Step 2.3.4**: Create medication explainer tool
Create `backend/app/tools/medication_explainer.py`:
```python
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

class MedicationInput(BaseModel):
    medication_name: str = Field(description="The name of the medication")

class MedicationExplainerTool(BaseTool):
    name = "medication_explainer"
    description = """
    Provides detailed information about medications including usage,
    side effects, and interactions. Input should be a medication name.
    """
    args_schema = MedicationInput
    
    def _run(self, medication_name: str) -> str:
        """
        Get medication information.
        """
        # TODO: Integrate with drug databases (RxNorm, DrugBank, etc.)
        
        return f"""
        Medication: {medication_name}
        
        [In production, retrieve from drug databases:
        - Indication and usage
        - Dosing information
        - Side effects
        - Drug interactions
        - Contraindications
        - Pediatric considerations]
        
        Implement integration with pharmaceutical databases.
        """
    
    async def _arun(self, medication_name: str) -> str:
        return self._run(medication_name)
```

**Step 2.3.5**: Register tools in agent
Update `backend/app/agent.py`:
```python
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.tools.emr_retriever import EMRRetrieverTool
from app.tools.clinical_guidelines import ClinicalGuidelinesTool
from app.tools.medication_explainer import MedicationExplainerTool

# Initialize tools
tools = [
    EMRRetrieverTool(),
    ClinicalGuidelinesTool(),
    MedicationExplainerTool(),
]

# LLM configuration
llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)

# Prompt template
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful medical assistant for Rady Children's Health.
        You adhere to HIPAA guidelines and prioritize patient safety.
        
        IMPORTANT RULES:
        - Never make definitive diagnoses - suggest consulting with healthcare providers
        - Always prioritize patient safety
        - Provide evidence-based information
        - Acknowledge limitations and uncertainties
        - Respect patient privacy and confidentiality
        
        Use the available tools to answer questions accurately."""
    ),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# Create agent
agent = create_openai_tools_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

### Task 2.4: Implement RAG Pipeline

**Step 2.4.1**: Install additional dependencies
```bash
pip install pinecone-client sentence-transformers chromadb
```

**Step 2.4.2**: Update requirements.txt
```bash
pip freeze > requirements.txt
```

**Step 2.4.3**: Create RAG configuration
Create `backend/app/rag.py`:
```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
import os

# Initialize embeddings
embeddings = OpenAIEmbeddings()

# Initialize vector store (using Chroma for local development)
# For production, use Pinecone or Weaviate
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings
)

# Text splitter for document processing
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

def ingest_documents(documents):
    """
    Ingest documents into the vector database.
    """
    texts = text_splitter.split_documents(documents)
    vectorstore.add_documents(texts)
    vectorstore.persist()

def get_retrieval_chain():
    """
    Create a retrieval QA chain.
    """
    llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
    
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    
    return qa_chain
```

### Task 2.5: Implement Authentication & Authorization

**Step 2.5.1**: Install auth dependencies
```bash
pip install python-jose[cryptography] passlib[bcrypt] python-multipart
pip freeze > requirements.txt
```

**Step 2.5.2**: Create auth utilities
Create `backend/app/auth.py`:
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # TODO: Fetch user from database
    return username
```

**Step 2.5.3**: Update main.py with auth endpoints
Update `backend/app/main.py`:
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from app.agent import agent_executor
from app.auth import (
    create_access_token,
    get_current_user,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from pydantic import BaseModel

app = FastAPI(title="Rady Children's GenAI Agent")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

class Token(BaseModel):
    access_token: str
    token_type: str

@app.get("/")
async def root():
    return {"message": "Rady Children's GenAI Agent API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # TODO: Validate against database
    # Mock authentication for development
    if form_data.username != "demo" or form_data.password != "demo123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Endpoint to interact with the GenAI agent.
    Requires authentication.
    """
    try:
        response = agent_executor.invoke({"input": request.query})
        return ChatResponse(response=response["output"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
```

### Task 2.6: Test Backend Locally

**Step 2.6.1**: Start the backend server
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\backend
uvicorn app.main:app --reload --port 8000
```

**Step 2.6.2**: Open browser and test API docs
```
http://localhost:8000/docs
```

**Step 2.6.3**: Test health endpoint
```bash
curl http://localhost:8000/health
```

**Step 2.6.4**: Test authentication
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo&password=demo123"
```

---

## 🎨 Phase 3: Frontend Development (Next.js)

### Task 3.1: Setup Frontend Development Environment

**Step 3.1.1**: Navigate to frontend directory
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\frontend
```

**Step 3.1.2**: Install dependencies
```bash
npm install
```

**Step 3.1.3**: Install additional packages
```bash
npm install axios @tanstack/react-query lucide-react date-fns
```

**Step 3.1.4**: Verify Next.js setup
```bash
npm run dev
```
Should start on http://localhost:3000

### Task 3.2: Create API Client

**Step 3.2.1**: Create lib directory
```bash
mkdir lib
```

**Step 3.2.2**: Create API client
Create `frontend/lib/api.ts`:
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ChatMessage {
  query: string;
}

export interface ChatResponse {
  response: string;
}

export const api = {
  async login(credentials: LoginCredentials) {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await axios.post(`${API_URL}/token`, formData);
    return response.data;
  },

  async chat(message: ChatMessage): Promise<ChatResponse> {
    const response = await apiClient.post('/chat', message);
    return response.data;
  },

  async healthCheck() {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
```

### Task 3.3: Create Authentication Pages

**Step 3.3.1**: Create auth directory
```bash
mkdir app\(auth)
mkdir app\(auth)\login
```

**Step 3.3.2**: Create login page
Create `frontend/app/(auth)/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ username, password });
      localStorage.setItem('access_token', data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Rady Children's Health
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            GenAI Medical Assistant
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        <div className="text-center text-xs text-gray-500">
          Demo: username: demo, password: demo123
        </div>
      </div>
    </div>
  );
}
```

### Task 3.4: Create Chat Interface

**Step 3.4.1**: Create components directory
```bash
mkdir components
```

**Step 3.4.2**: Create ChatInterface component
Create `frontend/components/ChatInterface.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.chat({ query: input });
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <Bot className="w-16 h-16 mx-auto mb-4 text-indigo-200" />
            <p className="text-lg">How can I assist you today?</p>
            <p className="text-sm mt-2">Ask me anything about patient care, medications, or clinical guidelines.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 3.4.3**: Create dashboard page
Create `frontend/app/dashboard/page.tsx`:
```typescript
'use client';

import ChatInterface from '@/components/ChatInterface';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Rady Children's GenAI Assistant
            </h1>
            <button
              onClick={() => {
                localStorage.removeItem('access_token');
                router.push('/login');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[calc(100vh-12rem)]">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
```

### Task 3.5: Test Frontend Locally

**Step 3.5.1**: Start frontend dev server
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\frontend
npm run dev
```

**Step 3.5.2**: Open browser
```
http://localhost:3000/login
```

**Step 3.5.3**: Test login flow
- Username: demo
- Password: demo123

**Step 3.5.4**: Test chat functionality
- Send test messages
- Verify responses from backend

---

## 🏗️ Phase 4: Infrastructure & Deployment

### Task 4.1: Expand Terraform Configuration

**Step 4.1.1**: Create variables file
Create `infra/variables.tf`:
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "rady-genai"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}
```

**Step 4.1.2**: Create outputs file
Create `infra/outputs.tf`:
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "backend_ecr_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}
```

**Step 4.1.3**: Initialize Terraform
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\infra
terraform init
```

**Step 4.1.4**: Validate configuration
```bash
terraform validate
```

**Step 4.1.5**: Plan infrastructure
```bash
terraform plan
```

### Task 4.2: Deploy Infrastructure

**Step 4.2.1**: Create terraform.tfvars
Create `infra/terraform.tfvars`:
```hcl
aws_region        = "us-west-2"
project_name      = "rady-genai"
environment       = "dev"
database_username = "admin"
database_password = "CHANGE_THIS_PASSWORD"
```

**Step 4.2.2**: Apply Terraform
```bash
terraform apply
# Review the plan and type 'yes' to confirm
```

**Step 4.2.3**: Save outputs
```bash
terraform output > terraform-outputs.txt
```

### Task 4.3: Build and Push Docker Images

**Step 4.3.1**: Login to ECR
```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com
```

**Step 4.3.2**: Build backend image
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\backend
docker build -t rady-backend .
```

**Step 4.3.3**: Tag backend image
```bash
docker tag rady-backend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest
```

**Step 4.3.4**: Push backend image
```bash
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest
```

**Step 4.3.5**: Build frontend image
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\frontend
docker build -t rady-frontend .
```

**Step 4.3.6**: Tag frontend image
```bash
docker tag rady-frontend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-genai-frontend:latest
```

**Step 4.3.7**: Push frontend image
```bash
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-genai-frontend:latest
```

---

## 🧪 Phase 5: Testing & Validation

### Task 5.1: Backend Testing

**Step 5.1.1**: Create tests directory
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\backend
mkdir tests
New-Item -Path "tests\__init__.py" -ItemType File
```

**Step 5.1.2**: Install test dependencies
```bash
pip install pytest pytest-asyncio pytest-cov httpx
pip freeze > requirements.txt
```

**Step 5.1.3**: Create test file
Create `backend/tests/test_main.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login():
    response = client.post(
        "/token",
        data={"username": "demo", "password": "demo123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

**Step 5.1.4**: Run tests
```bash
pytest tests/ -v
```

**Step 5.1.5**: Run with coverage
```bash
pytest tests/ --cov=app --cov-report=html
```

### Task 5.2: Frontend Testing

**Step 5.2.1**: Install test dependencies
```bash
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

**Step 5.2.2**: Create Jest config
Create `frontend/jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

**Step 5.2.3**: Run tests
```bash
npm test
```

---

## 📊 Phase 6: Monitoring & Maintenance

### Task 6.1: Setup CloudWatch Logging

**Step 6.1.1**: Add CloudWatch log group to Terraform
Add to `infra/main.tf`:
```hcl
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/rady-backend"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/rady-frontend"
  retention_in_days = 30
}
```

**Step 6.1.2**: Apply changes
```bash
cd infra
terraform apply
```

### Task 6.2: Setup Monitoring Dashboard

**Step 6.2.1**: Create CloudWatch dashboard
Add to `infra/main.tf`:
```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization"],
            [".", "MemoryUtilization"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Metrics"
        }
      }
    ]
  })
}
```

---

## ✅ Verification Checklist

After completing all tasks, verify:

- [ ] Backend API is accessible at http://localhost:8000
- [ ] API documentation works at http://localhost:8000/docs
- [ ] Frontend loads at http://localhost:3000
- [ ] Login functionality works
- [ ] Chat interface sends and receives messages
- [ ] Docker images build successfully
- [ ] Tests pass for backend (pytest)
- [ ] All environment variables are configured
- [ ] Terraform plan executes without errors
- [ ] AWS credentials are configured

---

## 🚀 Next Steps

1. Implement FHIR integration for EMR data
2. Set up vector database (Pinecone/Weaviate)
3. Ingest medical knowledge base
4. ~~Implement comprehensive audit logging~~ ✅ DONE
5. ~~Add HIPAA compliance features~~ ✅ DONE
6. Set up CI/CD pipeline
7. Perform security audit
8. Load testing and optimization

---

## 🏥 Phase 7: HIPAA Compliance Implementation (Production)

### Task 7.1: Database Setup for Audit Logs

**Step 7.1.1**: Create PostgreSQL database
```bash
# Using Docker for local development
docker run --name rady-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=rady_db \
  -p 5432:5432 \
  -d postgres:15

# Or use cloud provider (AWS RDS, Azure SQL)
```

**Step 7.1.2**: Create audit log table
```sql
-- Connect to database
psql -h localhost -U admin -d rady_db

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
```

**Step 7.1.3**: Create immutability trigger
```sql
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
```

**Step 7.1.4**: Verify immutability
```sql
-- Try to delete (should fail)
DELETE FROM hipaa_audit_log WHERE id IS NOT NULL;
-- Expected error: "HIPAA audit logs cannot be modified or deleted"

-- Try to update (should fail)
UPDATE hipaa_audit_log SET user_email = 'test@test.com';
-- Expected error: "HIPAA audit logs cannot be modified or deleted"
```

### Task 7.2: Update Backend for Database Storage

**Step 7.2.1**: Install database dependencies
```bash
cd backend
pip install sqlalchemy asyncpg psycopg2-binary
pip freeze > requirements.txt
```

**Step 7.2.2**: Create database audit logger
Create `backend/app/audit_db.py`:
```python
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:secure_password@localhost:5432/rady_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class HIPAAAuditLog(Base):
    __tablename__ = "hipaa_audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    event_type = Column(String(50), nullable=False)
    user_id = Column(String(100), nullable=False)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100))
    patient_id = Column(String(100))
    ip_address = Column(INET)
    details = Column(JSON)
    is_violation = Column(Boolean, default=False)
    violation_severity = Column(String(20))
    violation_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


def log_to_database(event_data: dict):
    """Log audit event to PostgreSQL database."""
    db = SessionLocal()
    try:
        log_entry = HIPAAAuditLog(**event_data)
        db.add(log_entry)
        db.commit()
        return str(log_entry.id)
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
```

**Step 7.2.3**: Update audit.py to use database
Add to `backend/app/audit.py`:
```python
import os

# Check if database logging is enabled
USE_DATABASE = os.getenv("HIPAA_USE_DATABASE", "false").lower() == "true"

if USE_DATABASE:
    from app.audit_db import log_to_database

def log_event(...):
    # ... existing code ...
    
    # If database logging is enabled, persist to database
    if USE_DATABASE:
        try:
            log_to_database({
                "event_type": event.event_type.value,
                "user_id": event.user_id,
                "user_email": event.user_email,
                "user_role": event.user_role,
                "resource_type": event.resource_type,
                "resource_id": event.resource_id,
                "patient_id": event.patient_id,
                "ip_address": event.ip_address,
                "details": event.details,
                "is_violation": event.is_violation,
                "violation_severity": event.violation_severity.value if event.violation_severity else None,
                "violation_reason": event.violation_reason,
            })
        except Exception as e:
            logger.error(f"Failed to log to database: {e}")
```

### Task 7.3: Setup Email Alerting

**Step 7.3.1**: Install email dependencies
```bash
pip install aiosmtplib
pip freeze > requirements.txt
```

**Step 7.3.2**: Create alert service
Create `backend/app/alerts.py`:
```python
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.sendgrid.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "apikey")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM", "noreply@radychildrens.org")
HIPAA_ALERT_EMAIL = os.getenv("HIPAA_ALERT_EMAIL", "compliance@radychildrens.org")


def send_violation_alert(event):
    """Send email alert for critical violations."""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not configured, skipping email alert")
        return
    
    if event.violation_severity not in ['critical', 'high']:
        return
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'[HIPAA ALERT] {event.violation_severity.upper()} Violation Detected'
        msg['From'] = ALERT_EMAIL_FROM
        msg['To'] = HIPAA_ALERT_EMAIL
        
        text_content = f'''
HIPAA Violation Alert

Severity: {event.violation_severity.upper()}
Time: {event.timestamp}
Event ID: {event.id}

User Information:
- Email: {event.user_email}
- Role: {event.user_role}
- User ID: {event.user_id}

Resource Accessed:
- Type: {event.resource_type}
- ID: {event.resource_id}
- Patient ID: {event.patient_id}

Violation Reason:
{event.violation_reason}

Please investigate immediately.

---
Rady Children's Health - HIPAA Compliance System
'''

        html_content = f'''
<html>
<body style="font-family: Arial, sans-serif;">
    <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px;">
        <h1>⚠️ HIPAA Violation Alert</h1>
        <p><strong>Severity:</strong> {event.violation_severity.upper()}</p>
    </div>
    
    <div style="padding: 20px;">
        <h2>Event Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{event.timestamp}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>User</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{event.user_email} ({event.user_role})</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Resource</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{event.resource_type}/{event.resource_id}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Patient</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{event.patient_id}</td></tr>
        </table>
        
        <h3 style="color: #dc2626;">Violation Reason</h3>
        <p style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
            {event.violation_reason}
        </p>
        
        <p style="margin-top: 30px;"><strong>Please investigate immediately.</strong></p>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        Rady Children's Health - HIPAA Compliance System
    </div>
</body>
</html>
'''
        
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Sent HIPAA violation alert for event {event.id}")
        
    except Exception as e:
        logger.error(f"Failed to send violation alert: {e}")
```

**Step 7.3.3**: Integrate alerting into audit system
Update `backend/app/audit.py`:
```python
from app.alerts import send_violation_alert

def log_event(...):
    # ... existing code ...
    
    # Send alert for critical violations
    if event.is_violation:
        send_violation_alert(event)
```

### Task 7.4: Configure Production Environment

**Step 7.4.1**: Create production .env file
```env
# Database
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/rady_db
HIPAA_USE_DATABASE=true

# OpenAI
OPENAI_API_KEY=sk-your-production-key

# Security
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRY_HOURS=8

# HIPAA Compliance
HIPAA_AUDIT_ENABLED=true
HIPAA_LOG_RETENTION_YEARS=6

# Email Alerting (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
ALERT_EMAIL_FROM=noreply@radychildrens.org
HIPAA_ALERT_EMAIL=compliance@radychildrens.org

# Cloud Provider
AWS_REGION=us-west-2
```

**Step 7.4.2**: Update docker-compose for production
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    image: bolajil/rady-backend:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - HIPAA_USE_DATABASE=true
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - ALERT_EMAIL_FROM=${ALERT_EMAIL_FROM}
      - HIPAA_ALERT_EMAIL=${HIPAA_ALERT_EMAIL}
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: bolajil/rady-frontend:latest
    environment:
      - BACKEND_URL=http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Task 7.5: AWS HIPAA Compliance Setup

**Step 7.5.1**: Sign AWS BAA (Business Associate Agreement)
```
1. Go to AWS Console
2. Navigate to: AWS Artifact → Agreements
3. Accept "AWS Business Associate Addendum"
4. Download and save signed copy
```

**Step 7.5.2**: Create HIPAA-compliant RDS
```bash
aws rds create-db-instance \
    --db-instance-identifier rady-hipaa-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 15.4 \
    --allocated-storage 100 \
    --storage-type gp3 \
    --storage-encrypted \
    --kms-key-id alias/aws/rds \
    --master-username admin \
    --master-user-password $(openssl rand -base64 32) \
    --vpc-security-group-ids sg-xxxxx \
    --db-subnet-group-name rady-db-subnet \
    --backup-retention-period 35 \
    --deletion-protection \
    --enable-cloudwatch-logs-exports '["postgresql"]' \
    --auto-minor-version-upgrade \
    --multi-az
```

**Step 7.5.3**: Enable CloudTrail for API logging
```bash
aws cloudtrail create-trail \
    --name rady-hipaa-trail \
    --s3-bucket-name rady-audit-logs \
    --is-multi-region-trail \
    --enable-log-file-validation \
    --kms-key-id alias/rady-audit-key

aws cloudtrail start-logging --name rady-hipaa-trail
```

**Step 7.5.4**: Create CloudWatch alarm for violations
```bash
aws cloudwatch put-metric-alarm \
    --alarm-name "HIPAA-Critical-Violation" \
    --alarm-description "Alert on critical HIPAA violations" \
    --metric-name "HIPAAViolations" \
    --namespace "RadyGenAI" \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --alarm-actions arn:aws:sns:us-west-2:xxx:hipaa-alerts
```

### Task 7.6: Compliance Verification Checklist

**Technical Requirements:**
- [ ] Encryption at Rest - AES-256 (RDS, S3)
- [ ] Encryption in Transit - TLS 1.3
- [ ] Access Logging - All PHI access tracked
- [ ] Audit Log Retention - 6 years
- [ ] Immutable Logs - No modification/deletion
- [ ] Access Controls - Role-based permissions
- [ ] Session Timeouts - 15-minute inactivity logout
- [ ] Password Policy - 12+ chars, complexity

**Administrative Requirements:**
- [ ] BAA Signed with AWS
- [ ] Privacy Officer designated
- [ ] Incident Response Plan documented
- [ ] Employee HIPAA Training completed
- [ ] Risk Assessment performed
- [ ] Breach Notification process documented

**Testing:**
```bash
# Test audit logging
curl -X GET http://localhost:8000/compliance/summary \
  -H "Authorization: Bearer <admin_token>"

# Test violation detection
curl -X POST http://localhost:8000/compliance/demo/generate-sample-events \
  -H "Authorization: Bearer <admin_token>"

# Verify database immutability
psql -h <db-host> -U admin -d rady_db -c "DELETE FROM hipaa_audit_log LIMIT 1;"
# Should fail with: "HIPAA audit logs cannot be modified or deleted"
```

---

**Created**: November 2025  
**Updated**: December 2025 (Added HIPAA Production Implementation)  
**For**: Rady Children's Health GenAI Agent Project
