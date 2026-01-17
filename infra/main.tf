provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "rady-genai-vpc"
  }
}

# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name         = "rady-genai-backend"
  force_delete = true
}

resource "aws_ecr_repository" "frontend" {
  name         = "rady-genai-frontend"
  force_delete = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rady-genai-cluster"
}

# S3 Bucket for Patient Data (Encrypted)
# Using unique bucket name with account ID suffix
resource "aws_s3_bucket" "patient_data" {
  bucket = "rady-childrens-genai-137738968757"
  
  tags = {
    Name        = "rady-childrens-genai-data"
    Environment = "production"
    Project     = "rady-genai"
    HIPAA       = "true"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "patient_data" {
  bucket = aws_s3_bucket.patient_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

