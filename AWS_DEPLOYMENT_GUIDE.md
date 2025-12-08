# AWS Deployment Guide - Rady Children's GenAI Agent

Complete step-by-step guide to deploy the Rady GenAI application to AWS.

---

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] AWS Account with admin access
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] OpenAI API Key

---

## STEP 1: Install Required Tools

### 1.1 Install AWS CLI

**Windows (PowerShell as Administrator):**
```powershell
# Download and install AWS CLI
winget install Amazon.AWSCLI
```

**Verify installation:**
```powershell
aws --version
```
Expected output: `aws-cli/2.x.x Python/3.x.x Windows/10 exe/AMD64`

✅ **Checkpoint:** Run `aws --version` and confirm it shows a version number.

---

### 1.2 Install Terraform

**Windows (PowerShell as Administrator):**
```powershell
# Using winget
winget install Hashicorp.Terraform

# OR using Chocolatey
choco install terraform
```

**Verify installation:**
```powershell
terraform --version
```
Expected output: `Terraform v1.x.x`

✅ **Checkpoint:** Run `terraform --version` and confirm it shows a version number.

---

### 1.3 Verify Docker is Running

```powershell
docker --version
docker ps
```

✅ **Checkpoint:** Both commands should work without errors. `docker ps` should show an empty table or running containers.

---

## STEP 2: Configure AWS Credentials

### 2.1 Get Your AWS Access Keys

1. Go to: https://console.aws.amazon.com/iam/
2. Click **Users** → Select your user (or create one)
3. Click **Security credentials** tab
4. Click **Create access key**
5. Choose **Command Line Interface (CLI)**
6. Save the **Access Key ID** and **Secret Access Key**

### 2.2 Configure AWS CLI

```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY
Default region name [None]: us-west-2
Default output format [None]: json
```

### 2.3 Verify AWS Configuration

```powershell
aws sts get-caller-identity
```

Expected output (with your account info):
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

✅ **Checkpoint:** The command returns your AWS account information without errors.

**⚠️ IMPORTANT:** Note your **Account ID** (the 12-digit number). You'll need it later.

---

## STEP 3: Create Terraform Configuration Files

### 3.1 Navigate to Infrastructure Directory

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\infra
```

### 3.2 Create variables.tf

Create file `infra/variables.tf`:
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "rady-genai"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}
```

### 3.3 Create outputs.tf

Create file `infra/outputs.tf`:
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "backend_ecr_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}
```

✅ **Checkpoint:** You should have 3 files in the `infra/` directory:
- `main.tf`
- `variables.tf`
- `outputs.tf`

---

## STEP 4: Initialize and Deploy Infrastructure

### 4.1 Initialize Terraform

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\infra
terraform init
```

Expected output:
```
Terraform has been successfully initialized!
```

✅ **Checkpoint:** You see "Terraform has been successfully initialized!"

---

### 4.2 Validate Configuration

```powershell
terraform validate
```

Expected output:
```
Success! The configuration is valid.
```

✅ **Checkpoint:** You see "Success! The configuration is valid."

---

### 4.3 Preview Infrastructure Changes

```powershell
terraform plan
```

This shows what AWS resources will be created:
- 1 VPC
- 2 ECR repositories (backend, frontend)
- 1 ECS cluster

Review the plan output carefully.

✅ **Checkpoint:** The plan shows resources to be created without errors.

---

### 4.4 Deploy Infrastructure

```powershell
terraform apply
```

When prompted, type `yes` and press Enter.

**This will take 1-3 minutes.**

Expected output at the end:
```
Apply complete! Resources: 4 added, 0 changed, 0 destroyed.

Outputs:
backend_ecr_url = "123456789012.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend"
frontend_ecr_url = "123456789012.dkr.ecr.us-west-2.amazonaws.com/rady-genai-frontend"
ecs_cluster_arn = "arn:aws:ecs:us-west-2:123456789012:cluster/rady-genai-cluster"
ecs_cluster_name = "rady-genai-cluster"
vpc_id = "vpc-xxxxxxxxx"
```

✅ **Checkpoint:** You see "Apply complete!" and the output values.

### 4.5 Save Outputs for Later

```powershell
terraform output > terraform-outputs.txt
terraform output -json > terraform-outputs.json
```

**⚠️ IMPORTANT:** Copy the `backend_ecr_url` and `frontend_ecr_url` values. You'll need them in the next steps.

---

## STEP 5: Build Docker Images

### 5.1 Build Backend Image

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\backend
docker build -t rady-backend:latest .
```

**This will take 3-5 minutes on first build.**

✅ **Checkpoint:** Build completes with "Successfully built" message.

---

### 5.2 Build Frontend Image

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\frontend
docker build -t rady-frontend:latest .
```

**This will take 3-5 minutes on first build.**

✅ **Checkpoint:** Build completes with "Successfully built" message.

---

### 5.3 Verify Images Exist

```powershell
docker images | findstr rady
```

Expected output:
```
rady-frontend   latest   abc123def456   1 minute ago    XXX MB
rady-backend    latest   789ghi012jkl   2 minutes ago   XXX MB
```

✅ **Checkpoint:** Both `rady-backend` and `rady-frontend` images are listed.

---

## STEP 6: Push Images to AWS ECR

### 6.1 Get Your AWS Account ID

```powershell
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
echo "Your Account ID: $ACCOUNT_ID"
```

### 6.2 Login to ECR

```powershell
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com"
```

Expected output:
```
Login Succeeded
```

✅ **Checkpoint:** You see "Login Succeeded"

---

### 6.3 Tag Backend Image

```powershell
# Replace YOUR_ACCOUNT_ID with your actual 12-digit AWS account ID
docker tag rady-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest
```

**Example with actual account ID:**
```powershell
docker tag rady-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest
```

### 6.4 Push Backend Image

```powershell
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest
```

**This will take 2-5 minutes depending on your internet speed.**

✅ **Checkpoint:** Push completes with "latest: digest: sha256:..." message.

---

### 6.5 Tag Frontend Image

```powershell
docker tag rady-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/rady-genai-frontend:latest
```

### 6.6 Push Frontend Image

```powershell
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/rady-genai-frontend:latest
```

✅ **Checkpoint:** Push completes with "latest: digest: sha256:..." message.

---

### 6.7 Verify Images in ECR

```powershell
aws ecr describe-images --repository-name rady-genai-backend --region us-west-2
aws ecr describe-images --repository-name rady-genai-frontend --region us-west-2
```

✅ **Checkpoint:** Both commands return JSON with image details.

---

## STEP 7: Verify Deployment in AWS Console

### 7.1 Check ECR Repositories

1. Go to: https://us-west-2.console.aws.amazon.com/ecr/repositories
2. You should see:
   - `rady-genai-backend` (with 1 image)
   - `rady-genai-frontend` (with 1 image)

### 7.2 Check ECS Cluster

1. Go to: https://us-west-2.console.aws.amazon.com/ecs/home
2. Click **Clusters**
3. You should see: `rady-genai-cluster`

### 7.3 Check VPC

1. Go to: https://us-west-2.console.aws.amazon.com/vpc/home
2. Click **Your VPCs**
3. You should see: `rady-genai-vpc`

✅ **Checkpoint:** All three resources exist in the AWS Console.

---

## STEP 8: Create ECS Task Definition (Optional - For Full Deployment)

> **Note:** This step creates the actual running service. Skip if you only need the images in ECR.

### 8.1 Create Task Definition File

Create file `infra/task-definition.json`:
```json
{
  "family": "rady-genai-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/rady-genai-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "OPENAI_API_KEY",
          "value": "YOUR_OPENAI_API_KEY"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rady-backend",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Replace:**
- `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID
- `YOUR_OPENAI_API_KEY` with your actual OpenAI API key

### 8.2 Create ECS Task Execution Role (if not exists)

```powershell
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 8.3 Create CloudWatch Log Group

```powershell
aws logs create-log-group --log-group-name /ecs/rady-backend --region us-west-2
```

### 8.4 Register Task Definition

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\infra
aws ecs register-task-definition --cli-input-json file://task-definition.json --region us-west-2
```

✅ **Checkpoint:** Task definition is registered successfully.

---

## Cleanup (When Done Testing)

To delete all AWS resources and stop charges:

```powershell
cd c:\Users\bolaf\.gemini\antigravity\scratch\rady-genai\infra
terraform destroy
```

Type `yes` when prompted.

---

## Troubleshooting

### Error: "No credentials"
```powershell
aws configure
# Re-enter your credentials
```

### Error: "Access Denied"
Your IAM user needs these permissions:
- `AmazonEC2FullAccess`
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `IAMFullAccess` (for creating roles)

### Error: Docker build fails
```powershell
# Ensure Docker Desktop is running
docker info

# Try rebuilding without cache
docker build --no-cache -t rady-backend:latest .
```

### Error: ECR login fails
```powershell
# Ensure region matches
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
```

---

## Quick Reference Commands

```powershell
# Check AWS identity
aws sts get-caller-identity

# List ECR images
aws ecr describe-images --repository-name rady-genai-backend --region us-west-2

# View Terraform state
terraform show

# Refresh outputs
terraform output
```

---

## Summary of Created AWS Resources

| Resource | Name | Purpose |
|----------|------|---------|
| VPC | rady-genai-vpc | Network isolation |
| ECR Repository | rady-genai-backend | Backend Docker images |
| ECR Repository | rady-genai-frontend | Frontend Docker images |
| ECS Cluster | rady-genai-cluster | Container orchestration |

---

**Created:** December 2025  
**For:** Rady Children's Health GenAI Agent
