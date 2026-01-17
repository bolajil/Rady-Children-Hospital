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

output "alb_dns_name" {
  description = "ALB DNS name - use this URL to access the app"
  value       = aws_lb.main.dns_name
}

output "backend_url" {
  description = "Backend API URL (port 80)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "frontend_url" {
  description = "Frontend App URL (port 3000)"
  value       = "http://${aws_lb.main.dns_name}:3000"
}

output "api_docs_url" {
  description = "API Documentation URL"
  value       = "http://${aws_lb.main.dns_name}/docs"
}

output "langfuse_url" {
  description = "LangFuse Observability Dashboard URL (if enabled)"
  value       = var.langfuse_enabled ? "http://${aws_lb.main.dns_name}:3001" : "LangFuse not enabled - set langfuse_enabled=true"
}
