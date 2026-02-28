-- Rollback enterprise features
DROP FUNCTION IF EXISTS cleanup_expired_tokens();
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhook_subscriptions;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS token_blacklist;
DROP TABLE IF EXISTS api_keys;
