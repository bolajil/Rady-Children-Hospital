"""
Arize Phoenix Integration for LLM Observability

Phoenix provides specialized LLM tracing with:
- Prompt/response visualization
- Token usage tracking
- Embedding analysis
- OpenTelemetry native support

Usage:
    from app.phoenix_integration import setup_phoenix
    
    # Initialize at startup
    setup_phoenix(project_name="rady-genai")
"""

import os
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

# Check if Phoenix is available
try:
    import phoenix as px
    from phoenix.otel import register
    from opentelemetry import trace
    PHOENIX_AVAILABLE = True
except ImportError:
    PHOENIX_AVAILABLE = False
    px = None
    register = None
    trace = None
    logger.warning("Phoenix not installed. Run: pip install arize-phoenix")


# Global tracer instance
_phoenix_tracer: Optional[Any] = None


def setup_phoenix(
    project_name: str = "rady-genai",
    endpoint: str = None
) -> Optional[Any]:
    """
    Initialize Phoenix tracing.
    
    Args:
        project_name: Name for the Phoenix project
        endpoint: Phoenix collector endpoint (default: localhost:4317)
        
    Returns:
        Tracer instance or None
    """
    global _phoenix_tracer
    
    if not PHOENIX_AVAILABLE:
        logger.warning("Phoenix not available")
        return None
    
    phoenix_enabled = os.getenv("PHOENIX_ENABLED", "false").lower() == "true"
    if not phoenix_enabled:
        logger.info("Phoenix disabled. Set PHOENIX_ENABLED=true to enable.")
        return None
    
    endpoint = endpoint or os.getenv("PHOENIX_ENDPOINT", "http://localhost:4317")
    
    try:
        # Register Phoenix as the trace provider
        tracer_provider = register(
            project_name=project_name,
            endpoint=endpoint
        )
        
        _phoenix_tracer = trace.get_tracer(project_name)
        logger.info(f"Phoenix initialized. Project: {project_name}, Endpoint: {endpoint}")
        logger.info("Phoenix UI available at http://localhost:6006")
        
        return _phoenix_tracer
        
    except Exception as e:
        logger.error(f"Failed to initialize Phoenix: {e}")
        return None


def get_phoenix_tracer(name: str = "rady-genai") -> Optional[Any]:
    """
    Get Phoenix tracer for custom spans.
    
    Args:
        name: Tracer name
        
    Returns:
        Tracer instance or None
    """
    global _phoenix_tracer
    
    if not PHOENIX_AVAILABLE or trace is None:
        return None
    
    if _phoenix_tracer is not None:
        return _phoenix_tracer
    
    return trace.get_tracer(name)


def is_phoenix_enabled() -> bool:
    """Check if Phoenix is enabled and configured."""
    return (
        PHOENIX_AVAILABLE and 
        os.getenv("PHOENIX_ENABLED", "false").lower() == "true"
    )
