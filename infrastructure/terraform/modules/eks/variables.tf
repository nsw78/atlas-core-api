# =============================================================================
# ATLAS Core API - EKS Module Variables
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
  description = "VPC ID where EKS cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for EKS node groups"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for EKS control plane ENIs"
  type        = list(string)
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS API server endpoint is publicly accessible"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDR blocks allowed to access the EKS API server when public"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_enabled_log_types" {
  description = "List of EKS control plane log types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain EKS cluster logs"
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "KMS key ARN for EKS secrets encryption. If empty, a new key is created."
  type        = string
  default     = ""
}

# On-Demand Node Group
variable "on_demand_instance_types" {
  description = "Instance types for the on-demand node group"
  type        = list(string)
  default     = ["m6i.xlarge"]
}

variable "on_demand_desired_size" {
  description = "Desired number of on-demand nodes"
  type        = number
  default     = 3
}

variable "on_demand_min_size" {
  description = "Minimum number of on-demand nodes"
  type        = number
  default     = 2
}

variable "on_demand_max_size" {
  description = "Maximum number of on-demand nodes"
  type        = number
  default     = 6
}

# Spot Node Group
variable "enable_spot_nodes" {
  description = "Enable spot instance node group for cost savings"
  type        = bool
  default     = true
}

variable "spot_instance_types" {
  description = "Instance types for the spot node group (multiple for availability)"
  type        = list(string)
  default     = ["m6i.xlarge", "m5.xlarge", "m5a.xlarge", "m6a.xlarge"]
}

variable "spot_desired_size" {
  description = "Desired number of spot nodes"
  type        = number
  default     = 3
}

variable "spot_min_size" {
  description = "Minimum number of spot nodes"
  type        = number
  default     = 1
}

variable "spot_max_size" {
  description = "Maximum number of spot nodes"
  type        = number
  default     = 10
}

variable "node_disk_size" {
  description = "Disk size in GB for EKS node instances"
  type        = number
  default     = 50
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
