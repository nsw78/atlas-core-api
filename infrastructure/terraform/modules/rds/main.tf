# =============================================================================
# ATLAS Core API - RDS Module
# Aurora PostgreSQL Serverless v2 with PostGIS, multi-AZ, encrypted
# =============================================================================

locals {
  cluster_name = "${var.project_name}-${var.environment}-aurora"
}

# -----------------------------------------------------------------------------
# DB Subnet Group
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${local.cluster_name}-subnet-group"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, {
    Name = "${local.cluster_name}-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name_prefix = "${local.cluster_name}-"
  vpc_id      = var.vpc_id
  description = "Security group for Aurora PostgreSQL cluster"

  tags = merge(var.tags, {
    Name = "${local.cluster_name}-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "rds_ingress" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_security_group_id
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL access from EKS nodes"
}

resource "aws_security_group_rule" "rds_ingress_cidr" {
  count = length(var.additional_ingress_cidrs) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = var.additional_ingress_cidrs
  security_group_id = aws_security_group.rds.id
  description       = "PostgreSQL access from additional CIDRs"
}

# -----------------------------------------------------------------------------
# KMS Key for Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "rds" {
  count = var.kms_key_arn == "" ? 1 : 0

  description             = "KMS key for Aurora cluster ${local.cluster_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${local.cluster_name}-kms"
  })
}

resource "aws_kms_alias" "rds" {
  count = var.kms_key_arn == "" ? 1 : 0

  name          = "alias/${local.cluster_name}"
  target_key_id = aws_kms_key.rds[0].key_id
}

locals {
  kms_key_arn = var.kms_key_arn != "" ? var.kms_key_arn : aws_kms_key.rds[0].arn
}

# -----------------------------------------------------------------------------
# Parameter Group with PostGIS
# -----------------------------------------------------------------------------
resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${local.cluster_name}-params"
  family      = "aurora-postgresql${var.engine_version_major}"
  description = "Aurora PostgreSQL parameter group with PostGIS for ATLAS"

  # PostGIS and spatial extensions
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,pgaudit"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = var.slow_query_log_threshold
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "pgaudit.log"
    value = "ddl,role"
  }

  parameter {
    name         = "pgaudit.role"
    value        = "rds_pgaudit"
    apply_method = "pending-reboot"
  }

  tags = var.tags
}

resource "aws_db_parameter_group" "main" {
  name        = "${local.cluster_name}-instance-params"
  family      = "aurora-postgresql${var.engine_version_major}"
  description = "Aurora PostgreSQL instance parameter group for ATLAS"

  parameter {
    name  = "log_min_duration_statement"
    value = var.slow_query_log_threshold
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Aurora PostgreSQL Serverless v2 Cluster
# -----------------------------------------------------------------------------
resource "aws_rds_cluster" "main" {
  cluster_identifier = local.cluster_name
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = var.engine_version
  database_name      = var.database_name
  master_username    = var.master_username
  master_password    = var.master_password

  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  # Serverless v2 scaling
  serverlessv2_scaling_configuration {
    min_capacity = var.serverless_min_capacity
    max_capacity = var.serverless_max_capacity
  }

  # Encryption
  storage_encrypted = true
  kms_key_id        = local.kms_key_arn

  # Backup
  backup_retention_period      = var.backup_retention_period
  preferred_backup_window      = var.preferred_backup_window
  preferred_maintenance_window = var.preferred_maintenance_window
  copy_tags_to_snapshot        = true

  # Protection
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.cluster_name}-final-${formatdate("YYYY-MM-DD", timestamp())}" : null

  # IAM authentication
  iam_database_authentication_enabled = true

  # Performance Insights
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = local.cluster_name
  })

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

# -----------------------------------------------------------------------------
# Aurora Instances (Serverless v2)
# -----------------------------------------------------------------------------
resource "aws_rds_cluster_instance" "main" {
  count = var.instance_count

  identifier           = "${local.cluster_name}-${count.index}"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_parameter_group_name = aws_db_parameter_group.main.name

  # Spread across AZs for HA
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]

  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = local.kms_key_arn

  # Monitoring
  monitoring_interval = var.enhanced_monitoring_interval
  monitoring_role_arn = var.enhanced_monitoring_interval > 0 ? aws_iam_role.rds_monitoring[0].arn : null

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name = "${local.cluster_name}-${count.index}"
  })
}

# -----------------------------------------------------------------------------
# Enhanced Monitoring IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "rds_monitoring" {
  count = var.enhanced_monitoring_interval > 0 ? 1 : 0

  name = "${local.cluster_name}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enhanced_monitoring_interval > 0 ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring[0].name
}
