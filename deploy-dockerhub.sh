#!/bin/bash
# Deploy to DockerHub
# Usage: ./deploy-dockerhub.sh [version]
# Example: ./deploy-dockerhub.sh v1.0.0

set -e

DOCKERHUB_USERNAME="bolajil"
VERSION=${1:-latest}

echo "========================================"
echo "  Deploy to DockerHub"
echo "========================================"
echo "Username: $DOCKERHUB_USERNAME"
echo "Version: $VERSION"
echo ""

# Check if logged in to DockerHub
echo "Checking Docker login..."
if ! docker info | grep -q "Username: $DOCKERHUB_USERNAME"; then
    echo "Please log in to DockerHub first:"
    docker login
fi

# Build Backend
echo ""
echo "Building backend image..."
docker build -t $DOCKERHUB_USERNAME/rady-backend:$VERSION ./backend
docker tag $DOCKERHUB_USERNAME/rady-backend:$VERSION $DOCKERHUB_USERNAME/rady-backend:latest

# Build Frontend  
echo ""
echo "Building frontend image..."
docker build -t $DOCKERHUB_USERNAME/rady-frontend:$VERSION ./frontend
docker tag $DOCKERHUB_USERNAME/rady-frontend:$VERSION $DOCKERHUB_USERNAME/rady-frontend:latest

# Push to DockerHub
echo ""
echo "Pushing images to DockerHub..."
docker push $DOCKERHUB_USERNAME/rady-backend:$VERSION
docker push $DOCKERHUB_USERNAME/rady-backend:latest

docker push $DOCKERHUB_USERNAME/rady-frontend:$VERSION
docker push $DOCKERHUB_USERNAME/rady-frontend:latest

echo ""
echo "========================================"
echo "  ✅ Successfully deployed to DockerHub!"
echo "========================================"
echo ""
echo "Backend Image: $DOCKERHUB_USERNAME/rady-backend:$VERSION"
echo "Frontend Image: $DOCKERHUB_USERNAME/rady-frontend:$VERSION"
echo ""
echo "To pull and run:"
echo "  docker pull $DOCKERHUB_USERNAME/rady-backend:$VERSION"
echo "  docker pull $DOCKERHUB_USERNAME/rady-frontend:$VERSION"
echo "  docker-compose -f docker-compose.prod.yml up"
echo ""
