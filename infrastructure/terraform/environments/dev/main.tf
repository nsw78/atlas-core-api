# =============================================================================
# ATLAS Core API - Development Environment
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }

  backend "s3" {
    bucket         = "atlas-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "atlas-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "atlas-core-api"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------

module "networking" {
  source = "../../modules/networking"

  project_name       = "atlas"
  environment        = "dev"
  vpc_cidr           = "10.10.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]

  public_subnet_cidrs  = ["10.10.1.0/24", "10.10.2.0/24"]
  private_subnet_cidrs = ["10.10.10.0/24", "10.10.11.0/24"]
  db_subnet_cidrs      = ["10.10.20.0/24", "10.10.21.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # Cost saving for dev

  tags = { Environment = "dev" }
}

# -----------------------------------------------------------------------------
# EKS Cluster
# -----------------------------------------------------------------------------

module "eks" {
  source = "../../modules/eks"

  project_name = "atlas"
  environment  = "dev"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  cluster_version    = "1.28"
  node_instance_type = "t3.large"
  node_min_size      = 2
  node_max_size      = 5
  node_desired_size  = 3

  enable_istio     = true
  enable_monitoring = true

  tags = { Environment = "dev" }
}

# -----------------------------------------------------------------------------
# Aurora PostgreSQL
# -----------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  project_name = "atlas"
  environment  = "dev"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.db_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  instance_class = "db.t3.medium"
  instance_count = 1 # Single instance for dev

  database_name   = "atlas"
  master_username = "atlas_admin"

  backup_retention_period = 7
  deletion_protection     = false # Allow easy teardown in dev

  tags = { Environment = "dev" }
}

# -----------------------------------------------------------------------------
# ElastiCache Redis
# -----------------------------------------------------------------------------

module "redis" {
  source = "../../modules/redis"

  project_name = "atlas"
  environment  = "dev"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  node_type       = "cache.t3.medium"
  num_cache_nodes = 1 # Single node for dev
  engine_version  = "7.0"

  tags = { Environment = "dev" }
}

# -----------------------------------------------------------------------------
# Amazon MSK (Kafka)
# -----------------------------------------------------------------------------

module "kafka" {
  source = "../../modules/kafka"

  project_name = "atlas"
  environment  = "dev"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  broker_count    = 2 # Minimal for dev
  instance_type   = "kafka.t3.small"
  ebs_volume_size = 50

  auto_create_topics         = true # Convenience for dev
  default_replication_factor = 2
  min_insync_replicas        = 1

  tags = { Environment = "dev" }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  value = module.networking.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value     = module.rds.cluster_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value = module.redis.primary_endpoint
}

output "kafka_bootstrap_brokers" {
  value = module.kafka.bootstrap_brokers_tls
}
