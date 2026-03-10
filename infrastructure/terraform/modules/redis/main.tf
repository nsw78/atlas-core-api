# =============================================================================
# ATLAS Core API - Redis Module
# ElastiCache Redis with cluster mode, multi-AZ, encryption at rest + transit
# =============================================================================

locals {
  name = "${var.project_name}-${var.environment}-redis"
}

# -----------------------------------------------------------------------------
# Subnet Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-subnet-group"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, {
    Name = "${local.name}-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name_prefix = "${local.name}-"
  vpc_id      = var.vpc_id
  description = "Security group for ElastiCache Redis"

  tags = merge(var.tags, {
    Name = "${local.name}-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "redis_ingress" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_security_group_id
  security_group_id        = aws_security_group.redis.id
  description              = "Redis access from EKS nodes"
}

resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.redis.id
  description       = "Allow all outbound"
}

# -----------------------------------------------------------------------------
# KMS Key for Encryption at Rest
# -----------------------------------------------------------------------------
resource "aws_kms_key" "redis" {
  count = var.kms_key_arn == "" ? 1 : 0

  description             = "KMS key for ElastiCache Redis ${local.name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${local.name}-kms"
  })
}

resource "aws_kms_alias" "redis" {
  count = var.kms_key_arn == "" ? 1 : 0

  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.redis[0].key_id
}

locals {
  kms_key_arn = var.kms_key_arn != "" ? var.kms_key_arn : aws_kms_key.redis[0].arn
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "main" {
  name   = "${local.name}-params"
  family = "redis${var.engine_version_major}"

  description = "Redis parameter group for ATLAS ${var.environment}"

  # Optimized for microservices caching and session management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# ElastiCache Redis Replication Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = local.name
  description          = "ATLAS ${var.environment} Redis cluster"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Cluster configuration
  num_node_groups         = var.num_node_groups
  replicas_per_node_group = var.replicas_per_node_group

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Multi-AZ
  automatic_failover_enabled = var.num_node_groups > 1 || var.replicas_per_node_group > 0
  multi_az_enabled           = var.multi_az_enabled

  # Encryption
  at_rest_encryption_enabled = true
  kms_key_id                 = local.kms_key_arn
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled ? var.auth_token : null

  # Maintenance
  maintenance_window       = var.maintenance_window
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  auto_minor_version_upgrade = true

  # Notifications
  notification_topic_arn = var.notification_topic_arn

  tags = merge(var.tags, {
    Name = local.name
  })

  lifecycle {
    ignore_changes = [num_node_groups]
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${local.name}-high-cpu"
  alarm_description   = "Redis CPU utilization above ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${local.name}-high-memory"
  alarm_description   = "Redis memory usage above ${var.memory_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}
