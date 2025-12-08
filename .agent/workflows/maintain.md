---
description: How to maintain the Rady Children's GenAI Agent
---

# Maintenance Workflow

This workflow covers regular maintenance tasks for the Rady Children's GenAI Agent application.

## 1. Update Dependencies

### Backend (Python)
```bash
cd backend
.\venv\Scripts\activate
pip list --outdated
pip install --upgrade pip
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt
```

### Frontend (Next.js)
```bash
cd frontend
npm outdated
npm update
npm audit fix
```

## 2. Run Tests

### Backend Tests
```bash
cd backend
.\venv\Scripts\activate
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 3. Check Code Quality

### Backend Linting
```bash
cd backend
.\venv\Scripts\activate
flake8 app/
black app/ --check
mypy app/
```

### Frontend Linting
```bash
cd frontend
npm run lint
```

## 4. Security Audit

### Check for vulnerabilities
```bash
# Backend
cd backend
pip-audit

# Frontend
cd frontend
npm audit
```

## 5. Database Maintenance

### Backup Vector Database
```bash
# Create backup of FAISS index
cd backend/app/data
mkdir -p backups
copy vector_store\* backups\vector_store_backup_$(date +%Y%m%d)
```

### Optimize Database
```bash
# Re-index documents if needed
cd backend
.\venv\Scripts\activate
python -m app.scripts.reindex_documents
```

## 6. Monitor Application Health

### Check Docker containers
// turbo
```bash
docker-compose ps
docker-compose logs --tail=100
```

### Check resource usage
```bash
docker stats --no-stream
```

## 7. Update Documentation

- Review and update README.md with any new features
- Update API documentation in OpenAPI/Swagger
- Check that environment variables are documented in .env.example

## 8. Clean Up

### Remove unused Docker resources
// turbo
```bash
docker system prune -f
docker volume prune -f
```

### Clean Python cache
```bash
cd backend
find . -type d -name "__pycache__" -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### Clean Node modules cache
```bash
cd frontend
npm cache clean --force
```

## 9. Backup Configuration

### Create backup of important configs
```bash
mkdir -p backups/config_$(date +%Y%m%d)
copy .env backups\config_$(date +%Y%m%d)\.env
copy docker-compose.yml backups\config_$(date +%Y%m%d)\docker-compose.yml
```

## 10. Review Logs

### Check application logs for errors
```bash
# Backend logs
cd backend
Get-Content app/logs/app.log -Tail 100

# Docker logs
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100
```

## Maintenance Schedule

- **Daily**: Check logs, monitor health
- **Weekly**: Security audit, update dependencies
- **Monthly**: Full backup, code quality check, documentation review
- **Quarterly**: Major dependency updates, performance optimization
