# -----------------------------------------------------------------------------
# Amazon MSK (Kafka) - Variables
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for MSK cluster"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for MSK broker nodes (one per AZ)"
  type        = list(string)
}

variable "broker_count" {
  description = "Number of Kafka broker nodes"
  type        = number
  default     = 3
}

variable "instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.5.1"
}

variable "ebs_volume_size" {
  description = "EBS volume size per broker in GB"
  type        = number
  default     = 100
}

variable "encryption_in_transit" {
  description = "Encryption setting for data in transit (TLS, TLS_PLAINTEXT, PLAINTEXT)"
  type        = string
  default     = "TLS"
}

variable "enhanced_monitoring" {
  description = "Enhanced MSK monitoring level"
  type        = string
  default     = "PER_TOPIC_PER_BROKER"
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to MSK"
  type        = list(string)
  default     = []
}

variable "auto_create_topics" {
  description = "Enable auto topic creation"
  type        = bool
  default     = false
}

variable "default_replication_factor" {
  description = "Default replication factor for topics"
  type        = number
  default     = 3
}

variable "min_insync_replicas" {
  description = "Minimum in-sync replicas"
  type        = number
  default     = 2
}

variable "log_retention_hours" {
  description = "Kafka log retention in hours"
  type        = number
  default     = 168
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
