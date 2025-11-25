from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import shutil
import os

# Optional file upload support
try:
    from fastapi import UploadFile, File
    FILE_UPLOAD_AVAILABLE = True
except ImportError:
    FILE_UPLOAD_AVAILABLE = False
    UploadFile = None
    File = None

from app.agent import agent_executor

# Try to import vector store - it's optional
try:
    from app.vector_store import get_knowledge_base
    VECTOR_STORE_AVAILABLE = True
except Exception:
    VECTOR_STORE_AVAILABLE = False

app = FastAPI(title="Rady Children's GenAI Agent")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

class SearchRequest(BaseModel):
    query: str
    num_results: int = 5

class SearchResult(BaseModel):
    content: str
    source: str
    page: Optional[int]
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int

# Basic endpoints
@app.get("/")
async def root():
    return {"message": "Rady Children's GenAI Agent API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint to interact with the GenAI agent.
    The agent can now search the knowledge base using the RAG tool.
    """
    try:
        response = agent_executor.invoke({"input": request.query})
        return ChatResponse(response=response["output"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Knowledge Base Management Endpoints

# File upload endpoint disabled due to missing python-multipart dependency
# To enable: pip install python-multipart faiss-cpu sentence-transformers pypdf
# Then uncomment the code below:
#
# if FILE_UPLOAD_AVAILABLE and VECTOR_STORE_AVAILABLE:
#     @app.post("/kb/upload")
#     async def upload_document(file: UploadFile = File(...)):
#         """Upload a document to the knowledge base."""
#         upload_dir = Path("./data/uploads")
#         upload_dir.mkdir(parents=True, exist_ok=True)
#         file_path = upload_dir / file.filename
#         with file_path.open("wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
#         kb = get_knowledge_base()
#         result = kb.ingest_document(str(file_path))
#         return {"status": "success", "details": result}

@app.post("/kb/search", response_model=SearchResponse)
async def search_knowledge_base(request: SearchRequest):
    """
    Search the knowledge base directly (without using the agent).
    Returns relevant document chunks with similarity scores.
    """
    if not VECTOR_STORE_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Vector store not available. Install RAG dependencies."
        )
    
    try:
        kb = get_knowledge_base()
        results_with_scores = kb.search_with_score(request.query, k=request.num_results)
        
        search_results = []
        for doc, score in results_with_scores:
            search_results.append(SearchResult(
                content=doc.page_content,
                source=doc.metadata.get('source', 'Unknown'),
                page=doc.metadata.get('page'),
                score=float(score)
            ))
        
        return SearchResponse(
            results=search_results,
            total=len(search_results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kb/stats")
async def get_knowledge_base_stats():
    """
    Get statistics about the knowledge base.
    """
    if not VECTOR_STORE_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Vector store not available. Install RAG dependencies."
        )
    
    try:
        kb = get_knowledge_base()
        stats = kb.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kb/documents")
async def list_uploaded_documents():
    """
    List all uploaded documents.
    """
    try:
        upload_dir = Path("./data/uploads")
        if not upload_dir.exists():
            return {"documents": []}
        
        documents = []
        for file_path in upload_dir.glob("*"):
            documents.append({
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "type": file_path.suffix
            })
        
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
