# Rady GenAI Monitoring & Observability Deployment Guide

This guide provides step-by-step instructions for deploying monitoring and observability solutions for the Rady GenAI application. Choose the option that best fits your needs.

---

## Table of Contents

1. [Overview & Comparison](#overview--comparison)
2. [Option 1: LangSmith](#option-1-langsmith-easiest)
3. [Option 2: LangFuse v2 (Self-Hosted)](#option-2-langfuse-v2-self-hosted)
4. [Option 3: OpenTelemetry + Jaeger](#option-3-opentelemetry--jaeger)
5. [Option 4: Full Stack (Grafana + Prometheus + Jaeger)](#option-4-full-observability-stack)
6. [Option 5: Arize Phoenix (Open-Source LLM Observability)](#option-5-arize-phoenix)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview & Comparison

| Feature | LangSmith | LangFuse | OpenTelemetry | Full Stack | Arize Phoenix |
|---------|-----------|----------|---------------|------------|---------------|
| **Setup Time** | 5 min | 15 min | 30 min | 45 min | 20 min |
| **HIPAA Compliant** | ❌ No | ✅ Self-host | ✅ Self-host | ✅ Self-host | ✅ Self-host |
| **LLM Tracing** | ✅ Excellent | ✅ Good | ⚠️ Manual | ⚠️ Manual | ✅ Excellent |
| **Infrastructure Metrics** | ❌ No | ❌ No | ✅ Yes | ✅ Yes | ⚠️ Limited |
| **Cost** | Free tier | Free | Free | Free | Free |
| **Prompt Debugging** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Dashboards** | ✅ Built-in | ✅ Built-in | ❌ Need Grafana | ✅ Grafana | ✅ Built-in |

### Recommendation by Use Case

| Use Case | Recommended Option |
|----------|-------------------|
| **Quick Development/Testing** | LangSmith |
| **Production (HIPAA Required)** | LangFuse or Full Stack |
| **Infrastructure Focus** | OpenTelemetry + Jaeger |
| **Complete Observability** | Full Stack |
| **LLM-Specific Analysis** | Arize Phoenix |

---

## Option 1: LangSmith (Easiest)

**Best for:** Development, debugging prompts, quick setup  
**HIPAA:** ❌ Not compliant (data sent to LangChain servers)  
**Time:** ~5 minutes

### What is LangSmith?

LangSmith is LangChain's official observability platform. It provides:
- Automatic tracing of all LangChain operations
- Prompt versioning and testing
- Token usage tracking
- Latency analysis
- Debug failed chains

### Prerequisites

- LangSmith account (free at https://smith.langchain.com)
- LangChain installed (already in your project)

### Step 1: Create LangSmith Account

1. Go to https://smith.langchain.com
2. Sign up with GitHub or email
3. Create a new project called `rady-genai`
4. Copy your API key from Settings → API Keys

### Step 2: Configure Environment Variables

Add to `backend/.env`:

```bash
# LangSmith Configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your-langsmith-api-key-here
LANGCHAIN_PROJECT=rady-genai
```

### Step 3: Verify Installation

No code changes needed! LangChain automatically detects these environment variables.

Restart your backend:

```bash
cd backend
uvicorn app.main:app --reload
```

### Step 4: Test Tracing

1. Open your app at http://localhost:3000
2. Send a chat message
3. Go to https://smith.langchain.com
4. Navigate to your `rady-genai` project
5. You should see traces appearing

### Step 5: Explore Features

In LangSmith dashboard:
- **Runs**: View all LLM calls with inputs/outputs
- **Latency**: See response times
- **Tokens**: Track token usage and costs
- **Errors**: Debug failed requests

### Disabling LangSmith

To disable, set in `.env`:
```bash
LANGCHAIN_TRACING_V2=false
```

---

## Option 2: LangFuse v2 (Self-Hosted)

**Best for:** Production, HIPAA compliance, cost control  
**HIPAA:** ✅ Compliant when self-hosted  
**Time:** ~15 minutes  
**Version:** LangFuse v2 (recommended for simpler setup - only requires PostgreSQL)

> **Note:** LangFuse v3 requires ClickHouse which adds complexity. We use v2 for simpler deployment.

### What is LangFuse?

LangFuse is an open-source alternative to LangSmith that you can self-host. It provides:
- LLM call tracing and debugging
- Prompt management
- User feedback collection
- Cost tracking
- No data leaves your infrastructure

### Prerequisites

- Docker and Docker Compose installed
- PostgreSQL (included in docker-compose)

### Step 1: LangFuse Docker Compose

The file is already created at `monitoring/langfuse/docker-compose.yml`:

```yaml
services:
  langfuse-server:
    image: langfuse/langfuse:2
    container_name: langfuse
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://langfuse:langfuse@langfuse-db:5432/langfuse
      - NEXTAUTH_SECRET=your-secret-key-min-32-chars-here-change-me-now
      - NEXTAUTH_URL=http://localhost:3001
      - SALT=your-salt-key-min-32-chars-here-change-me-now-salt
      - TELEMETRY_ENABLED=false
    depends_on:
      langfuse-db:
        condition: service_healthy
    restart: unless-stopped

  langfuse-db:
    image: postgres:15-alpine
    container_name: langfuse-db
    environment:
      - POSTGRES_USER=langfuse
      - POSTGRES_PASSWORD=langfuse
      - POSTGRES_DB=langfuse
    volumes:
      - langfuse_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U langfuse"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  langfuse_postgres_data:
```

> **Important:** For production, change `NEXTAUTH_SECRET` and `SALT` to secure random strings (minimum 32 characters).

### Step 2: Start LangFuse

```bash
# Navigate to the langfuse directory
cd monitoring/langfuse

# Start LangFuse (pulls images and starts containers)
docker-compose up -d

# Check status
docker-compose ps
```

### Step 3: Configure LangFuse

1. Open http://localhost:3001
2. Create an account (first user becomes admin)
3. Create a new project called `rady-genai`
4. Go to Settings → API Keys
5. Create a new API key pair (Public Key + Secret Key)

### Step 4: Install LangFuse Python SDK

```bash
cd backend
pip install langfuse
pip freeze > requirements.txt
```

### Step 5: LangFuse Integration Module

The integration file is already created at `backend/app/langfuse_integration.py`:

```python
"""
LangFuse Integration for LLM Observability

This module provides LangFuse tracing for all LLM calls.
Self-hosted LangFuse is HIPAA-compliant as no data leaves your infrastructure.
"""

import os
from functools import wraps
from typing import Optional, Callable, Any
import logging

logger = logging.getLogger(__name__)

# Try to import LangFuse
try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    logger.warning("LangFuse not installed. Run: pip install langfuse")


def get_langfuse_client() -> Optional["Langfuse"]:
    """
    Get LangFuse client instance.
    
    Returns:
        Langfuse client or None if not configured
    """
    if not LANGFUSE_AVAILABLE:
        return None
    
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "http://localhost:3001")
    
    if not public_key or not secret_key:
        logger.warning("LangFuse keys not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY")
        return None
    
    try:
        return Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host
        )
    except Exception as e:
        logger.error(f"Failed to initialize LangFuse: {e}")
        return None


def get_langfuse_callback() -> Optional["CallbackHandler"]:
    """
    Get LangFuse callback handler for LangChain integration.
    
    Returns:
        CallbackHandler or None if not configured
    """
    if not LANGFUSE_AVAILABLE:
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
            host=host
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
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            client = get_langfuse_client()
            
            if client is None:
                return func(*args, **kwargs)
            
            trace = client.trace(name=name, metadata=metadata or {})
            
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
```

### Step 6: Configure Environment Variables

Add to `backend/.env`:

```bash
# LangFuse Configuration (Self-Hosted)
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_HOST=http://localhost:3001
```

### Step 7: Integrate with Agent

Update `backend/app/agent.py` to use LangFuse callback:

Add at the top of the file:
```python
# Import LangFuse integration
try:
    from app.langfuse_integration import get_langfuse_callback
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    get_langfuse_callback = lambda: None
```

When creating the agent executor, add the callback:
```python
# Get LangFuse callback if available
langfuse_callback = get_langfuse_callback() if LANGFUSE_AVAILABLE else None
callbacks = [langfuse_callback] if langfuse_callback else []

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=3,
    callbacks=callbacks,  # Add this line
)
```

### Step 8: Test LangFuse

1. Restart the backend:
   ```bash
   uvicorn app.main:app --reload
   ```

2. Send a chat message through the app

3. Open http://localhost:3001

4. Navigate to Traces → You should see your LLM calls

### Step 9: Production Deployment

For production, update the docker-compose with:
- Proper secrets (use environment variables or secrets manager)
- Persistent volume for PostgreSQL
- SSL/TLS termination (use nginx or traefik)
- Backup strategy for the database

---

## Option 3: OpenTelemetry + Jaeger

**Best for:** Infrastructure monitoring, distributed tracing  
**HIPAA:** ✅ Compliant when self-hosted  
**Time:** ~30 minutes

### What is OpenTelemetry?

OpenTelemetry (OTel) is a vendor-neutral observability framework that provides:
- Distributed tracing across services
- Metrics collection
- Log correlation
- Works with any backend (Jaeger, Zipkin, Datadog, etc.)

### What is Jaeger?

Jaeger is an open-source distributed tracing system that:
- Visualizes request flows across services
- Identifies performance bottlenecks
- Helps debug microservices

### Prerequisites

- Docker and Docker Compose
- Python 3.9+

### Step 1: Create Jaeger Docker Compose

Create `monitoring/jaeger/docker-compose.yml`:

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:1.53
    container_name: jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
      - "14268:14268"  # Jaeger thrift
      - "6831:6831/udp" # Jaeger compact thrift
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - LOG_LEVEL=info
    restart: unless-stopped
```

### Step 2: Start Jaeger

```bash
# Create directory
mkdir -p monitoring/jaeger
cd monitoring/jaeger

# Start Jaeger
docker-compose up -d

# Verify it's running
docker-compose ps
```

Open http://localhost:16686 to see the Jaeger UI.

### Step 3: Install OpenTelemetry Python Packages

```bash
cd backend
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-exporter-otlp \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-instrumentation-requests \
            opentelemetry-instrumentation-logging

pip freeze > requirements.txt
```

### Step 4: Create OpenTelemetry Configuration

Create `backend/app/telemetry.py`:

```python
"""
OpenTelemetry Configuration for Distributed Tracing

This module sets up OpenTelemetry instrumentation for:
- FastAPI requests
- HTTP client calls
- Custom spans for LLM operations
- PHI guardrail decisions
"""

import os
import logging
from typing import Optional

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
    logger.warning("OpenTelemetry not installed. Run: pip install opentelemetry-api opentelemetry-sdk")


def setup_telemetry(app=None, service_name: str = "rady-genai-backend") -> Optional[trace.Tracer]:
    """
    Initialize OpenTelemetry tracing.
    
    Args:
        app: FastAPI application instance (optional, for auto-instrumentation)
        service_name: Name of the service for tracing
        
    Returns:
        Tracer instance or None if not configured
    """
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
        RequestsInstrumentor().instrument()
        logger.info("Requests library instrumented with OpenTelemetry")
        
        logger.info(f"OpenTelemetry initialized. Exporting to: {otel_endpoint}")
        
        return trace.get_tracer(service_name)
        
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {e}")
        return None


def get_tracer(name: str = "rady-genai") -> Optional[trace.Tracer]:
    """
    Get a tracer instance for creating custom spans.
    
    Args:
        name: Name for the tracer
        
    Returns:
        Tracer instance or None
    """
    if not OTEL_AVAILABLE:
        return None
    
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
    
    def set_attribute(self, key: str, value) -> None:
        """Set an attribute on the current span."""
        if self.span is not None:
            self.span.set_attribute(key, value)
    
    def add_event(self, name: str, attributes: dict = None) -> None:
        """Add an event to the current span."""
        if self.span is not None:
            self.span.add_event(name, attributes or {})


def trace_llm_call(func):
    """
    Decorator to trace LLM calls.
    
    Usage:
        @trace_llm_call
        def call_openai(prompt):
            ...
    """
    from functools import wraps
    
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
    tracer = get_tracer()
    if tracer is None:
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
```

### Step 5: Integrate with FastAPI

Update `backend/app/main.py` to initialize telemetry:

Add near the top after imports:
```python
# OpenTelemetry setup
try:
    from app.telemetry import setup_telemetry, SpanContext, trace_phi_guardrail
    TELEMETRY_AVAILABLE = True
except ImportError:
    TELEMETRY_AVAILABLE = False
    setup_telemetry = lambda app: None
```

After creating the FastAPI app:
```python
app = FastAPI(title="Rady Children's GenAI Agent")

# Initialize OpenTelemetry (add this line)
if TELEMETRY_AVAILABLE:
    setup_telemetry(app, service_name="rady-genai-backend")
```

### Step 6: Configure Environment Variables

Add to `backend/.env`:

```bash
# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=rady-genai-backend
ENVIRONMENT=development
APP_VERSION=1.0.0
```

### Step 7: Add Custom Tracing to Chat Endpoint

Update the chat endpoint in `main.py` to use custom spans:

```python
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Add tracing context
    if TELEMETRY_AVAILABLE:
        with SpanContext("chat_request", {
            "session_id": request.session_id,
            "query_length": len(request.query)
        }) as span:
            # ... existing chat logic ...
            span.set_attribute("response_length", len(response["output"]))
    else:
        # ... existing chat logic without tracing ...
```

### Step 8: Test Tracing

1. Restart the backend:
   ```bash
   uvicorn app.main:app --reload
   ```

2. Send a few chat messages

3. Open Jaeger UI at http://localhost:16686

4. Select service `rady-genai-backend` from dropdown

5. Click "Find Traces" to see your requests

### Step 9: Understanding Jaeger UI

- **Service**: Your application name
- **Operation**: API endpoints or custom spans
- **Duration**: Time taken for each operation
- **Spans**: Individual units of work within a trace
- **Tags**: Attributes you set on spans

---

## Option 4: Full Observability Stack

**Best for:** Production environments, complete visibility  
**HIPAA:** ✅ Compliant when self-hosted  
**Time:** ~45 minutes

### What's Included?

- **Jaeger**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **OpenTelemetry Collector**: Unified telemetry pipeline

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Rady GenAI App                       │
│         (FastAPI + LangChain + Next.js)                │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  OpenTelemetry Collector│
              │    (Port 4317/4318)    │
              └────────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  Jaeger  │     │Prometheus│     │  Loki    │
   │ (Traces) │     │ (Metrics)│     │  (Logs)  │
   │  :16686  │     │  :9090   │     │  :3100   │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  ┌──────────────┐
                  │   Grafana    │
                  │   :3002      │
                  └──────────────┘
```

### Step 1: Create Full Stack Docker Compose

Create `monitoring/full-stack/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # OpenTelemetry Collector - Central telemetry hub
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.91.0
    container_name: otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Prometheus metrics exposed by the collector
      - "8889:8889"   # Prometheus exporter metrics
    depends_on:
      - jaeger
      - prometheus
    restart: unless-stopped

  # Jaeger - Distributed Tracing
  jaeger:
    image: jaegertracing/all-in-one:1.53
    container_name: jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "14250:14250"  # gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    restart: unless-stopped

  # Prometheus - Metrics
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Grafana - Dashboards
  grafana:
    image: grafana/grafana:10.2.2
    container_name: grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
      - jaeger
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### Step 2: Create OpenTelemetry Collector Config

Create `monitoring/full-stack/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Export traces to Jaeger
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  # Export metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: rady_genai

  # Logging for debugging
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, logging]
```

### Step 3: Create Prometheus Config

Create `monitoring/full-stack/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape OpenTelemetry Collector metrics
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']

  # Scrape FastAPI backend (if exposing metrics endpoint)
  - job_name: 'rady-backend'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
```

### Step 4: Create Grafana Provisioning

Create directory structure:
```bash
mkdir -p monitoring/full-stack/grafana/provisioning/datasources
mkdir -p monitoring/full-stack/grafana/provisioning/dashboards
```

Create `monitoring/full-stack/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: false
```

### Step 5: Start the Full Stack

```bash
cd monitoring/full-stack

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 6: Configure Backend Environment

Add to `backend/.env`:

```bash
# Full Observability Stack
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=rady-genai-backend
ENVIRONMENT=development
```

### Step 7: Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3002 | admin / admin123 |
| **Jaeger** | http://localhost:16686 | - |
| **Prometheus** | http://localhost:9090 | - |

### Step 8: Create Grafana Dashboard

1. Open Grafana at http://localhost:3002
2. Login with admin / admin123
3. Go to Dashboards → New → Import
4. Create panels for:
   - Request latency (from Prometheus)
   - Error rate (from Prometheus)
   - Trace explorer (from Jaeger)

### Step 9: Add Prometheus Metrics to FastAPI

Install prometheus client:
```bash
pip install prometheus-fastapi-instrumentator
```

Add to `backend/app/main.py`:

```python
# Prometheus metrics
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

# After creating app
if PROMETHEUS_AVAILABLE:
    Instrumentator().instrument(app).expose(app)
```

---

## Option 5: Arize Phoenix

**Best for:** LLM-specific observability, embeddings analysis  
**HIPAA:** ✅ Compliant when self-hosted  
**Time:** ~20 minutes

### What is Arize Phoenix?

Arize Phoenix is an open-source LLM observability tool that provides:
- LLM trace visualization
- Embedding drift detection
- Prompt/response analysis
- OpenTelemetry native integration

### Step 1: Install Phoenix

```bash
cd backend
pip install arize-phoenix opentelemetry-sdk opentelemetry-exporter-otlp
pip freeze > requirements.txt
```

### Step 2: Create Phoenix Docker Compose

Create `monitoring/phoenix/docker-compose.yml`:

```yaml
version: '3.8'

services:
  phoenix:
    image: arizephoenix/phoenix:latest
    container_name: phoenix
    ports:
      - "6006:6006"   # Phoenix UI
      - "4317:4317"   # OTLP gRPC
    environment:
      - PHOENIX_WORKING_DIR=/data
    volumes:
      - phoenix_data:/data
    restart: unless-stopped

volumes:
  phoenix_data:
```

### Step 3: Start Phoenix

```bash
mkdir -p monitoring/phoenix
cd monitoring/phoenix
docker-compose up -d
```

### Step 4: Create Phoenix Integration

Create `backend/app/phoenix_integration.py`:

```python
"""
Arize Phoenix Integration for LLM Observability

Phoenix provides specialized LLM tracing with:
- Prompt/response visualization
- Token usage tracking
- Embedding analysis
- OpenTelemetry native support
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import phoenix as px
    from phoenix.otel import register
    from opentelemetry import trace
    PHOENIX_AVAILABLE = True
except ImportError:
    PHOENIX_AVAILABLE = False
    logger.warning("Phoenix not installed. Run: pip install arize-phoenix")


def setup_phoenix(
    project_name: str = "rady-genai",
    endpoint: str = None
) -> Optional[trace.Tracer]:
    """
    Initialize Phoenix tracing.
    
    Args:
        project_name: Name for the Phoenix project
        endpoint: Phoenix collector endpoint (default: localhost:4317)
        
    Returns:
        Tracer instance or None
    """
    if not PHOENIX_AVAILABLE:
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
        
        logger.info(f"Phoenix initialized. UI at http://localhost:6006")
        return trace.get_tracer(project_name)
        
    except Exception as e:
        logger.error(f"Failed to initialize Phoenix: {e}")
        return None


def get_phoenix_tracer(name: str = "rady-genai") -> Optional[trace.Tracer]:
    """Get Phoenix tracer for custom spans."""
    if not PHOENIX_AVAILABLE:
        return None
    return trace.get_tracer(name)
```

### Step 5: Configure Environment

Add to `backend/.env`:

```bash
# Arize Phoenix Configuration
PHOENIX_ENABLED=true
PHOENIX_ENDPOINT=http://localhost:4317
```

### Step 6: Integrate with LangChain

Phoenix automatically instruments LangChain when using OpenTelemetry. Add to your agent initialization:

```python
# In backend/app/agent.py
from app.phoenix_integration import setup_phoenix

# Initialize Phoenix (call once at startup)
setup_phoenix(project_name="rady-genai")
```

### Step 7: Access Phoenix UI

Open http://localhost:6006 to see:
- **Traces**: All LLM calls with inputs/outputs
- **Spans**: Detailed timing for each operation
- **Embeddings**: Vector analysis (if using RAG)

---

## Testing & Verification

### Test All Monitoring Options

Create `backend/test_monitoring.py`:

```python
"""
Test script to verify monitoring integrations are working.

Usage:
    cd backend
    python test_monitoring.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_langsmith():
    """Test LangSmith configuration."""
    print("\n=== Testing LangSmith ===")
    
    tracing = os.getenv("LANGCHAIN_TRACING_V2", "false")
    api_key = os.getenv("LANGCHAIN_API_KEY", "")
    project = os.getenv("LANGCHAIN_PROJECT", "")
    
    if tracing.lower() == "true" and api_key:
        print(f"  ✓ LangSmith enabled")
        print(f"  ✓ Project: {project}")
        print(f"  ✓ API Key: {api_key[:10]}...")
        return True
    else:
        print("  ✗ LangSmith not configured")
        print("    Set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY")
        return False


def test_langfuse():
    """Test LangFuse configuration."""
    print("\n=== Testing LangFuse ===")
    
    try:
        from app.langfuse_integration import get_langfuse_client
        client = get_langfuse_client()
        
        if client:
            print("  ✓ LangFuse client initialized")
            return True
        else:
            print("  ✗ LangFuse not configured")
            print("    Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY")
            return False
    except ImportError:
        print("  ✗ LangFuse not installed")
        print("    Run: pip install langfuse")
        return False


def test_opentelemetry():
    """Test OpenTelemetry configuration."""
    print("\n=== Testing OpenTelemetry ===")
    
    try:
        from app.telemetry import setup_telemetry, get_tracer
        
        otel_enabled = os.getenv("OTEL_ENABLED", "false")
        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
        
        if otel_enabled.lower() == "true":
            print(f"  ✓ OpenTelemetry enabled")
            print(f"  ✓ Endpoint: {endpoint}")
            
            tracer = get_tracer()
            if tracer:
                print("  ✓ Tracer available")
                return True
        
        print("  ✗ OpenTelemetry not enabled")
        print("    Set OTEL_ENABLED=true")
        return False
        
    except ImportError:
        print("  ✗ OpenTelemetry not installed")
        print("    Run: pip install opentelemetry-api opentelemetry-sdk")
        return False


def test_phoenix():
    """Test Arize Phoenix configuration."""
    print("\n=== Testing Arize Phoenix ===")
    
    try:
        from app.phoenix_integration import setup_phoenix
        
        phoenix_enabled = os.getenv("PHOENIX_ENABLED", "false")
        
        if phoenix_enabled.lower() == "true":
            print("  ✓ Phoenix enabled")
            return True
        
        print("  ✗ Phoenix not enabled")
        print("    Set PHOENIX_ENABLED=true")
        return False
        
    except ImportError:
        print("  ✗ Phoenix not installed")
        print("    Run: pip install arize-phoenix")
        return False


def test_prometheus():
    """Test Prometheus metrics endpoint."""
    print("\n=== Testing Prometheus ===")
    
    try:
        import requests
        response = requests.get("http://localhost:8000/metrics", timeout=5)
        
        if response.status_code == 200:
            print("  ✓ Prometheus metrics endpoint available")
            return True
        else:
            print(f"  ✗ Metrics endpoint returned {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ✗ Could not reach metrics endpoint: {e}")
        print("    Make sure the backend is running")
        return False


def main():
    """Run all monitoring tests."""
    print("=" * 60)
    print("MONITORING INTEGRATION TESTS")
    print("=" * 60)
    
    results = []
    
    results.append(("LangSmith", test_langsmith()))
    results.append(("LangFuse", test_langfuse()))
    results.append(("OpenTelemetry", test_opentelemetry()))
    results.append(("Phoenix", test_phoenix()))
    results.append(("Prometheus", test_prometheus()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ CONFIGURED" if passed else "✗ NOT CONFIGURED"
        print(f"  {status}: {name}")
    
    configured = sum(1 for _, passed in results if passed)
    print(f"\n{configured}/{len(results)} monitoring options configured")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

### Run Verification

```bash
cd backend
python test_monitoring.py
```

---

## Troubleshooting

### LangSmith Issues

| Problem | Solution |
|---------|----------|
| No traces appearing | Check `LANGCHAIN_TRACING_V2=true` is set |
| Authentication error | Verify API key is correct |
| Missing project | Create project in LangSmith dashboard first |

### LangFuse Issues

| Problem | Solution |
|---------|----------|
| Connection refused | Ensure LangFuse container is running |
| Database error | Check PostgreSQL container health |
| No traces | Verify public/secret keys are correct |

### OpenTelemetry Issues

| Problem | Solution |
|---------|----------|
| No traces in Jaeger | Check `OTEL_ENABLED=true` |
| Connection refused | Verify Jaeger/Collector is running on port 4317 |
| Missing spans | Ensure FastAPI instrumentation is called |

### Grafana Issues

| Problem | Solution |
|---------|----------|
| Can't login | Default: admin/admin123 |
| No data in dashboards | Check Prometheus is scraping targets |
| Jaeger datasource error | Verify Jaeger URL in datasource config |

### General Docker Issues

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart services
docker-compose restart

# Full reset
docker-compose down -v
docker-compose up -d
```

---

## Quick Reference

### Environment Variables Summary

```bash
# === LangSmith ===
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-key
LANGCHAIN_PROJECT=rady-genai

# === LangFuse ===
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=http://localhost:3001

# === OpenTelemetry ===
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=rady-genai-backend

# === Phoenix ===
PHOENIX_ENABLED=true
PHOENIX_ENDPOINT=http://localhost:4317
```

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| LangFuse | 3001 | http://localhost:3001 |
| Jaeger UI | 16686 | http://localhost:16686 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3002 | http://localhost:3002 |
| Phoenix | 6006 | http://localhost:6006 |
| OTLP gRPC | 4317 | - |
| OTLP HTTP | 4318 | - |

---

## Next Steps

1. **Choose your monitoring option** based on your needs
2. **Follow the step-by-step guide** for that option
3. **Run the test script** to verify configuration
4. **Create dashboards** for your specific metrics
5. **Set up alerts** for critical issues

For questions or issues, refer to the official documentation:
- [LangSmith Docs](https://docs.smith.langchain.com/)
- [LangFuse Docs](https://langfuse.com/docs)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Arize Phoenix Docs](https://docs.arize.com/phoenix/)
