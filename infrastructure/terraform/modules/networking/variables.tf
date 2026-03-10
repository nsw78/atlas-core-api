# =============================================================================
# ATLAS Core API - Networking Module Variables
# =============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for VPC endpoint service names"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones. If empty, the first 3 available AZs are used."
  type        = list(string)
  default     = []
}

variable "cluster_name" {
  description = "EKS cluster name, used for subnet tagging"
  type        = string
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway (cost saving for non-production). Set to false for HA in production."
  type        = bool
  default     = true
}

variable "enable_vpc_endpoints" {
  description = "Enable VPC Interface Endpoints for ECR, STS, and CloudWatch Logs"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs to CloudWatch"
  type        = bool
  default     = false
}

variable "flow_log_retention_days" {
  description = "Number of days to retain VPC flow logs in CloudWatch"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
