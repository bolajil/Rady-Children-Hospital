variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
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

# ==================== LANGFUSE CONFIGURATION ====================

variable "langfuse_enabled" {
  description = "Enable LangFuse self-hosted deployment"
  type        = bool
  default     = false
}

variable "langfuse_db_instance_class" {
  description = "RDS instance class for LangFuse database"
  type        = string
  default     = "db.t3.micro"
}

variable "langfuse_db_allocated_storage" {
  description = "Allocated storage for LangFuse database (GB)"
  type        = number
  default     = 20
}

# ==================== OPENTELEMETRY CONFIGURATION ====================

variable "otel_enabled" {
  description = "Enable OpenTelemetry infrastructure monitoring"
  type        = bool
  default     = false
}
