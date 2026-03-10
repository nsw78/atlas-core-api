# =============================================================================
# ATLAS Core API - RDS Module Outputs
# =============================================================================

output "cluster_endpoint" {
  description = "Writer endpoint for the Aurora cluster"
  value       = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "Reader endpoint for the Aurora cluster (load-balanced across readers)"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "cluster_id" {
  description = "Identifier of the Aurora cluster"
  value       = aws_rds_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the Aurora cluster"
  value       = aws_rds_cluster.main.arn
}

output "cluster_port" {
  description = "Port of the Aurora cluster"
  value       = aws_rds_cluster.main.port
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_rds_cluster.main.database_name
}

output "master_username" {
  description = "Master username"
  value       = aws_rds_cluster.main.master_username
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID of the Aurora cluster"
  value       = aws_security_group.rds.id
}

output "connection_string" {
  description = "PostgreSQL connection string template (password not included)"
  value       = "postgresql://${aws_rds_cluster.main.master_username}:PASSWORD@${aws_rds_cluster.main.endpoint}:${aws_rds_cluster.main.port}/${aws_rds_cluster.main.database_name}?sslmode=require"
  sensitive   = true
}
