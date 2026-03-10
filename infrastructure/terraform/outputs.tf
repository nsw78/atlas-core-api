# ATLAS Infrastructure Outputs

output "cluster_endpoint" {
  description = "Kubernetes/ECS cluster endpoint"
  value       = "Configure for your provider"
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = "Configure after applying with AWS provider"
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = "Configure after applying with AWS provider"
}

output "kafka_bootstrap_brokers" {
  description = "MSK Kafka bootstrap broker connection string"
  value       = "Configure after applying with AWS provider"
}

output "vpc_id" {
  description = "VPC ID"
  value       = "Configure after applying with AWS provider"
}

output "private_subnet_ids" {
  description = "Private subnet IDs for service deployment"
  value       = "Configure after applying with AWS provider"
}

output "public_subnet_ids" {
  description = "Public subnet IDs for load balancers"
  value       = "Configure after applying with AWS provider"
}

output "environment" {
  description = "Current deployment environment"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}
