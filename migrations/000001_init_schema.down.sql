-- Rollback migration 000001

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_risk_entity;
DROP INDEX IF EXISTS idx_risk_score;
DROP INDEX IF EXISTS idx_risk_created;
DROP INDEX IF EXISTS idx_risk_status;
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_resolved;
DROP INDEX IF EXISTS idx_alerts_assessment;
DROP INDEX IF EXISTS idx_audit_user;
DROP INDEX IF EXISTS idx_audit_resource;
DROP INDEX IF EXISTS idx_audit_action;
DROP INDEX IF EXISTS idx_audit_created;
DROP INDEX IF EXISTS idx_sources_type;
DROP INDEX IF EXISTS idx_sources_active;
DROP INDEX IF EXISTS idx_runs_source;
DROP INDEX IF EXISTS idx_runs_status;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS ingestion_runs;
DROP TABLE IF EXISTS data_sources;
DROP TABLE IF EXISTS compliance_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS risk_alerts;
DROP TABLE IF EXISTS risk_assessments;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
