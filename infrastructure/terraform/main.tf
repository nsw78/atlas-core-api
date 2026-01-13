# ATLAS Infrastructure - Terraform Configuration
# This is a template - customize for your cloud provider

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Provider configuration
# Uncomment and configure for your cloud provider:
# - AWS (EKS)
# - Azure (AKS)
# - GCP (GKE)

# Example for AWS EKS:
# provider "aws" {
#   region = var.aws_region
# }
#
# data "aws_eks_cluster" "atlas" {
#   name = var.cluster_name
# }
#
# provider "kubernetes" {
#   host                   = data.aws_eks_cluster.atlas.endpoint
#   cluster_ca_certificate = base64decode(data.aws_eks_cluster.atlas.certificate_authority[0].data)
#   exec {
#     api_version = "client.authentication.k8s.io/v1beta1"
#     command     = "aws"
#     args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
#   }
# }

# Variables
variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "atlas-cluster"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Outputs
output "cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = "Configure for your provider"
}
