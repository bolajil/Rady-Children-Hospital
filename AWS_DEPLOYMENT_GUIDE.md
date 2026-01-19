# AWS Deployment Guide - Rady Children's GenAI Agent

Complete step-by-step guide to deploy the Rady GenAI application to AWS.

**Region:** `us-east-1` (N. Virginia)  
**Account ID:** `137738968757`

---

## 🚀 Live Deployment URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://rady-genai-alb-443036289.us-east-1.elb.amazonaws.com:3000 |
| **Backend API** | http://rady-genai-alb-443036289.us-east-1.elb.amazonaws.com |
| **API Docs** | http://rady-genai-alb-443036289.us-east-1.elb.amazonaws.com/docs |
| **LangFuse (Cloud)** | https://us.cloud.langfuse.com |

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor@example.com | doctorpass |
| Owner | owner@example.com | ownerpass |

---

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] AWS Account with admin access
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] OpenAI API Key
- [ ] Terraform installed

---

## 📋 Deployment TODO Checklist

### Phase 1: Infrastructure Setup
- [ ] Install AWS CLI and configure credentials
- [ ] Install Terraform
- [ ] Clone the repository
- [ ] Create `.env` file with required variables

### Phase 2: AWS Resources
- [ ] Create ECR repositories (backend, frontend)
- [ ] Build and push Docker images to ECR
- [ ] Create VPC and networking resources
- [ ] Create ECS cluster
- [ ] Store secrets in AWS Secrets Manager

### Phase 3: Deploy Services
- [ ] Deploy backend ECS service
- [ ] Deploy frontend ECS service
- [ ] Configure Application Load Balancer
- [ ] Verify health checks pass

### Phase 4: Monitoring Setup
- [ ] Enable `OTEL_ENABLED=true` in task definition
- [ ] Configure CloudWatch log groups
- [ ] Set up LangFuse Cloud for LLM observability
- [ ] Create CloudWatch alarms for critical metrics
- [ ] Test distributed tracing (verify traces in LangFuse)

### Phase 5: Verification
- [ ] Test frontend at ALB URL:3000
- [ ] Test backend health at ALB URL/health
- [ ] Test chat functionality
- [ ] Verify LangFuse receives traces
- [ ] Check CloudWatch logs for errors

### Phase 6: Production Hardening (Optional)
- [ ] Enable HTTPS with ACM certificate
- [ ] Configure custom domain (Route 53)
- [ ] Set up auto-scaling policies
- [ ] Enable AWS WAF for security
- [ ] Configure backup for any databases

---

## STEP 1: Install Required Tools

### 1.1 Install AWS CLI

**Windows (PowerShell as Administrator):**
```powershell
winget install Amazon.AWSCLI
```

**Verify installation:**
```bash
aws --version
```

✅ **Checkpoint:** Shows `aws-cli/2.x.x`

---

### 1.2 Install Terraform

```powershell
winget install Hashicorp.Terraform
```

**⚠️ Restart your terminal after installation!**

**Verify:**
```bash
terraform --version
```

✅ **Checkpoint:** Shows `Terraform v1.x.x`

---

### 1.3 Verify Docker

```bash
docker --version
docker ps
```

✅ **Checkpoint:** Both commands work without errors.

---

## STEP 2: Configure AWS Credentials

### 2.1 Configure AWS CLI

```bash
aws configure
```

Enter:
```
AWS Access Key ID: YOUR_ACCESS_KEY_ID
AWS Secret Access Key: YOUR_SECRET_ACCESS_KEY
Default region name: us-east-1
Default output format: json
```

### 2.2 Verify Configuration

```bash
aws sts get-caller-identity
```

✅ **Checkpoint:** Returns your account info with Account ID `137738968757`

---

## STEP 3: Create ECR Repositories (Terraform Phase 1)

> ⚠️ **Important:** We deploy in TWO phases:
> 1. First create ECR repos (to store Docker images)
> 2. Build & push images
> 3. Then create ECS services (which need the images)

### 3.1 Navigate to Infrastructure Directory

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/infra
```

### 3.2 Initialize Terraform

```bash
terraform init
```

✅ **Checkpoint:** "Terraform has been successfully initialized!"

### 3.3 Create ECR Repositories Only

```bash
terraform apply -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend
```

Type `yes` when prompted. **This takes ~30 seconds.**

✅ **Checkpoint:** "Apply complete!" with ECR repositories created.

---

## STEP 4: Build Docker Images

### 4.1 Build Backend

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/backend
docker build -t rady-genai-backend:latest .
```

**Expected time:** ~3-5 minutes (first build may take longer)

### 4.2 Build Frontend

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/frontend
docker build -t rady-genai-frontend:latest .
```

### 4.3 Verify Images

```bash
docker images | grep rady
```

✅ **Checkpoint:** Both `rady-genai-backend` and `rady-genai-frontend` listed.

---

## STEP 5: Push Images to AWS ECR

### 5.1 Login to ECR

**Git Bash:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 137738968757.dkr.ecr.us-east-1.amazonaws.com
```

**PowerShell:**
```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "137738968757.dkr.ecr.us-east-1.amazonaws.com"
```

✅ **Checkpoint:** "Login Succeeded"

### 5.2 Tag and Push Backend

```bash
docker tag rady-genai-backend:latest 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-backend:latest
docker push 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-backend:latest
```

### 5.3 Tag and Push Frontend

```bash
docker tag rady-genai-frontend:latest 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-frontend:latest
docker push 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-frontend:latest
```

✅ **Checkpoint:** Both pushes complete with "digest: sha256:..." message.

### 5.4 Verify Images in ECR

```bash
aws ecr describe-images --repository-name rady-genai-backend --region us-east-1
aws ecr describe-images --repository-name rady-genai-frontend --region us-east-1
```

---

## STEP 6: Configure API Keys (AWS Secrets Manager)

Store your API keys securely in AWS Secrets Manager.

### 6.1 Create OpenAI API Key Secret

**First time setup:**
```bash
aws secretsmanager create-secret \
  --name rady-genai/openai-api-key \
  --description "OpenAI API Key for Rady GenAI" \
  --secret-string "sk-your-actual-openai-api-key" \
  --region us-east-1
```

**Update existing secret:**
```bash
aws secretsmanager put-secret-value \
  --secret-id rady-genai/openai-api-key \
  --secret-string "sk-your-actual-openai-api-key" \
  --region us-east-1
```
aws secretsmanager get-secret-value --secret-id rady-genai/openai-api-key --region us-east-1
### 6.2 Create LangFuse API Keys Secret (LLM Observability)

LangFuse provides observability for LLM calls including latency, token usage, and quality scores.

**Option A: Self-hosted LangFuse on AWS**
Deploy LangFuse as part of your stack and create API keys in the LangFuse UI.

**Option B: LangFuse Cloud**
Sign up at https://cloud.langfuse.com and get API keys.

```bash
# Store LangFuse credentials as JSON
aws secretsmanager create-secret \
  --name rady-genai/langfuse-keys \
  --description "LangFuse API Keys for LLM Observability" \
  --secret-string '{"public_key":"pk-lf-your-key","secret_key":"sk-lf-your-key","host":"https://your-langfuse-host"}' \
  --region us-east-1
```

✅ **Checkpoint:** Both secrets created successfully

> ⚠️ **Security Note:** Never commit API keys to Git. The ECS task pulls these secrets at runtime.

---

## STEP 7: Deploy Full Infrastructure (Terraform Phase 2)

Now that images are in ECR and secrets are configured, deploy the rest.

### 7.1 Enable LangFuse (Optional but Recommended)

To deploy self-hosted LangFuse for LLM observability, create a `terraform.tfvars` file:

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/infra
```

**Git Bash / Linux / Mac:**
```bash
echo 'langfuse_enabled = true' > terraform.tfvars
```

**PowerShell:**
```powershell
Set-Content -Path terraform.tfvars -Value 'langfuse_enabled = true'
```

This will deploy:
- RDS PostgreSQL database for LangFuse
- ECS Fargate service running LangFuse
- ALB listener on port 3001

### 7.2 Deploy All Resources

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/infra
terraform init   # Only needed if not done in Step 3
terraform apply
```

Type `yes` when prompted. **This takes 5-8 minutes** (longer if LangFuse enabled due to RDS).

✅ **Checkpoint:** "Apply complete!" with outputs showing:
- `backend_url`
- `frontend_url`
- `alb_dns_name`
- `langfuse_url` (if enabled)

### 7.2 Wait for ECS Services to Start

ECS services need ~2-3 minutes to pull images and pass health checks.

```bash
# Check service status
aws ecs describe-services --cluster rady-genai-cluster --services rady-genai-backend-service rady-genai-frontend-service --region us-east-1 --query "services[*].{name:serviceName,running:runningCount,desired:desiredCount}"
```

✅ **Checkpoint:** `runningCount` equals `desiredCount` (both = 1)

---

## STEP 8: Test the Deployment

### 8.1 Get Application URLs

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/infra
terraform output
```

This returns:
```
backend_url  = "http://rady-genai-alb-xxxxx.us-east-1.elb.amazonaws.com"
frontend_url = "http://rady-genai-alb-xxxxx.us-east-1.elb.amazonaws.com:3000"
api_docs_url = "http://rady-genai-alb-xxxxx.us-east-1.elb.amazonaws.com/docs"
```

### 8.2 Test Frontend (Main App)

Open in browser:
```
http://<ALB_DNS_NAME>:3000
```

✅ **Checkpoint:** You see the Rady GenAI chat interface

### 8.3 Test Backend Health

```bash
curl http://<ALB_DNS_NAME>/health
```

Expected response:
```json
{"status": "healthy"}
```

### 8.4 Test API Docs

Open in browser:
```
http://<ALB_DNS_NAME>/docs
```

✅ **Checkpoint:** You see the FastAPI Swagger documentation

### 8.5 Check ECS Service Status

```bash
# List running tasks
aws ecs list-tasks --cluster rady-genai-cluster --region us-east-1

# Check backend service
aws ecs describe-services --cluster rady-genai-cluster --services rady-genai-backend-service --region us-east-1

# Check frontend service
aws ecs describe-services --cluster rady-genai-cluster --services rady-genai-frontend-service --region us-east-1
```

### 8.6 View Logs

```bash
# Backend logs
aws logs tail //ecs/rady-backend --region us-east-1 --follow

# Frontend logs
aws logs tail //ecs/rady-frontend --region us-east-1 --follow
```

---

## STEP 9: Verify in AWS Console

### 9.1 ECR Repositories
https://us-east-1.console.aws.amazon.com/ecr/repositories

### 9.2 ECS Cluster
https://us-east-1.console.aws.amazon.com/ecs/home

### 9.3 Load Balancer
https://us-east-1.console.aws.amazon.com/ec2/home#LoadBalancers

### 9.4 CloudWatch Logs
https://us-east-1.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

### 9.5 Secrets Manager
https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets

✅ **Checkpoint:** All resources visible in AWS Console.

---

## Updating an Existing Deployment

When you make code changes and want to deploy them to AWS:

### Step 1: Build New Docker Images

```bash
cd ~/.gemini/antigravity/scratch/rady-genai

# Build backend
docker build -t rady-genai-backend:latest ./backend

# Build frontend
docker build -t rady-genai-frontend:latest ./frontend
```

### Step 2: Login to ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 137738968757.dkr.ecr.us-east-1.amazonaws.com
```

### Step 3: Tag and Push Images

```bash
# Tag and push backend
docker tag rady-genai-backend:latest 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-backend:latest
docker push 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-backend:latest

# Tag and push frontend
docker tag rady-genai-frontend:latest 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-frontend:latest
docker push 137738968757.dkr.ecr.us-east-1.amazonaws.com/rady-genai-frontend:latest
```

### Step 4: Force New Deployment

```bash
# Update backend service
aws ecs update-service \
  --cluster rady-genai-cluster \
  --service rady-genai-backend-service \
  --force-new-deployment \
  --region us-east-1

# Update frontend service
aws ecs update-service \
  --cluster rady-genai-cluster \
  --service rady-genai-frontend-service \
  --force-new-deployment \
  --region us-east-1
```

### Step 5: Monitor Deployment

```bash
# Watch service status
aws ecs describe-services \
  --cluster rady-genai-cluster \
  --services rady-genai-backend-service rady-genai-frontend-service \
  --region us-east-1 \
  --query "services[*].{name:serviceName,running:runningCount,desired:desiredCount,pending:pendingCount}"
```

✅ **Checkpoint:** `runningCount` matches `desiredCount` for both services (takes 2-3 minutes)

---

## Cleanup (Stop AWS Charges)

```bash
cd ~/.gemini/antigravity/scratch/rady-genai/infra
terraform destroy
```

Type `yes` when prompted. **This deletes ALL AWS resources.**

---

## Troubleshooting

### Error: "No credentials"
```bash
aws configure
```

### Error: "404 Not Found" when pushing to ECR
- Verify region is `us-east-1` (not us-east-2 or us-west-1)
- Run `terraform apply` first to create ECR repos

### Error: Git Bash converts paths (e.g., `/ecs/` becomes `C:/Program Files/Git/ecs/`)
Use double slashes or MSYS_NO_PATHCONV:
```bash
MSYS_NO_PATHCONV=1 aws logs create-log-group --log-group-name /ecs/rady-backend --region us-east-1
```

### Error: "Access Denied"
Add these IAM policies to your user:
- `AmazonEC2FullAccess`
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `IAMFullAccess`
- `ElasticLoadBalancingFullAccess`

### ECS Task Fails to Start
Check CloudWatch logs:
```bash
aws logs tail //ecs/rady-backend --region us-east-1
```

### Docker build fails
```bash
docker info  # Ensure Docker Desktop is running
docker build --no-cache -t rady-genai-backend:latest .
```

---

## Quick Reference Commands

```bash
# Check AWS identity
aws sts get-caller-identity

# List ECR images
aws ecr describe-images --repository-name rady-genai-backend --region us-east-1

# View ECS tasks
aws ecs list-tasks --cluster rady-genai-cluster --region us-east-1

# Get app URL
terraform output app_url

# View logs
aws logs tail //ecs/rady-backend --region us-east-1 --follow

# Destroy all resources
terraform destroy
```

---

## Monitoring & Observability (AWS)

### Environment Variables for Monitoring

Add these to your ECS task definitions or Secrets Manager:

```env
# Enable OpenTelemetry tracing
OTEL_ENABLED=true
OTEL_SERVICE_NAME=rady-genai-backend
OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317
```

### CloudWatch Logs

View application logs:
```bash
# Backend logs
aws logs tail /ecs/rady-backend --region us-east-1 --follow

# Frontend logs
aws logs tail /ecs/rady-frontend --region us-east-1 --follow
```

### LangFuse (LLM Observability)

For AWS deployment, use LangFuse Cloud:
1. Sign up at https://cloud.langfuse.com
2. Create a project and get API keys
3. Add to Secrets Manager:
   - `LANGFUSE_PUBLIC_KEY`
   - `LANGFUSE_SECRET_KEY`
   - `LANGFUSE_HOST=https://cloud.langfuse.com`

### AWS X-Ray (Alternative to Jaeger)

For production AWS deployments, consider AWS X-Ray:
```bash
# Enable X-Ray in ECS task definition
aws ecs update-service --cluster rady-genai-cluster \
  --service rady-genai-backend-service \
  --enable-execute-command
```

### CloudWatch Metrics

Monitor these metrics in CloudWatch:
- `ECS/CPUUtilization` - Container CPU usage
- `ECS/MemoryUtilization` - Container memory usage
- `ALB/RequestCount` - Request throughput
- `ALB/TargetResponseTime` - API latency

---

## Summary of AWS Resources

| Resource | Name | Purpose |
|----------|------|---------|
| VPC | rady-genai-vpc | Network isolation |
| Subnets | rady-genai-public-1/2 | Public networking |
| Internet Gateway | rady-genai-igw | Internet access |
| ALB | rady-genai-alb | Load balancer |
| ECR | rady-genai-backend | Backend images |
| ECR | rady-genai-frontend | Frontend images |
| ECS Cluster | rady-genai-cluster | Container orchestration |
| ECS Service | rady-genai-backend-service | Running backend |
| ECS Service | rady-genai-frontend-service | Running frontend |
| S3 | rady-childrens-genai-137738968757 | Patient data (HIPAA) |
| CloudWatch | /ecs/rady-backend, /ecs/rady-frontend | Application logs |
| Secrets Manager | rady-genai/openai-api-key | OpenAI API key |
| Secrets Manager | rady-genai/langfuse-keys | LangFuse API keys |
| RDS PostgreSQL | rady-genai-langfuse-db | LangFuse database (if enabled) |
| ECS Service | rady-genai-langfuse-service | LangFuse UI (if enabled) |

---

## Estimated Monthly Costs

| Resource | Cost |
|----------|------|
| ALB | ~$16 |
| ECS Fargate (2 tasks) | ~$30 |
| ECR | < $1 |
| CloudWatch | < $1 |
| Secrets Manager | < $1 |
| **Subtotal (without LangFuse)** | **~$50/month** |
| RDS db.t3.micro (LangFuse) | ~$15 |
| ECS Fargate (LangFuse) | ~$15 |
| **Total (with LangFuse)** | **~$80/month** |

*Use `terraform destroy` when not testing to avoid charges.*

---

**Updated:** January 17, 2026  
**Region:** us-east-1  
**Status:** ✅ Deployed and Working
**For:** Rady Children's Health GenAI Agent
