"""
OpenTelemetry Configuration for Distributed Tracing

This module sets up OpenTelemetry instrumentation for:
- FastAPI requests
- HTTP client calls
- Custom spans for LLM operations
- PHI guardrail decisions

Usage:
    from app.telemetry import setup_telemetry, SpanContext
    
    # Initialize at app startup
    setup_telemetry(app, service_name="rady-genai-backend")
    
    # Create custom spans
    with SpanContext("my_operation", {"key": "value"}) as span:
        result = do_something()
        span.set_attribute("result_size", len(result))
"""

import os
import logging
from typing import Optional, Any
from functools import wraps

logger = logging.getLogger(__name__)

# Check if OpenTelemetry is available
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.trace import Status, StatusCode
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    trace = None
    logger.warning("OpenTelemetry not installed. Run: pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp opentelemetry-instrumentation-fastapi")


# Global tracer instance
_tracer: Optional[Any] = None


def setup_telemetry(app=None, service_name: str = "rady-genai-backend") -> Optional[Any]:
    """
    Initialize OpenTelemetry tracing.
    
    Args:
        app: FastAPI application instance (optional, for auto-instrumentation)
        service_name: Name of the service for tracing
        
    Returns:
        Tracer instance or None if not configured
    """
    global _tracer
    
    if not OTEL_AVAILABLE:
        logger.warning("OpenTelemetry not available")
        return None
    
    # Check if tracing is enabled
    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
    
    if not otel_enabled:
        logger.info("OpenTelemetry disabled. Set OTEL_ENABLED=true to enable.")
        return None
    
    try:
        # Create resource with service information
        resource = Resource.create({
            SERVICE_NAME: service_name,
            SERVICE_VERSION: os.getenv("APP_VERSION", "1.0.0"),
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        })
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        
        # Create OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=otel_endpoint,
            insecure=True  # Set to False in production with TLS
        )
        
        # Add span processor
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        # Auto-instrument FastAPI
        if app is not None:
            FastAPIInstrumentor.instrument_app(app)
            logger.info("FastAPI instrumented with OpenTelemetry")
        
        # Auto-instrument requests library
        try:
            RequestsInstrumentor().instrument()
            logger.info("Requests library instrumented with OpenTelemetry")
        except Exception as e:
            logger.warning(f"Could not instrument requests: {e}")
        
        _tracer = trace.get_tracer(service_name)
        logger.info(f"OpenTelemetry initialized. Exporting to: {otel_endpoint}")
        
        return _tracer
        
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {e}")
        return None


def get_tracer(name: str = "rady-genai") -> Optional[Any]:
    """
    Get a tracer instance for creating custom spans.
    
    Args:
        name: Name for the tracer
        
    Returns:
        Tracer instance or None
    """
    global _tracer
    
    if not OTEL_AVAILABLE or trace is None:
        return None
    
    if _tracer is not None:
        return _tracer
    
    return trace.get_tracer(name)


class SpanContext:
    """
    Context manager for creating custom spans.
    
    Usage:
        with SpanContext("llm_call", {"model": "gpt-4"}) as span:
            result = call_llm()
            span.set_attribute("tokens", result.tokens)
    """
    
    def __init__(self, name: str, attributes: dict = None):
        self.name = name
        self.attributes = attributes or {}
        self.span = None
        self.tracer = get_tracer()
    
    def __enter__(self):
        if self.tracer is None:
            return self
        
        self.span = self.tracer.start_span(self.name)
        for key, value in self.attributes.items():
            if value is not None:
                self.span.set_attribute(key, value)
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span is None:
            return
        
        if exc_type is not None:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.record_exception(exc_val)
        else:
            self.span.set_status(Status(StatusCode.OK))
        
        self.span.end()
    
    def set_attribute(self, key: str, value: Any) -> None:
        """Set an attribute on the current span."""
        if self.span is not None and value is not None:
            self.span.set_attribute(key, value)
    
    def add_event(self, name: str, attributes: dict = None) -> None:
        """Add an event to the current span."""
        if self.span is not None:
            self.span.add_event(name, attributes or {})


def trace_function(name: str = None, attributes: dict = None):
    """
    Decorator to trace function calls.
    
    Usage:
        @trace_function(name="my_operation")
        def my_function(arg1, arg2):
            ...
    
    Args:
        name: Optional name for the span (defaults to function name)
        attributes: Optional attributes to add to span
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            span_name = name or f"{func.__module__}.{func.__name__}"
            with SpanContext(span_name, attributes) as span:
                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("success", True)
                    return result
                except Exception as e:
                    span.set_attribute("success", False)
                    span.set_attribute("error.message", str(e))
                    raise
        return wrapper
    return decorator


def trace_llm_call(func):
    """
    Decorator specifically for tracing LLM calls.
    
    Usage:
        @trace_llm_call
        def call_openai(prompt):
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        with SpanContext(f"llm.{func.__name__}", {"function": func.__name__}) as span:
            try:
                result = func(*args, **kwargs)
                span.set_attribute("success", True)
                return result
            except Exception as e:
                span.set_attribute("success", False)
                span.set_attribute("error.message", str(e))
                raise
    return wrapper


def trace_phi_guardrail(action: str, phi_count: int, blocked: bool) -> None:
    """
    Record PHI guardrail decision as a span event.
    
    Args:
        action: The action taken (allow, redact, block)
        phi_count: Number of PHI elements detected
        blocked: Whether the request was blocked
    """
    if not OTEL_AVAILABLE or trace is None:
        return
    
    current_span = trace.get_current_span()
    if current_span is not None:
        current_span.add_event(
            "phi_guardrail_decision",
            {
                "action": action,
                "phi_count": phi_count,
                "blocked": blocked,
            }
        )


def record_llm_metrics(
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    latency_ms: float = 0,
    success: bool = True
) -> None:
    """
    Record LLM call metrics on the current span.
    
    Args:
        model: Model name used
        prompt_tokens: Number of prompt tokens
        completion_tokens: Number of completion tokens
        latency_ms: Latency in milliseconds
        success: Whether the call succeeded
    """
    if not OTEL_AVAILABLE or trace is None:
        return
    
    current_span = trace.get_current_span()
    if current_span is not None:
        current_span.set_attribute("llm.model", model)
        current_span.set_attribute("llm.prompt_tokens", prompt_tokens)
        current_span.set_attribute("llm.completion_tokens", completion_tokens)
        current_span.set_attribute("llm.total_tokens", prompt_tokens + completion_tokens)
        current_span.set_attribute("llm.latency_ms", latency_ms)
        current_span.set_attribute("llm.success", success)
