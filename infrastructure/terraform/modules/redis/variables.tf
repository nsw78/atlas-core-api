# =============================================================================
# ATLAS Core API - Redis Module Variables
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
  description = "VPC ID for the Redis cluster"
  type        = string
}

variable "data_subnet_ids" {
  description = "Data tier subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security group ID of EKS nodes allowed to connect"
  type        = string
}

# Engine
variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "engine_version_major" {
  description = "Major engine version for parameter group family (e.g., 7)"
  type        = string
  default     = "7"
}

variable "node_type" {
  description = "ElastiCache node instance type"
  type        = string
  default     = "cache.r6g.large"
}

# Cluster configuration
variable "num_node_groups" {
  description = "Number of node groups (shards) for cluster mode"
  type        = number
  default     = 1
}

variable "replicas_per_node_group" {
  description = "Number of read replicas per node group"
  type        = number
  default     = 1
}

variable "multi_az_enabled" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

# Encryption
variable "transit_encryption_enabled" {
  description = "Enable in-transit encryption (TLS)"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Auth token (password) for Redis when transit encryption is enabled. Must be 16-128 chars."
  type        = string
  default     = null
  sensitive   = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for at-rest encryption. If empty, a new key is created."
  type        = string
  default     = ""
}

# Maintenance
variable "maintenance_window" {
  description = "Weekly maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots (0 to disable)"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for automatic snapshots"
  type        = string
  default     = "03:00-04:00"
}

# Alarms
variable "enable_alarms" {
  description = "Enable CloudWatch alarms for Redis metrics"
  type        = bool
  default     = false
}

variable "alarm_actions" {
  description = "SNS topic ARNs for alarm notifications"
  type        = list(string)
  default     = []
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization percentage threshold for alarm"
  type        = number
  default     = 80
}

variable "memory_alarm_threshold" {
  description = "Memory usage percentage threshold for alarm"
  type        = number
  default     = 80
}

variable "notification_topic_arn" {
  description = "SNS topic ARN for ElastiCache event notifications"
  type        = string
  default     = null
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
