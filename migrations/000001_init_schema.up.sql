-- Initial schema migration for ATLAS Core API
-- Version: 000001
-- Description: Create core tables for IAM, Risk Assessment, Audit Logging

-- ========================================
-- IAM Service Tables
-- ========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- ========================================
-- Risk Assessment Tables
-- ========================================

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    operational_risk DECIMAL(5,2),
    financial_risk DECIMAL(5,2),
    reputational_risk DECIMAL(5,2),
    geopolitical_risk DECIMAL(5,2),
    compliance_risk DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    assessed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    alert_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Audit Logging Tables
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) CHECK (status IN ('success', 'failure', 'error')),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    regulation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    evidence JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Data Ingestion Tables
-- ========================================

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    url VARCHAR(500),
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    last_ingested_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Risk assessments indexes
CREATE INDEX idx_risk_entity ON risk_assessments(entity_id, entity_type);
CREATE INDEX idx_risk_score ON risk_assessments(overall_score DESC);
CREATE INDEX idx_risk_created ON risk_assessments(created_at DESC);
CREATE INDEX idx_risk_status ON risk_assessments(status);

-- Risk alerts indexes
CREATE INDEX idx_alerts_severity ON risk_alerts(severity);
CREATE INDEX idx_alerts_resolved ON risk_alerts(is_resolved, created_at DESC);
CREATE INDEX idx_alerts_assessment ON risk_alerts(assessment_id);

-- Audit logs indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Data sources indexes
CREATE INDEX idx_sources_type ON data_sources(source_type);
CREATE INDEX idx_sources_active ON data_sources(is_active);

-- Ingestion runs indexes
CREATE INDEX idx_runs_source ON ingestion_runs(source_id, started_at DESC);
CREATE INDEX idx_runs_status ON ingestion_runs(status);

-- ========================================
-- Initial Data
-- ========================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system administrator access'),
    ('analyst', 'Risk and intelligence analyst'),
    ('viewer', 'Read-only access to dashboards'),
    ('operator', 'Operations and monitoring access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    ('read:risks', 'risk_assessments', 'read', 'View risk assessments'),
    ('write:risks', 'risk_assessments', 'write', 'Create and update risk assessments'),
    ('delete:risks', 'risk_assessments', 'delete', 'Delete risk assessments'),
    ('read:users', 'users', 'read', 'View user information'),
    ('write:users', 'users', 'write', 'Create and update users'),
    ('read:audit', 'audit_logs', 'read', 'View audit logs'),
    ('admin:all', '*', '*', 'Full administrative access')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON TABLE risk_assessments IS 'Multi-dimensional risk assessment records';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance';
