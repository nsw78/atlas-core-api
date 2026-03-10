# =============================================================================
# ATLAS Core API - RDS Module Variables
# =============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the Aurora cluster"
  type        = string
}

variable "data_subnet_ids" {
  description = "Data tier subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "availability_zones" {
  description = "Availability zones for instance placement"
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security group ID of EKS nodes allowed to connect"
  type        = string
}

variable "additional_ingress_cidrs" {
  description = "Additional CIDR blocks allowed to connect to the database"
  type        = list(string)
  default     = []
}

# Engine
variable "engine_version" {
  description = "Aurora PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "engine_version_major" {
  description = "Major version number for parameter group family (e.g., 15)"
  type        = string
  default     = "15"
}

# Database
variable "database_name" {
  description = "Name of the default database to create"
  type        = string
  default     = "atlas"
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "atlas_admin"
  sensitive   = true
}

variable "master_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.master_password) >= 16
    error_message = "Master password must be at least 16 characters long."
  }
}

# Serverless v2 scaling
variable "serverless_min_capacity" {
  description = "Minimum ACU capacity for Serverless v2 (0.5 - 128)"
  type        = number
  default     = 0.5

  validation {
    condition     = var.serverless_min_capacity >= 0.5 && var.serverless_min_capacity <= 128
    error_message = "Serverless min capacity must be between 0.5 and 128 ACUs."
  }
}

variable "serverless_max_capacity" {
  description = "Maximum ACU capacity for Serverless v2 (1 - 128)"
  type        = number
  default     = 16

  validation {
    condition     = var.serverless_max_capacity >= 1 && var.serverless_max_capacity <= 128
    error_message = "Serverless max capacity must be between 1 and 128 ACUs."
  }
}

# Instances
variable "instance_count" {
  description = "Number of Aurora instances (writer + readers)"
  type        = number
  default     = 2
}

# Backup
variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Daily time range for automated backups (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Weekly time range for system maintenance (UTC)"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

# Protection
variable "deletion_protection" {
  description = "Enable deletion protection on the Aurora cluster"
  type        = bool
  default     = true
}

# Monitoring
variable "enhanced_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0 to disable, 1/5/10/15/30/60)"
  type        = number
  default     = 60
}

variable "slow_query_log_threshold" {
  description = "Log queries slower than this many milliseconds"
  type        = string
  default     = "1000"
}

# Encryption
variable "kms_key_arn" {
  description = "KMS key ARN for storage encryption. If empty, a new key is created."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
