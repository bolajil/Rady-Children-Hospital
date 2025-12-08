from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
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

from app.agent import agent_executor, llm

# Initialize memory manager (using simple storage)
from app.memory_simple import create_memory_manager, MEMORY_AVAILABLE
from app.memory_instance import set_memory_manager
memory_manager = create_memory_manager()
set_memory_manager(memory_manager, True)
print("Memory manager initialized successfully")

# Try to import vector store - it's optional
try:
    from app.vector_store import get_knowledge_base
    VECTOR_STORE_AVAILABLE = True
except Exception:
    VECTOR_STORE_AVAILABLE = False

# Import routers
from app.routers import ehr, appointments
# Auth router (JWT login/me)
try:
    from app.routers import auth
    AUTH_ROUTER_AVAILABLE = True
except Exception:
    AUTH_ROUTER_AVAILABLE = False

# Compliance/Audit router
try:
    from app.routers import compliance
    COMPLIANCE_ROUTER_AVAILABLE = True
except Exception as e:
    COMPLIANCE_ROUTER_AVAILABLE = False
    print(f"Compliance router not available: {e}")

app = FastAPI(title="Rady Children's GenAI Agent")

# CORS configuration
# Allow local dev plus configurable frontend origins (e.g., Vercel domain)
frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "")
additional_origins = [o.strip() for o in frontend_origins_env.split(",") if o.strip()]
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
allow_origins = default_origins + additional_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https?://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    query: str
    session_id: str = "default"

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

class FeedbackRequest(BaseModel):
    conversation_id: str
    message_index: int
    question: str
    answer: str
    rating: str  # 'up' or 'down'
    timestamp: str

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[str] = None

# In-memory feedback storage (replace with database in production)
feedback_store: List[dict] = []

# Basic endpoints
@app.get("/")
async def root():
    return {"message": "Rady Children's GenAI Agent API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Feedback endpoint for LLM retraining
@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Store user feedback on AI responses for future LLM retraining.
    Positive ratings (thumbs up) indicate good responses.
    Negative ratings (thumbs down) indicate responses needing improvement.
    """
    import uuid
    from datetime import datetime
    
    feedback_id = str(uuid.uuid4())
    
    feedback_entry = {
        "id": feedback_id,
        "conversation_id": request.conversation_id,
        "message_index": request.message_index,
        "question": request.question,
        "answer": request.answer,
        "rating": request.rating,
        "timestamp": request.timestamp,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    feedback_store.append(feedback_entry)
    
    # Log for monitoring
    rating_emoji = "👍" if request.rating == "up" else "👎"
    print(f"[FEEDBACK] {rating_emoji} Rating received - Q: {request.question[:50]}...")
    
    return FeedbackResponse(
        success=True,
        message=f"Feedback recorded successfully",
        feedback_id=feedback_id
    )

@app.get("/feedback")
async def get_feedback():
    """Get all feedback for analysis and retraining."""
    return {
        "total": len(feedback_store),
        "positive": len([f for f in feedback_store if f["rating"] == "up"]),
        "negative": len([f for f in feedback_store if f["rating"] == "down"]),
        "feedback": feedback_store
    }

# Include routers
if AUTH_ROUTER_AVAILABLE:
    app.include_router(auth.router)
app.include_router(ehr.router)
app.include_router(appointments.router)
if COMPLIANCE_ROUTER_AVAILABLE:
    app.include_router(compliance.router)

# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint to interact with the GenAI agent with conversation memory.
    The agent can search the knowledge base and remembers conversation context.
    """
    try:
        # Get memory for this session
        if MEMORY_AVAILABLE and memory_manager:
            memory = memory_manager.get_memory(request.session_id)
            chat_history = memory_manager.get_conversation_history(request.session_id) if memory else []
            
            # Invoke agent with memory
            response = agent_executor.invoke({
                "input": request.query,
                "chat_history": chat_history
            })
            
            # Save to memory
            if memory:
                memory.save_context(
                    {"input": request.query},
                    {"output": response["output"]}
                )
        else:
            # Fallback without memory
            response = agent_executor.invoke({"input": request.query})
        
        return ChatResponse(response=response["output"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Chat streaming endpoint (token/chunk streaming for faster perceived latency)
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream the assistant's response incrementally. This is a best-effort stream:
    - If conversation memory is available, it's used as in the /chat endpoint.
    - If the underlying LLM/agent doesn't support server-side streaming via callbacks
      in the current environment, we chunk the final text to simulate token streaming.
    """
    async def _generator():
        try:
            # Get memory and chat history if available
            if MEMORY_AVAILABLE and memory_manager:
                memory = memory_manager.get_memory(request.session_id)
                chat_history = memory_manager.get_conversation_history(request.session_id) if memory else []
                response = agent_executor.invoke({
                    "input": request.query,
                    "chat_history": chat_history
                })
                if memory:
                    memory.save_context({"input": request.query}, {"output": response["output"]})
            else:
                response = agent_executor.invoke({"input": request.query})

            text = str(response.get("output", ""))
            # Stream in small chunks. Prefer word-boundary chunks for smoother UI
            chunk_size = 40
            for i in range(0, len(text), chunk_size):
                yield text[i:i+chunk_size]
            # Ensure a trailing newline to flush readers
            yield "\n"
        except Exception as e:
            # Surface error message in the stream so the UI can show it inline
            yield f"[error] {str(e)}\n"

    return StreamingResponse(_generator(), media_type="text/plain")

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

# Session Management Endpoints

@app.get("/sessions")
async def list_sessions():
    """
    List all active conversation sessions.
    """
    if not MEMORY_AVAILABLE or not memory_manager:
        raise HTTPException(
            status_code=501,
            detail="Memory manager not available"
        )
    
    try:
        sessions = memory_manager.list_sessions()
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/history")
async def get_session_history(session_id: str):
    """
    Get conversation history for a specific session.
    """
    if not MEMORY_AVAILABLE or not memory_manager:
        raise HTTPException(
            status_code=501,
            detail="Memory manager not available"
        )
    
    try:
        history = memory_manager.get_conversation_history(session_id)
        messages = []
        
        for msg in history:
            messages.append({
                "type": msg.type if hasattr(msg, 'type') else "unknown",
                "content": msg.content if hasattr(msg, 'content') else str(msg)
            })
        
        return {
            "session_id": session_id,
            "messages": messages,
            "total": len(messages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/info")
async def get_session_info(session_id: str):
    """
    Get information about a specific session.
    """
    if not MEMORY_AVAILABLE or not memory_manager:
        raise HTTPException(
            status_code=501,
            detail="Memory manager not available"
        )
    
    try:
        info = memory_manager.get_session_info(session_id)
        if not info:
            raise HTTPException(status_code=404, detail="Session not found")
        return info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """
    Clear a session's conversation history.
    """
    if not MEMORY_AVAILABLE or not memory_manager:
        raise HTTPException(
            status_code=501,
            detail="Memory manager not available"
        )
    
    try:
        success = memory_manager.clear_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "status": "success",
            "message": f"Session {session_id} cleared"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/stats")
async def get_session_stats():
    """
    Get statistics about all sessions.
    """
    if not MEMORY_AVAILABLE or not memory_manager:
        raise HTTPException(
            status_code=501,
            detail="Memory manager not available"
        )
    
    try:
        sessions = memory_manager.list_sessions()
        total_messages = 0
        
        for session_id in sessions:
            history = memory_manager.get_conversation_history(session_id)
            total_messages += len(history)
        
        return {
            "total_sessions": len(sessions),
            "total_messages": total_messages,
            "memory_type": memory_manager.memory_type if memory_manager else "unknown"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
