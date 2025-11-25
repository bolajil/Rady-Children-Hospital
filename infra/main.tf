provider "aws" {
  region = "us-west-2"
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
  name = "rady-genai-backend"
}

resource "aws_ecr_repository" "frontend" {
  name = "rady-genai-frontend"
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rady-genai-cluster"
}

# S3 Bucket for Patient Data (Encrypted)
resource "aws_s3_bucket" "patient_data" {
  bucket = "rady-genai-patient-data-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "patient_data" {
  bucket = aws_s3_bucket.patient_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}
