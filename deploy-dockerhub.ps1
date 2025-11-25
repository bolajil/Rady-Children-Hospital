# Deploy to DockerHub (PowerShell)
# Usage: .\deploy-dockerhub.ps1 [version]
# Example: .\deploy-dockerhub.ps1 v1.0.0

param(
    [string]$Version = "latest"
)

$DOCKERHUB_USERNAME = "bolajil"

Write-Host "========================================"
Write-Host "  Deploy to DockerHub"
Write-Host "========================================"
Write-Host "Username: $DOCKERHUB_USERNAME"
Write-Host "Version: $Version"
Write-Host ""

# Check if logged in to DockerHub
Write-Host "Checking Docker login..."
$dockerInfo = docker info 2>&1
if ($dockerInfo -notmatch "Username: $DOCKERHUB_USERNAME") {
    Write-Host "Please log in to DockerHub first:"
    docker login
}

# Build Backend
Write-Host ""
Write-Host "Building backend image..."
docker build -t "${DOCKERHUB_USERNAME}/rady-backend:${Version}" ./backend
docker tag "${DOCKERHUB_USERNAME}/rady-backend:${Version}" "${DOCKERHUB_USERNAME}/rady-backend:latest"

# Build Frontend  
Write-Host ""
Write-Host "Building frontend image..."
docker build -t "${DOCKERHUB_USERNAME}/rady-frontend:${Version}" ./frontend
docker tag "${DOCKERHUB_USERNAME}/rady-frontend:${Version}" "${DOCKERHUB_USERNAME}/rady-frontend:latest"

# Push to DockerHub
Write-Host ""
Write-Host "Pushing images to DockerHub..."
docker push "${DOCKERHUB_USERNAME}/rady-backend:${Version}"
docker push "${DOCKERHUB_USERNAME}/rady-backend:latest"

docker push "${DOCKERHUB_USERNAME}/rady-frontend:${Version}"
docker push "${DOCKERHUB_USERNAME}/rady-frontend:latest"

Write-Host ""
Write-Host "========================================"
Write-Host "  ✅ Successfully deployed to DockerHub!"
Write-Host "========================================"
Write-Host ""
Write-Host "Backend Image: ${DOCKERHUB_USERNAME}/rady-backend:${Version}"
Write-Host "Frontend Image: ${DOCKERHUB_USERNAME}/rady-frontend:${Version}"
Write-Host ""
Write-Host "To pull and run:"
Write-Host "  docker pull ${DOCKERHUB_USERNAME}/rady-backend:${Version}"
Write-Host "  docker pull ${DOCKERHUB_USERNAME}/rady-frontend:${Version}"
Write-Host "  docker-compose -f docker-compose.prod.yml up"
Write-Host ""
