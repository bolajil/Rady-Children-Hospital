"""
AWS Monitoring Integration for Rady GenAI Backend
- CloudWatch Logs via Watchtower
- AWS X-Ray for distributed tracing
- CloudWatch Metrics (via embedded metric format)

Enable by setting AWS_MONITORING_ENABLED=true in environment variables.
"""

import os
import logging
from functools import wraps

# Check if AWS monitoring is enabled
AWS_MONITORING_ENABLED = os.getenv("AWS_MONITORING_ENABLED", "false").lower() == "true"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SERVICE_NAME = os.getenv("SERVICE_NAME", "rady-genai-backend")

logger = logging.getLogger(__name__)

# X-Ray tracing
xray_recorder = None
XRayMiddleware = None

# CloudWatch logging
cloudwatch_handler = None

def setup_aws_monitoring(app=None):
    """
    Initialize AWS monitoring components.
    Call this function during app startup when deploying to AWS.
    """
    global xray_recorder, XRayMiddleware, cloudwatch_handler
    
    if not AWS_MONITORING_ENABLED:
        logger.info("AWS monitoring disabled. Set AWS_MONITORING_ENABLED=true to enable.")
        return False
    
    try:
        # Setup X-Ray
        from aws_xray_sdk.core import xray_recorder as recorder
        from aws_xray_sdk.core import patch_all
        from aws_xray_sdk.ext.fastapi.middleware import XRayMiddleware as Middleware
        
        xray_recorder = recorder
        XRayMiddleware = Middleware
        
        # Configure X-Ray
        xray_recorder.configure(
            service=SERVICE_NAME,
            sampling=True,
            context_missing='LOG_ERROR',
            daemon_address=os.getenv("XRAY_DAEMON_ADDRESS", "127.0.0.1:2000")
        )
        
        # Patch common libraries for automatic tracing
        patch_all()
        
        # Add X-Ray middleware to FastAPI
        if app:
            app.add_middleware(XRayMiddleware, recorder=xray_recorder)
            logger.info(f"AWS X-Ray enabled for service: {SERVICE_NAME}")
        
    except ImportError as e:
        logger.warning(f"AWS X-Ray SDK not available: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize X-Ray: {e}")
    
    try:
        # Setup CloudWatch Logs
        import watchtower
        
        cloudwatch_handler = watchtower.CloudWatchLogHandler(
            log_group=f"/aws/ecs/{SERVICE_NAME}",
            stream_name=f"{SERVICE_NAME}-{os.getenv('HOSTNAME', 'local')}",
            create_log_group=True,
            log_group_retention_days=30
        )
        
        # Add CloudWatch handler to root logger
        logging.root.addHandler(cloudwatch_handler)
        logger.info(f"CloudWatch Logs enabled: /aws/ecs/{SERVICE_NAME}")
        
    except ImportError as e:
        logger.warning(f"Watchtower not available: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize CloudWatch Logs: {e}")
    
    return True


def xray_trace(name: str = None):
    """
    Decorator to trace a function with X-Ray.
    
    Usage:
        @xray_trace("my-operation")
        def my_function():
            pass
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if xray_recorder and AWS_MONITORING_ENABLED:
                with xray_recorder.in_subsegment(name or func.__name__):
                    return await func(*args, **kwargs)
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if xray_recorder and AWS_MONITORING_ENABLED:
                with xray_recorder.in_subsegment(name or func.__name__):
                    return func(*args, **kwargs)
            return func(*args, **kwargs)
        
        if asyncio_iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def asyncio_iscoroutinefunction(func):
    """Check if function is async."""
    import asyncio
    return asyncio.iscoroutinefunction(func)


def put_metric(metric_name: str, value: float, unit: str = "Count", dimensions: dict = None):
    """
    Emit a CloudWatch metric using Embedded Metric Format (EMF).
    This allows emitting metrics via logs without needing PutMetricData API calls.
    
    Usage:
        put_metric("ChatRequests", 1, "Count", {"Endpoint": "/chat"})
    """
    if not AWS_MONITORING_ENABLED:
        return
    
    import json
    import time
    
    dimensions = dimensions or {}
    dimensions["ServiceName"] = SERVICE_NAME
    
    metric_data = {
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": f"RadyGenAI/{SERVICE_NAME}",
                "Dimensions": [list(dimensions.keys())],
                "Metrics": [{
                    "Name": metric_name,
                    "Unit": unit
                }]
            }]
        },
        metric_name: value,
        **dimensions
    }
    
    # EMF logs are automatically parsed by CloudWatch
    print(json.dumps(metric_data))


def log_llm_request(model: str, prompt_tokens: int, completion_tokens: int, latency_ms: float):
    """
    Log LLM request metrics for CloudWatch.
    """
    if not AWS_MONITORING_ENABLED:
        return
    
    put_metric("LLMRequests", 1, "Count", {"Model": model})
    put_metric("PromptTokens", prompt_tokens, "Count", {"Model": model})
    put_metric("CompletionTokens", completion_tokens, "Count", {"Model": model})
    put_metric("LLMLatency", latency_ms, "Milliseconds", {"Model": model})


def log_rag_query(query_type: str, num_results: int, latency_ms: float):
    """
    Log RAG query metrics for CloudWatch.
    """
    if not AWS_MONITORING_ENABLED:
        return
    
    put_metric("RAGQueries", 1, "Count", {"QueryType": query_type})
    put_metric("RAGResults", num_results, "Count", {"QueryType": query_type})
    put_metric("RAGLatency", latency_ms, "Milliseconds", {"QueryType": query_type})
