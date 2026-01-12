"""
Monitoring Integration Verification Script

This script tests all monitoring integrations to verify they are properly configured.

Usage:
    cd backend
    python verify_monitoring.py
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
        print(f"  ✓ API Key: {api_key[:10]}..." if len(api_key) > 10 else f"  ✓ API Key: {api_key}")
        return True
    else:
        print("  ✗ LangSmith not configured")
        print("    To enable, set in .env:")
        print("      LANGCHAIN_TRACING_V2=true")
        print("      LANGCHAIN_API_KEY=your-key")
        print("      LANGCHAIN_PROJECT=rady-genai")
        return False


def test_langfuse():
    """Test LangFuse configuration."""
    print("\n=== Testing LangFuse ===")
    
    try:
        from app.langfuse_integration import get_langfuse_client, LANGFUSE_AVAILABLE
        
        if not LANGFUSE_AVAILABLE:
            print("  ✗ LangFuse package not installed")
            print("    Run: pip install langfuse")
            return False
        
        client = get_langfuse_client()
        
        if client:
            host = os.getenv("LANGFUSE_HOST", "http://localhost:3001")
            print("  ✓ LangFuse client initialized")
            print(f"  ✓ Host: {host}")
            return True
        else:
            print("  ✗ LangFuse not configured")
            print("    To enable, set in .env:")
            print("      LANGFUSE_PUBLIC_KEY=pk-lf-xxx")
            print("      LANGFUSE_SECRET_KEY=sk-lf-xxx")
            print("      LANGFUSE_HOST=http://localhost:3001")
            return False
    except ImportError as e:
        print(f"  ✗ LangFuse integration not available: {e}")
        return False


def test_opentelemetry():
    """Test OpenTelemetry configuration."""
    print("\n=== Testing OpenTelemetry ===")
    
    try:
        from app.telemetry import get_tracer, OTEL_AVAILABLE
        
        if not OTEL_AVAILABLE:
            print("  ✗ OpenTelemetry packages not installed")
            print("    Run: pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp")
            return False
        
        otel_enabled = os.getenv("OTEL_ENABLED", "false")
        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
        
        if otel_enabled.lower() == "true":
            print(f"  ✓ OpenTelemetry enabled")
            print(f"  ✓ Endpoint: {endpoint}")
            
            tracer = get_tracer()
            if tracer:
                print("  ✓ Tracer available")
                return True
            else:
                print("  ⚠ Tracer not initialized (call setup_telemetry first)")
                return True  # Config is correct, just not initialized
        
        print("  ✗ OpenTelemetry not enabled")
        print("    To enable, set in .env:")
        print("      OTEL_ENABLED=true")
        print("      OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317")
        return False
        
    except ImportError as e:
        print(f"  ✗ OpenTelemetry integration not available: {e}")
        return False


def test_phoenix():
    """Test Arize Phoenix configuration."""
    print("\n=== Testing Arize Phoenix ===")
    
    try:
        from app.phoenix_integration import is_phoenix_enabled, PHOENIX_AVAILABLE
        
        if not PHOENIX_AVAILABLE:
            print("  ✗ Phoenix package not installed")
            print("    Run: pip install arize-phoenix")
            return False
        
        if is_phoenix_enabled():
            endpoint = os.getenv("PHOENIX_ENDPOINT", "http://localhost:4317")
            print("  ✓ Phoenix enabled")
            print(f"  ✓ Endpoint: {endpoint}")
            print("  ✓ UI: http://localhost:6006")
            return True
        
        print("  ✗ Phoenix not enabled")
        print("    To enable, set in .env:")
        print("      PHOENIX_ENABLED=true")
        print("      PHOENIX_ENDPOINT=http://localhost:4317")
        return False
        
    except ImportError as e:
        print(f"  ✗ Phoenix integration not available: {e}")
        return False


def test_prometheus():
    """Test Prometheus metrics endpoint."""
    print("\n=== Testing Prometheus ===")
    
    try:
        import requests
        response = requests.get("http://localhost:8000/metrics", timeout=5)
        
        if response.status_code == 200:
            print("  ✓ Prometheus metrics endpoint available")
            print("  ✓ URL: http://localhost:8000/metrics")
            return True
        else:
            print(f"  ✗ Metrics endpoint returned {response.status_code}")
            return False
            
    except ImportError:
        print("  ✗ requests package not installed")
        return False
    except Exception as e:
        print(f"  ✗ Could not reach metrics endpoint")
        print(f"    Error: {e}")
        print("    Make sure the backend is running with prometheus-fastapi-instrumentator")
        return False


def test_docker_services():
    """Check if monitoring Docker services are running."""
    print("\n=== Testing Docker Services ===")
    
    services = [
        ("LangFuse", "http://localhost:3001", "LangFuse UI"),
        ("Jaeger", "http://localhost:16686", "Jaeger UI"),
        ("Prometheus", "http://localhost:9090", "Prometheus UI"),
        ("Grafana", "http://localhost:3002", "Grafana UI"),
        ("Phoenix", "http://localhost:6006", "Phoenix UI"),
    ]
    
    try:
        import requests
    except ImportError:
        print("  ✗ requests package not installed, skipping service checks")
        return False
    
    available = 0
    for name, url, description in services:
        try:
            response = requests.get(url, timeout=2)
            if response.status_code < 500:
                print(f"  ✓ {name}: {url}")
                available += 1
            else:
                print(f"  ✗ {name}: Not responding (status {response.status_code})")
        except Exception:
            print(f"  ✗ {name}: Not running")
    
    print(f"\n  {available}/{len(services)} services available")
    return available > 0


def main():
    """Run all monitoring tests."""
    print("=" * 60)
    print("MONITORING INTEGRATION VERIFICATION")
    print("=" * 60)
    print("\nThis script checks if monitoring integrations are configured.")
    print("See MONITORING_DEPLOYMENT_GUIDE.md for setup instructions.")
    
    results = []
    
    results.append(("LangSmith", test_langsmith()))
    results.append(("LangFuse", test_langfuse()))
    results.append(("OpenTelemetry", test_opentelemetry()))
    results.append(("Phoenix", test_phoenix()))
    results.append(("Prometheus", test_prometheus()))
    results.append(("Docker Services", test_docker_services()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ CONFIGURED" if passed else "✗ NOT CONFIGURED"
        print(f"  {status}: {name}")
    
    configured = sum(1 for _, passed in results if passed)
    print(f"\n{configured}/{len(results)} monitoring options configured")
    
    print("\n" + "=" * 60)
    print("QUICK START COMMANDS")
    print("=" * 60)
    print("""
  # Start LangFuse (self-hosted LLM tracing)
  cd monitoring/langfuse && docker-compose up -d

  # Start Jaeger (distributed tracing)
  cd monitoring/jaeger && docker-compose up -d

  # Start Full Stack (Jaeger + Prometheus + Grafana)
  cd monitoring/full-stack && docker-compose up -d

  # Start Phoenix (LLM observability)
  cd monitoring/phoenix && docker-compose up -d
""")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
