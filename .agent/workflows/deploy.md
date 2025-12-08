---
description: How to deploy the application
---

# Deployment Workflow

This workflow covers deploying the Rady Children's GenAI Agent to different environments.

## 1. Pre-Deployment Checks

### Run all tests
```bash
# Backend tests
cd backend
.\venv\Scripts\activate
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

### Build and verify Docker images
```bash
docker-compose build
docker-compose config
```

## 2. Local Deployment

### Start services with Docker Compose
// turbo
```bash
docker-compose up -d
```

### Verify services are running
// turbo
```bash
docker-compose ps
```

### Check health endpoints
```bash
curl http://localhost:8000/health
curl http://localhost:3000
```

## 3. Staging Deployment (AWS)

### Build production images
```bash
docker-compose -f docker-compose.prod.yml build
```

### Tag and push to ECR
```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com
docker tag rady-backend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-backend:staging
docker tag rady-frontend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-frontend:staging
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-backend:staging
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-frontend:staging
```

### Deploy to ECS
```bash
cd infra
terraform workspace select staging
terraform apply
```

## 4. Production Deployment

### Create release tag
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Build and push production images
```bash
docker-compose -f docker-compose.prod.yml build
docker tag rady-backend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-backend:v1.0.0
docker tag rady-frontend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-frontend:v1.0.0
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-backend:v1.0.0
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/rady-frontend:v1.0.0
```

### Deploy to production ECS
```bash
cd infra
terraform workspace select production
terraform apply
```

## 5. Post-Deployment Verification

### Check application health
```bash
curl https://api.radygenai.com/health
curl https://app.radygenai.com
```

### Monitor logs
```bash
aws logs tail /ecs/rady-backend --follow
aws logs tail /ecs/rady-frontend --follow
```

### Run smoke tests
```bash
cd backend
.\venv\Scripts\activate
pytest tests/smoke/ -v
```

## 6. Rollback Procedure (if needed)

### Revert to previous version
```bash
cd infra
terraform workspace select production
terraform apply -var="backend_image_tag=<previous-version>"
```

### Or use ECS console to rollback
- Go to ECS Console
- Select the service
- Update service with previous task definition

## Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables updated
- [ ] Database migrations applied
- [ ] Documentation updated
- [ ] Monitoring alerts configured
- [ ] Backup created
- [ ] Stakeholders notified
