# Observability & Monitoring Deployment Guide

## Rady Children's GenAI Application

This guide covers all monitoring and observability deployment options for production use.

---

## Quick Reference

| Option | LLM Tracing | Infrastructure Metrics | Cost | HIPAA Compliant | Setup Time |
|--------|-------------|----------------------|------|-----------------|------------|
| **Option A:** Docker (Local/Dev) | ✅ LangFuse | ✅ OTEL + Grafana | Free | ✅ Self-hosted | 10 min |
| **Option B:** AWS Self-Hosted | ✅ LangFuse | ✅ CloudWatch | ~$50/mo | ✅ Your infra | 30 min |
| **Option C:** AWS + LangFuse Cloud | ✅ LangFuse Cloud | ✅ CloudWatch | ~$30/mo + usage | ⚠️ Check BAA | 15 min |

---

## Option A: Docker Compose (Local Development / On-Premise)

### Best For:
- Local development and testing
- On-premise deployments
- Full control over all data
- **100% HIPAA compliant** (all data stays on your infrastructure)

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Network                               │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Frontend │───▶│ Backend  │───▶│  Redis   │                   │
│  │  :3000   │    │  :8000   │    │  :6379   │                   │
│  └──────────┘    └────┬─────┘    └──────────┘                   │
│                       │                                          │
│         ┌─────────────┼─────────────┐                           │
│         ▼             ▼             ▼                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ LangFuse │  │   OTEL   │  │ Prometheus│                      │
│  │  :3001   │  │ Collector│  │  :9090    │                      │
│  └────┬─────┘  └────┬─────┘  └─────┬────┘                       │
│       │             │              │                             │
│       ▼             ▼              ▼                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Postgres │  │  Jaeger  │  │ Grafana  │                       │
│  │  :5432   │  │  :16686  │  │  :3002   │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Services & Ports

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| Frontend | 3000 | Next.js App | http://localhost:3000 |
| Backend | 8000 | FastAPI API | http://localhost:8000 |
| LangFuse | 3001 | LLM Tracing UI | http://localhost:3001 |
| Jaeger | 16686 | Distributed Tracing | http://localhost:16686 |
| Prometheus | 9090 | Metrics | http://localhost:9090 |
| Grafana | 3002 | Dashboards | http://localhost:3002 |

### Deployment Steps

#### Step 1: Configure Environment Variables

Create/update `.env` in the project root:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-key

# LangFuse (generate after first login)
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx

# LangFuse Secrets (auto-generated if not set)
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars-long
SALT=your-salt-value-min-32-characters-long

# OpenTelemetry (optional)
OTEL_ENABLED=true
```

#### Step 2: Start All Services

```bash
# Start everything
docker-compose up -d

# Or start specific profiles
docker-compose up -d backend frontend redis langfuse langfuse-db  # LangFuse only
docker-compose up -d backend frontend redis otel-collector jaeger prometheus grafana  # OTEL only
```

#### Step 3: Configure LangFuse

1. Open http://localhost:3001
2. Create admin account (first user)
3. Create project: `rady-genai`
4. Go to **Settings → API Keys**
5. Create new API key pair
6. Update `.env` with the keys
7. Restart backend: `docker-compose restart backend`

#### Step 4: Configure Grafana

1. Open http://localhost:3002
2. Login: `admin` / `admin`
3. Datasources are auto-configured (Prometheus + Jaeger)
4. Import dashboards or create custom ones

#### Step 5: Verify Integration

```bash
# Check all services are running
docker-compose ps

# Test LangFuse tracing
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is asthma?", "session_id": "test-123"}'

# Check LangFuse UI for traces
# Check Jaeger UI for distributed traces
# Check Grafana for metrics
```

### Resource Requirements

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Backend | 0.5 | 512MB | - |
| Frontend | 0.5 | 512MB | - |
| LangFuse | 0.5 | 512MB | - |
| LangFuse DB | 0.25 | 256MB | 1GB |
| OTEL Collector | 0.25 | 256MB | - |
| Jaeger | 0.5 | 512MB | 1GB |
| Prometheus | 0.25 | 256MB | 5GB |
| Grafana | 0.25 | 256MB | 100MB |
| **Total** | **3 cores** | **3GB** | **7GB** |

---

## Option B: AWS Self-Hosted (Production - Full Control)

### Best For:
- Production deployments requiring full data control
- Organizations with strict HIPAA requirements
- Teams wanting to avoid third-party data processing
- **100% HIPAA compliant** (all data in your AWS account)

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS VPC                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Application Load Balancer                     ││
│  │   :80 (Backend)  :3000 (Frontend)  :3001 (LangFuse)        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ ECS Fargate  │    │ ECS Fargate  │    │ ECS Fargate  │      │
│  │   Backend    │    │   Frontend   │    │   LangFuse   │      │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘      │
│         │                                        │              │
│         │            ┌──────────────┐           │              │
│         └───────────▶│   RDS        │◀──────────┘              │
│                      │  PostgreSQL  │                           │
│                      └──────────────┘                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    CloudWatch                              │  │
│  │   Logs │ Metrics │ Alarms │ Dashboards                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### AWS Resources Created

| Resource | Type | Purpose | Est. Cost/mo |
|----------|------|---------|--------------|
| ECS Cluster | Fargate | Container orchestration | $0 |
| Backend Task | 0.5 vCPU, 1GB | API server | ~$15 |
| Frontend Task | 0.5 vCPU, 1GB | Next.js app | ~$15 |
| LangFuse Task | 0.5 vCPU, 1GB | Tracing UI | ~$15 |
| RDS PostgreSQL | db.t3.micro | LangFuse database | ~$15 |
| ALB | Application | Load balancing | ~$20 |
| CloudWatch | Logs/Metrics | Monitoring | ~$5 |
| **Total** | | | **~$85/mo** |

### Deployment Steps

#### Step 1: Enable LangFuse in Terraform

Create `infra/terraform.tfvars`:

```hcl
langfuse_enabled = true
langfuse_db_instance_class = "db.t3.micro"
langfuse_db_allocated_storage = 20
```

#### Step 2: Deploy Infrastructure

```bash
cd infra

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply
```

#### Step 3: Get LangFuse URL

```bash
# Get ALB DNS name
terraform output alb_dns_name

# LangFuse will be available at:
# http://<alb-dns-name>:3001
```

#### Step 4: Configure LangFuse

1. Open `http://<alb-dns-name>:3001`
2. Create admin account
3. Create project and API keys
4. Store keys in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name rady-genai/langfuse-api-keys \
  --secret-string '{"public_key":"pk-lf-xxx","secret_key":"sk-lf-xxx"}'
```

#### Step 5: Update Backend Task Definition

Add LangFuse environment variables to `infra/ecs-service.tf`:

```hcl
environment = [
  {
    name  = "LANGFUSE_HOST"
    value = "http://${aws_lb.main.dns_name}:3001"
  }
]
secrets = [
  {
    name      = "LANGFUSE_PUBLIC_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:rady-genai/langfuse-api-keys:public_key::"
  },
  {
    name      = "LANGFUSE_SECRET_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:rady-genai/langfuse-api-keys:secret_key::"
  }
]
```

#### Step 6: Redeploy Backend

```bash
# Force new deployment
aws ecs update-service \
  --cluster rady-genai-cluster \
  --service rady-genai-backend-service \
  --force-new-deployment
```

### CloudWatch Integration

CloudWatch is automatically configured for:
- **Container Logs:** `/ecs/rady-backend`, `/ecs/rady-frontend`, `/ecs/rady-langfuse`
- **ECS Metrics:** CPU, Memory, Task count
- **ALB Metrics:** Request count, latency, error rates

Create CloudWatch Dashboard:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name "Rady-GenAI-Overview" \
  --dashboard-body file://monitoring/cloudwatch-dashboard.json
```

---

## Option C: AWS + LangFuse Cloud (Production - Simplified)

### Best For:
- Teams wanting managed LLM tracing
- Faster setup without database management
- Organizations with LangFuse Cloud BAA (check with LangFuse)
- **⚠️ Verify HIPAA compliance with LangFuse before using for PHI**

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS VPC                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Application Load Balancer                     ││
│  │          :80 (Backend)    :3000 (Frontend)                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│       ┌──────────────┐              ┌──────────────┐           │
│       │ ECS Fargate  │              │ ECS Fargate  │           │
│       │   Backend    │──────────────│   Frontend   │           │
│       └──────┬───────┘              └──────────────┘           │
│              │                                                   │
└──────────────┼───────────────────────────────────────────────────┘
               │
               ▼ HTTPS
┌──────────────────────────────────────────────────────────────────┐
│                    LangFuse Cloud                                 │
│                  https://cloud.langfuse.com                       │
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │   Traces    │  │  Analytics  │  │  Dashboards │             │
│   └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

### AWS Resources Created

| Resource | Type | Purpose | Est. Cost/mo |
|----------|------|---------|--------------|
| ECS Cluster | Fargate | Container orchestration | $0 |
| Backend Task | 0.5 vCPU, 1GB | API server | ~$15 |
| Frontend Task | 0.5 vCPU, 1GB | Next.js app | ~$15 |
| ALB | Application | Load balancing | ~$20 |
| CloudWatch | Logs/Metrics | Monitoring | ~$5 |
| **AWS Total** | | | **~$55/mo** |
| LangFuse Cloud | | LLM Tracing | **Usage-based** |

### Deployment Steps

#### Step 1: Create LangFuse Cloud Account

1. Go to https://cloud.langfuse.com
2. Sign up and create organization
3. Create project: `rady-genai-prod`
4. Go to **Settings → API Keys**
5. Copy Public Key and Secret Key

#### Step 2: Store Keys in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name rady-genai/langfuse-cloud \
  --secret-string '{
    "public_key": "pk-lf-your-cloud-key",
    "secret_key": "sk-lf-your-cloud-secret"
  }'
```

#### Step 3: Update Backend Environment

In `infra/ecs-service.tf`, update the backend container definition:

```hcl
environment = [
  {
    name  = "LANGFUSE_HOST"
    value = "https://cloud.langfuse.com"
  }
]
secrets = [
  {
    name      = "OPENAI_API_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:137738968757:secret:rady-genai/openai-api-key-xxx"
  },
  {
    name      = "LANGFUSE_PUBLIC_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:137738968757:secret:rady-genai/langfuse-cloud:public_key::"
  },
  {
    name      = "LANGFUSE_SECRET_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:137738968757:secret:rady-genai/langfuse-cloud:secret_key::"
  }
]
```

#### Step 4: Deploy

```bash
cd infra
terraform apply

# Or if already deployed, force update:
aws ecs update-service \
  --cluster rady-genai-cluster \
  --service rady-genai-backend-service \
  --force-new-deployment
```

#### Step 5: Verify

1. Make a test request to the backend
2. Check LangFuse Cloud dashboard for traces
3. Verify CloudWatch logs show "LangFuse tracing enabled"

---

## OpenTelemetry Infrastructure Monitoring

### What It Provides

| Feature | Tool | Description |
|---------|------|-------------|
| Distributed Tracing | Jaeger | Track requests across services |
| Metrics | Prometheus | CPU, memory, request latency |
| Dashboards | Grafana | Visualize all metrics |
| Alerting | Grafana/CloudWatch | Alert on anomalies |

### Backend Integration

The backend already includes OpenTelemetry instrumentation in `backend/app/telemetry.py`:

```python
# Enable in .env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=rady-genai-backend
```

### Key Metrics Collected

| Metric | Description |
|--------|-------------|
| `http_request_duration_seconds` | API response times |
| `http_requests_total` | Total request count |
| `llm_call_duration_seconds` | LLM API latency |
| `phi_detections_total` | PHI guardrail activations |
| `active_sessions` | Current user sessions |

### Grafana Dashboard Setup

1. Open Grafana at http://localhost:3002 (or your deployed URL)
2. Go to **Dashboards → Import**
3. Import the pre-built dashboard from `monitoring/otel/grafana/dashboards/`

---

## Comparison Summary

### When to Use Each Option

| Scenario | Recommended Option |
|----------|-------------------|
| Local development | **Option A** (Docker) |
| Demo/POC | **Option A** (Docker) |
| Production with strict HIPAA | **Option B** (AWS Self-Hosted) |
| Production, fast setup | **Option C** (AWS + LangFuse Cloud) |
| On-premise deployment | **Option A** (Docker) |
| Multi-region deployment | **Option B** or **C** |

### Feature Comparison

| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| LLM Tracing | ✅ | ✅ | ✅ |
| Cost Tracking | ✅ | ✅ | ✅ |
| Prompt Debugging | ✅ | ✅ | ✅ |
| Infrastructure Metrics | ✅ Grafana | ✅ CloudWatch | ✅ CloudWatch |
| Distributed Tracing | ✅ Jaeger | ⚠️ X-Ray (extra) | ⚠️ X-Ray (extra) |
| Data Location | Your servers | Your AWS | LangFuse servers |
| Setup Complexity | Low | Medium | Low |
| Maintenance | You | You | LangFuse |

---

## Troubleshooting

### LangFuse Not Receiving Traces

1. **Check SDK version:** Must be `langfuse>=2.0.0,<3.0.0`
2. **Verify environment variables:**
   ```bash
   docker-compose exec backend env | grep LANGFUSE
   ```
3. **Check backend logs:**
   ```bash
   docker-compose logs backend | grep -i langfuse
   ```
4. **Test connectivity:**
   ```bash
   docker-compose exec backend curl http://langfuse:3000/api/public/health
   ```

### Jaeger Not Showing Traces

1. **Check OTEL_ENABLED:** Must be `true`
2. **Verify collector is running:**
   ```bash
   docker-compose logs otel-collector
   ```
3. **Check Jaeger health:**
   ```bash
   curl http://localhost:16686/api/services
   ```

### Grafana No Data

1. **Check Prometheus targets:**
   - Open http://localhost:9090/targets
   - All targets should be "UP"
2. **Verify datasource:**
   - Grafana → Configuration → Data Sources → Test

---

## Security Considerations

### For HIPAA Compliance

1. **Option A & B:** All data stays on your infrastructure ✅
2. **Option C:** Verify LangFuse Cloud BAA before processing PHI ⚠️

### Recommended Security Settings

```yaml
# docker-compose.yml additions for production
services:
  langfuse:
    environment:
      - AUTH_DISABLE_SIGNUP=true  # Disable public signup
      - LANGFUSE_ENABLE_EXPERIMENTAL_FEATURES=false
  
  grafana:
    environment:
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
```

### Network Security (AWS)

- LangFuse DB in private subnet (no public access)
- All secrets in AWS Secrets Manager
- ALB with HTTPS (add ACM certificate)
- Security groups restrict access

---

## Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local deployment with all services |
| `infra/langfuse.tf` | AWS Terraform for self-hosted LangFuse |
| `infra/variables.tf` | Terraform variables |
| `monitoring/otel/otel-collector-config.yaml` | OTEL Collector config |
| `monitoring/otel/prometheus.yml` | Prometheus scrape config |
| `monitoring/otel/grafana/provisioning/` | Grafana auto-config |
| `backend/app/langfuse_integration.py` | LangFuse SDK integration |
| `backend/app/telemetry.py` | OpenTelemetry integration |
| `backend/requirements.txt` | Python dependencies |

---

## Next Steps

1. **Choose your deployment option** based on requirements
2. **Follow the deployment steps** for your chosen option
3. **Configure alerts** in Grafana or CloudWatch
4. **Set up dashboards** for your team
5. **Document runbooks** for incident response

For questions or issues, refer to:
- [LangFuse Documentation](https://langfuse.com/docs)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
