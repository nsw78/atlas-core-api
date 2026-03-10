# =============================================================================
# ATLAS Core API - Kafka Module
# Amazon MSK with 3 brokers, encryption, monitoring
# =============================================================================

locals {
  name = "${var.project_name}-${var.environment}-msk"
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "msk" {
  name_prefix = "${local.name}-"
  vpc_id      = var.vpc_id
  description = "Security group for Amazon MSK cluster"

  tags = merge(var.tags, {
    Name = "${local.name}-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Kafka plaintext (within VPC only)
resource "aws_security_group_rule" "msk_plaintext" {
  type                     = "ingress"
  from_port                = 9092
  to_port                  = 9092
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Kafka plaintext from EKS nodes"
}

# Kafka TLS
resource "aws_security_group_rule" "msk_tls" {
  type                     = "ingress"
  from_port                = 9094
  to_port                  = 9094
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Kafka TLS from EKS nodes"
}

# Kafka IAM auth
resource "aws_security_group_rule" "msk_iam" {
  type                     = "ingress"
  from_port                = 9098
  to_port                  = 9098
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Kafka IAM auth from EKS nodes"
}

# ZooKeeper (broker internal communication)
resource "aws_security_group_rule" "msk_zookeeper" {
  type              = "ingress"
  from_port         = 2181
  to_port           = 2181
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.msk.id
  description       = "ZooKeeper internal"
}

resource "aws_security_group_rule" "msk_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.msk.id
  description       = "Allow all outbound"
}

# -----------------------------------------------------------------------------
# KMS Key for Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "msk" {
  count = var.kms_key_arn == "" ? 1 : 0

  description             = "KMS key for MSK cluster ${local.name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${local.name}-kms"
  })
}

resource "aws_kms_alias" "msk" {
  count = var.kms_key_arn == "" ? 1 : 0

  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.msk[0].key_id
}

locals {
  kms_key_arn = var.kms_key_arn != "" ? var.kms_key_arn : aws_kms_key.msk[0].arn
}

# -----------------------------------------------------------------------------
# MSK Configuration
# -----------------------------------------------------------------------------
resource "aws_msk_configuration" "main" {
  name              = "${local.name}-config"
  kafka_versions    = [var.kafka_version]
  description       = "ATLAS ${var.environment} MSK configuration"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=true
    default.replication.factor=${min(var.broker_count, 3)}
    min.insync.replicas=${min(var.broker_count, 3) > 1 ? min(var.broker_count, 3) - 1 : 1}
    num.io.threads=8
    num.network.threads=5
    num.partitions=${var.default_partitions}
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    log.retention.hours=${var.log_retention_hours}
    log.retention.bytes=${var.log_retention_bytes}
    group.initial.rebalance.delay.ms=3000
  PROPERTIES
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for MSK Broker Logs
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${local.name}"
  retention_in_days = var.log_group_retention_days

  tags = var.tags
}

# -----------------------------------------------------------------------------
# MSK Cluster
# -----------------------------------------------------------------------------
resource "aws_msk_cluster" "main" {
  cluster_name           = local.name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.broker_count

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    client_subnets  = var.data_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.ebs_volume_size

        provisioned_throughput {
          enabled           = var.ebs_provisioned_throughput_enabled
          volume_throughput = var.ebs_provisioned_throughput_enabled ? var.ebs_volume_throughput : null
        }
      }
    }

    connectivity_info {
      public_access {
        type = "DISABLED"
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = local.kms_key_arn

    encryption_in_transit {
      client_broker = var.encryption_in_transit_client_broker
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      iam   = true
      scram = false
    }

    unauthenticated = var.allow_unauthenticated
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = var.enable_jmx_exporter
      }
      node_exporter {
        enabled_in_broker = var.enable_node_exporter
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }

      s3_logs {
        enabled = false
      }
    }
  }

  tags = merge(var.tags, {
    Name = local.name
  })
}
