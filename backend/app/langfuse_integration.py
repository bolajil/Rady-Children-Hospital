"""
LangFuse Integration for LLM Observability

This module provides LangFuse tracing for all LLM calls.
Self-hosted LangFuse is HIPAA-compliant as no data leaves your infrastructure.

Usage:
    from app.langfuse_integration import get_langfuse_callback, trace_llm_call
    
    # For LangChain integration
    callback = get_langfuse_callback()
    agent.invoke({"input": query}, config={"callbacks": [callback]})
    
    # For custom tracing
    @trace_llm_call(name="my_function")
    def my_function():
        ...
"""

import os
from functools import wraps
from typing import Optional, Callable, Any
import logging

logger = logging.getLogger(__name__)

# Try to import LangFuse (v2 API)
try:
    from langfuse import Langfuse
    LANGFUSE_AVAILABLE = True
    
    # Try to import LangChain callback handler
    try:
        from langfuse.callback import CallbackHandler
        LANGFUSE_CALLBACK_AVAILABLE = True
    except ImportError:
        CallbackHandler = None
        LANGFUSE_CALLBACK_AVAILABLE = False
except ImportError:
    LANGFUSE_AVAILABLE = False
    LANGFUSE_CALLBACK_AVAILABLE = False
    Langfuse = None
    CallbackHandler = None
    logger.warning("LangFuse not installed. Run: pip install 'langfuse<3.0.0'")


# Singleton client instance
_langfuse_client: Optional["Langfuse"] = None


def get_langfuse_client() -> Optional["Langfuse"]:
    """
    Get LangFuse client instance (singleton).
    
    Returns:
        Langfuse client or None if not configured
    """
    global _langfuse_client
    
    if not LANGFUSE_AVAILABLE:
        return None
    
    if _langfuse_client is not None:
        return _langfuse_client
    
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "http://localhost:3001")
    
    # Debug: Log environment variable status
    logger.info(f"LangFuse env check: PUBLIC_KEY={'SET' if public_key else 'NOT SET'}, SECRET_KEY={'SET' if secret_key else 'NOT SET'}, HOST={host}")
    
    if not public_key or not secret_key:
        logger.warning("LangFuse keys not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY")
        return None
    
    try:
        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host
        )
        logger.info(f"LangFuse client initialized. Host: {host}")
        return _langfuse_client
    except Exception as e:
        logger.error(f"Failed to initialize LangFuse: {e}")
        return None


def get_langfuse_callback(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> Optional["CallbackHandler"]:
    """
    Get LangFuse callback handler for LangChain integration.
    
    Args:
        session_id: Optional session ID for grouping traces
        user_id: Optional user ID for attribution
        metadata: Optional metadata to attach to traces
    
    Returns:
        CallbackHandler or None if not configured
    """
    if not LANGFUSE_AVAILABLE or CallbackHandler is None:
        return None
    
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "http://localhost:3001")
    
    if not public_key or not secret_key:
        return None
    
    try:
        return CallbackHandler(
            public_key=public_key,
            secret_key=secret_key,
            host=host,
            session_id=session_id,
            user_id=user_id,
            metadata=metadata or {}
        )
    except Exception as e:
        logger.error(f"Failed to create LangFuse callback: {e}")
        return None


def trace_llm_call(
    name: str = "llm_call",
    metadata: dict = None
) -> Callable:
    """
    Decorator to trace LLM calls with LangFuse.
    
    Usage:
        @trace_llm_call(name="chat_completion")
        def my_llm_function(prompt):
            ...
    
    Args:
        name: Name for the trace
        metadata: Optional metadata to attach
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            client = get_langfuse_client()
            
            if client is None:
                return func(*args, **kwargs)
            
            trace = client.trace(
                name=name,
                metadata=metadata or {}
            )
            
            try:
                result = func(*args, **kwargs)
                trace.update(output=str(result)[:1000])  # Truncate for storage
                return result
            except Exception as e:
                trace.update(
                    output=str(e),
                    metadata={"error": True, "error_type": type(e).__name__}
                )
                raise
            finally:
                client.flush()
        
        return wrapper
    return decorator


def log_generation(
    name: str,
    input_text: str,
    output_text: str,
    model: str = "gpt-4",
    metadata: dict = None,
    session_id: Optional[str] = None,
    latency_ms: Optional[float] = None,
    token_usage: Optional[dict] = None
) -> Optional[str]:
    """
    Log a single LLM generation to LangFuse with enhanced metrics.
    
    Args:
        name: Name for the generation
        input_text: Input prompt
        output_text: Model output
        model: Model name
        metadata: Optional metadata
        session_id: Optional session ID
        latency_ms: Optional latency in milliseconds
        token_usage: Optional token usage dict with keys like 'prompt_tokens', 'completion_tokens', 'total_tokens'
        
    Returns:
        Trace ID or None
    """
    client = get_langfuse_client()
    if client is None:
        logger.warning("LangFuse client is None - traces will not be sent")
        return None
    
    try:
        logger.info(f"LangFuse: Logging trace '{name}' for session '{session_id}'")
        # Enrich metadata with performance metrics
        enriched_metadata = metadata.copy() if metadata else {}
        if latency_ms is not None:
            enriched_metadata["latency_ms"] = latency_ms
        if token_usage:
            enriched_metadata["token_usage"] = token_usage
        
        # LangFuse v2 API - use trace() and generation()
        trace = client.trace(
            name=name,
            session_id=session_id,
            metadata=enriched_metadata
        )
        
        # Build generation kwargs with optional usage data
        generation_kwargs = {
            "name": f"{name}_generation",
            "model": model,
            "input": input_text,
            "output": output_text,
        }
        
        # Add token usage if available (LangFuse v2 format)
        if token_usage:
            generation_kwargs["usage"] = {
                "prompt_tokens": token_usage.get("prompt_tokens", 0),
                "completion_tokens": token_usage.get("completion_tokens", 0),
                "total_tokens": token_usage.get("total_tokens", 0),
            }
        
        # Add latency if available
        if latency_ms is not None:
            generation_kwargs["metadata"] = {"latency_ms": latency_ms}
        
        trace.generation(**generation_kwargs)
        
        client.flush()
        logger.info(f"LangFuse: Trace '{trace.id}' flushed successfully")
        return trace.id
        
    except Exception as e:
        logger.error(f"Failed to log generation: {e}", exc_info=True)
        return None


def log_user_feedback(
    trace_id: str,
    score: float,
    comment: Optional[str] = None
) -> bool:
    """
    Log user feedback for a trace.
    
    Args:
        trace_id: The trace ID to associate feedback with
        score: Score from 0 to 1 (0 = negative, 1 = positive)
        comment: Optional feedback comment
        
    Returns:
        True if feedback was logged successfully
    """
    client = get_langfuse_client()
    if client is None:
        return False
    
    try:
        client.score(
            trace_id=trace_id,
            name="user_feedback",
            value=score,
            comment=comment
        )
        client.flush()
        return True
    except Exception as e:
        logger.error(f"Failed to log feedback: {e}")
        return False


def shutdown():
    """Flush and shutdown LangFuse client."""
    global _langfuse_client
    if _langfuse_client is not None:
        try:
            _langfuse_client.flush()
            _langfuse_client.shutdown()
        except Exception as e:
            logger.error(f"Error shutting down LangFuse: {e}")
        finally:
            _langfuse_client = None
