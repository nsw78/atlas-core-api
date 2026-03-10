# =============================================================================
# ATLAS Core API - Production Environment
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
    key            = "environments/production/terraform.tfstate"
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
      Environment = "production"
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
  environment        = "production"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  db_subnet_cidrs      = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false # HA - one NAT per AZ

  tags = { Environment = "production" }
}

# -----------------------------------------------------------------------------
# EKS Cluster
# -----------------------------------------------------------------------------

module "eks" {
  source = "../../modules/eks"

  project_name = "atlas"
  environment  = "production"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  cluster_version    = "1.28"
  node_instance_type = "m5.2xlarge"
  node_min_size      = 6
  node_max_size      = 30
  node_desired_size  = 10

  enable_istio      = true
  enable_monitoring = true

  # Production-grade: Spot + On-Demand mix
  spot_instance_types = ["m5.2xlarge", "m5a.2xlarge", "m5d.2xlarge"]
  spot_max_size       = 20
  spot_desired_size   = 5

  tags = { Environment = "production" }
}

# -----------------------------------------------------------------------------
# Aurora PostgreSQL (Multi-AZ)
# -----------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  project_name = "atlas"
  environment  = "production"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.db_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  instance_class = "db.r6g.xlarge"
  instance_count = 3 # 1 writer + 2 readers

  database_name   = "atlas"
  master_username = "atlas_admin"

  backup_retention_period    = 35
  deletion_protection        = true
  performance_insights       = true
  enhanced_monitoring_interval = 15

  # Encryption at rest
  storage_encrypted = true

  tags = { Environment = "production" }
}

# -----------------------------------------------------------------------------
# ElastiCache Redis (Cluster Mode)
# -----------------------------------------------------------------------------

module "redis" {
  source = "../../modules/redis"

  project_name = "atlas"
  environment  = "production"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  node_type            = "cache.r6g.xlarge"
  num_cache_nodes      = 3
  engine_version       = "7.0"
  automatic_failover   = true
  multi_az             = true
  at_rest_encryption   = true
  transit_encryption   = true
  snapshot_retention   = 7

  tags = { Environment = "production" }
}

# -----------------------------------------------------------------------------
# Amazon MSK (Kafka) - Production
# -----------------------------------------------------------------------------

module "kafka" {
  source = "../../modules/kafka"

  project_name = "atlas"
  environment  = "production"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  broker_count    = 6
  instance_type   = "kafka.m5.2xlarge"
  ebs_volume_size = 500
  kafka_version   = "3.5.1"

  encryption_in_transit      = "TLS"
  enhanced_monitoring        = "PER_TOPIC_PER_BROKER"
  auto_create_topics         = false
  default_replication_factor = 3
  min_insync_replicas        = 2
  log_retention_hours        = 336 # 14 days

  tags = { Environment = "production" }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  value = module.networking.vpc_id
}

output "eks_cluster_endpoint" {
  value     = module.eks.cluster_endpoint
  sensitive = true
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value     = module.rds.cluster_endpoint
  sensitive = true
}

output "rds_reader_endpoint" {
  value     = module.rds.reader_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = module.redis.primary_endpoint
  sensitive = true
}

output "kafka_bootstrap_brokers" {
  value     = module.kafka.bootstrap_brokers_tls
  sensitive = true
}
