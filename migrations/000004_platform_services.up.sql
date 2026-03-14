-- Platform services migration for ATLAS Core API
-- Version: 000004
-- Description: Scenario Simulation, Threat Intelligence, News/OSINT, NLP Processing,
--   ML Infrastructure, Compliance Automation, Sanctions, Trade Intelligence,
--   Digital Twins, War Gaming, Policy Impact, Reports, Graph Intelligence,
--   Notifications, and Settings

-- Required extension for full-text search on news/OSINT
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. SCENARIO SIMULATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
    parameters JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    parameters JSONB NOT NULL DEFAULT '{}',
    started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    result_type VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    value DECIMAL(20,6),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_type ON scenarios(scenario_type);
CREATE INDEX idx_scenarios_status ON scenarios(status);
CREATE INDEX idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX idx_scenarios_created_at ON scenarios(created_at DESC);

CREATE INDEX idx_sim_runs_scenario ON simulation_runs(scenario_id, created_at DESC);
CREATE INDEX idx_sim_runs_status ON simulation_runs(status);
CREATE INDEX idx_sim_runs_started_by ON simulation_runs(started_by);

CREATE INDEX idx_sim_results_run ON simulation_results(run_id);
CREATE INDEX idx_sim_results_type ON simulation_results(result_type);

COMMENT ON TABLE scenarios IS 'Scenario definitions for what-if and Monte Carlo simulations';
COMMENT ON TABLE simulation_runs IS 'Individual execution runs of a scenario';
COMMENT ON TABLE simulation_results IS 'Granular results produced by a simulation run';

-- ============================================================================
-- 2. THREAT INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS threats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    threat_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'mitigated', 'resolved', 'expired', 'false_positive')),
    source VARCHAR(255),
    source_url VARCHAR(1000),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    tlp_level VARCHAR(20) DEFAULT 'amber'
        CHECK (tlp_level IN ('white', 'green', 'amber', 'amber+strict', 'red')),
    affected_regions TEXT[] DEFAULT '{}',
    affected_sectors TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    actor_type VARCHAR(100) NOT NULL
        CHECK (actor_type IN ('nation_state', 'criminal', 'hacktivist', 'insider', 'terrorist', 'unknown', 'other')),
    sophistication VARCHAR(50)
        CHECK (sophistication IN ('none', 'minimal', 'intermediate', 'advanced', 'expert', 'strategic')),
    origin_country VARCHAR(3),
    description TEXT,
    motivations TEXT[] DEFAULT '{}',
    ttps JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_id UUID REFERENCES threats(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES threat_actors(id) ON DELETE SET NULL,
    indicator_type VARCHAR(100) NOT NULL
        CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash_md5', 'hash_sha1', 'hash_sha256',
            'email', 'cidr', 'cve', 'file_name', 'mutex', 'registry_key', 'custom')),
    value TEXT NOT NULL,
    description TEXT,
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    is_active BOOLEAN DEFAULT true,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    provider VARCHAR(255) NOT NULL,
    feed_url VARCHAR(1000),
    feed_type VARCHAR(50) NOT NULL
        CHECK (feed_type IN ('stix', 'taxii', 'csv', 'json', 'rss', 'api', 'custom')),
    format VARCHAR(50),
    auth_config JSONB DEFAULT '{}',
    polling_interval_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMP,
    last_error TEXT,
    indicators_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threats_type ON threats(threat_type);
CREATE INDEX idx_threats_severity ON threats(severity);
CREATE INDEX idx_threats_status ON threats(status);
CREATE INDEX idx_threats_tlp ON threats(tlp_level);
CREATE INDEX idx_threats_created_at ON threats(created_at DESC);
CREATE INDEX idx_threats_regions ON threats USING GIN(affected_regions);
CREATE INDEX idx_threats_sectors ON threats USING GIN(affected_sectors);
CREATE INDEX idx_threats_tags ON threats USING GIN(tags);

CREATE INDEX idx_threat_actors_type ON threat_actors(actor_type);
CREATE INDEX idx_threat_actors_country ON threat_actors(origin_country);
CREATE INDEX idx_threat_actors_active ON threat_actors(is_active) WHERE is_active = true;
CREATE INDEX idx_threat_actors_name ON threat_actors(name);

CREATE INDEX idx_threat_indicators_threat ON threat_indicators(threat_id);
CREATE INDEX idx_threat_indicators_actor ON threat_indicators(actor_id);
CREATE INDEX idx_threat_indicators_type ON threat_indicators(indicator_type);
CREATE INDEX idx_threat_indicators_value ON threat_indicators(value);
CREATE INDEX idx_threat_indicators_active ON threat_indicators(is_active) WHERE is_active = true;

CREATE INDEX idx_threat_feeds_active ON threat_feeds(is_active) WHERE is_active = true;
CREATE INDEX idx_threat_feeds_type ON threat_feeds(feed_type);

COMMENT ON TABLE threats IS 'Threat intelligence entries from multiple sources';
COMMENT ON TABLE threat_actors IS 'Known threat actor profiles and TTPs';
COMMENT ON TABLE threat_indicators IS 'Indicators of compromise (IOCs) linked to threats and actors';
COMMENT ON TABLE threat_feeds IS 'External threat intelligence feed configurations';

-- ============================================================================
-- 3. NEWS / OSINT
-- ============================================================================

CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL
        CHECK (source_type IN ('rss', 'api', 'scraper', 'social_media', 'wire_service', 'government', 'custom')),
    url VARCHAR(1000),
    language VARCHAR(10) DEFAULT 'en',
    country VARCHAR(3),
    reliability_score DECIMAL(5,4) CHECK (reliability_score >= 0 AND reliability_score <= 1),
    bias_rating VARCHAR(50),
    auth_config JSONB DEFAULT '{}',
    polling_interval_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMP,
    article_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES news_sources(id) ON DELETE SET NULL,
    external_id VARCHAR(500),
    title VARCHAR(1000) NOT NULL,
    summary TEXT,
    content TEXT,
    url VARCHAR(2000),
    author VARCHAR(500),
    language VARCHAR(10) DEFAULT 'en',
    published_at TIMESTAMP,
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    regions TEXT[] DEFAULT '{}',
    sentiment_score DECIMAL(5,4),
    relevance_score DECIMAL(5,4),
    is_processed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS osint_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(100) NOT NULL
        CHECK (signal_type IN ('social_media', 'dark_web', 'paste_site', 'forum', 'government',
            'satellite', 'financial', 'shipping', 'custom')),
    source VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    content TEXT,
    url VARCHAR(2000),
    severity VARCHAR(20) DEFAULT 'informational'
        CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    regions TEXT[] DEFAULT '{}',
    entities TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_sources_type ON news_sources(source_type);
CREATE INDEX idx_news_sources_active ON news_sources(is_active) WHERE is_active = true;
CREATE INDEX idx_news_sources_country ON news_sources(country);

CREATE INDEX idx_news_articles_source ON news_articles(source_id, published_at DESC);
CREATE INDEX idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_language ON news_articles(language);
CREATE INDEX idx_news_articles_processed ON news_articles(is_processed) WHERE is_processed = false;
CREATE INDEX idx_news_articles_categories ON news_articles USING GIN(categories);
CREATE INDEX idx_news_articles_tags ON news_articles USING GIN(tags);
CREATE INDEX idx_news_articles_regions ON news_articles USING GIN(regions);
CREATE INDEX idx_news_articles_title_trgm ON news_articles USING GIN(title gin_trgm_ops);

CREATE INDEX idx_osint_signals_type ON osint_signals(signal_type);
CREATE INDEX idx_osint_signals_severity ON osint_signals(severity);
CREATE INDEX idx_osint_signals_detected ON osint_signals(detected_at DESC);
CREATE INDEX idx_osint_signals_verified ON osint_signals(is_verified);
CREATE INDEX idx_osint_signals_regions ON osint_signals USING GIN(regions);
CREATE INDEX idx_osint_signals_entities ON osint_signals USING GIN(entities);

COMMENT ON TABLE news_sources IS 'Configured news and media sources for ingestion';
COMMENT ON TABLE news_articles IS 'Ingested news articles for analysis and alerting';
COMMENT ON TABLE osint_signals IS 'Open-source intelligence signals from diverse collection sources';

-- ============================================================================
-- 4. NLP PROCESSING
-- ============================================================================

CREATE TABLE IF NOT EXISTS nlp_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(100) NOT NULL,
    source_id UUID NOT NULL,
    analysis_type VARCHAR(100) NOT NULL
        CHECK (analysis_type IN ('ner', 'sentiment', 'classification', 'summarization',
            'translation', 'topic_modeling', 'keyword_extraction', 'relation_extraction', 'custom')),
    model_name VARCHAR(255),
    model_version VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    input_text TEXT,
    output JSONB NOT NULL DEFAULT '{}',
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nlp_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES nlp_analyses(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL
        CHECK (entity_type IN ('person', 'organization', 'location', 'date', 'money', 'event',
            'product', 'regulation', 'weapon_system', 'vessel', 'aircraft', 'custom')),
    entity_text VARCHAR(500) NOT NULL,
    normalized_text VARCHAR(500),
    start_offset INTEGER,
    end_offset INTEGER,
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    linked_entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nlp_sentiment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES nlp_analyses(id) ON DELETE CASCADE,
    scope VARCHAR(50) NOT NULL DEFAULT 'document'
        CHECK (scope IN ('document', 'sentence', 'aspect', 'entity')),
    target_text TEXT,
    sentiment VARCHAR(20) NOT NULL
        CHECK (sentiment IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive', 'mixed')),
    score DECIMAL(5,4) NOT NULL,
    magnitude DECIMAL(5,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nlp_analyses_source ON nlp_analyses(source_type, source_id);
CREATE INDEX idx_nlp_analyses_type ON nlp_analyses(analysis_type);
CREATE INDEX idx_nlp_analyses_status ON nlp_analyses(status);
CREATE INDEX idx_nlp_analyses_model ON nlp_analyses(model_name, model_version);
CREATE INDEX idx_nlp_analyses_created ON nlp_analyses(created_at DESC);

CREATE INDEX idx_nlp_entities_analysis ON nlp_entities(analysis_id);
CREATE INDEX idx_nlp_entities_type ON nlp_entities(entity_type);
CREATE INDEX idx_nlp_entities_text ON nlp_entities(normalized_text);
CREATE INDEX idx_nlp_entities_linked ON nlp_entities(linked_entity_id) WHERE linked_entity_id IS NOT NULL;

CREATE INDEX idx_nlp_sentiment_analysis ON nlp_sentiment_results(analysis_id);
CREATE INDEX idx_nlp_sentiment_scope ON nlp_sentiment_results(scope);
CREATE INDEX idx_nlp_sentiment_value ON nlp_sentiment_results(sentiment);

COMMENT ON TABLE nlp_analyses IS 'NLP processing jobs and their outputs';
COMMENT ON TABLE nlp_entities IS 'Named entities extracted by NLP analysis';
COMMENT ON TABLE nlp_sentiment_results IS 'Sentiment analysis results at various granularities';

-- ============================================================================
-- 5. ML INFRASTRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(100) NOT NULL
        CHECK (model_type IN ('classification', 'regression', 'clustering', 'anomaly_detection',
            'time_series', 'nlp', 'reinforcement_learning', 'ensemble', 'custom')),
    framework VARCHAR(100),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'training', 'validating', 'ready', 'deployed', 'deprecated', 'archived')),
    artifact_uri VARCHAR(1000),
    input_schema JSONB DEFAULT '{}',
    output_schema JSONB DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    training_data_info JSONB DEFAULT '{}',
    is_production BOOLEAN DEFAULT false,
    deployed_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS ml_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'running', 'completed', 'failed', 'cancelled')),
    parameters JSONB NOT NULL DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    dataset_info JSONB DEFAULT '{}',
    artifact_uri VARCHAR(1000),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms BIGINT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
    experiment_id UUID REFERENCES ml_experiments(id) ON DELETE SET NULL,
    input_data JSONB NOT NULL,
    prediction JSONB NOT NULL,
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    latency_ms INTEGER,
    is_correct BOOLEAN,
    feedback JSONB,
    request_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_models_name ON ml_models(name);
CREATE INDEX idx_ml_models_type ON ml_models(model_type);
CREATE INDEX idx_ml_models_status ON ml_models(status);
CREATE INDEX idx_ml_models_production ON ml_models(is_production) WHERE is_production = true;
CREATE INDEX idx_ml_models_created_by ON ml_models(created_by);

CREATE INDEX idx_ml_experiments_model ON ml_experiments(model_id, created_at DESC);
CREATE INDEX idx_ml_experiments_status ON ml_experiments(status);
CREATE INDEX idx_ml_experiments_created_by ON ml_experiments(created_by);

CREATE INDEX idx_ml_predictions_model ON ml_predictions(model_id, created_at DESC);
CREATE INDEX idx_ml_predictions_experiment ON ml_predictions(experiment_id);
CREATE INDEX idx_ml_predictions_created ON ml_predictions(created_at DESC);
CREATE INDEX idx_ml_predictions_correct ON ml_predictions(is_correct) WHERE is_correct IS NOT NULL;

COMMENT ON TABLE ml_models IS 'Machine learning model registry with versioning';
COMMENT ON TABLE ml_experiments IS 'ML experiment tracking for training and evaluation runs';
COMMENT ON TABLE ml_predictions IS 'Prediction log for model monitoring and drift detection';

-- ============================================================================
-- 6. COMPLIANCE AUTOMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    regulation VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    rules JSONB NOT NULL DEFAULT '[]',
    remediation_guidance TEXT,
    is_active BOOLEAN DEFAULT true,
    is_automated BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    effective_from TIMESTAMP,
    effective_until TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES compliance_policies(id) ON DELETE CASCADE,
    scope VARCHAR(100) NOT NULL,
    scope_target VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    result VARCHAR(50)
        CHECK (result IN ('pass', 'fail', 'warning', 'error', 'not_applicable')),
    findings_count INTEGER DEFAULT 0,
    findings JSONB DEFAULT '[]',
    score DECIMAL(5,2),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES compliance_scans(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES compliance_policies(id) ON DELETE CASCADE,
    evidence_type VARCHAR(100) NOT NULL
        CHECK (evidence_type IN ('document', 'screenshot', 'log', 'api_response', 'attestation',
            'configuration', 'automated_check', 'custom')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_uri VARCHAR(1000),
    content JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_policies_regulation ON compliance_policies(regulation);
CREATE INDEX idx_compliance_policies_active ON compliance_policies(is_active) WHERE is_active = true;
CREATE INDEX idx_compliance_policies_code ON compliance_policies(code);
CREATE INDEX idx_compliance_policies_severity ON compliance_policies(severity);

CREATE INDEX idx_compliance_scans_policy ON compliance_scans(policy_id, created_at DESC);
CREATE INDEX idx_compliance_scans_status ON compliance_scans(status);
CREATE INDEX idx_compliance_scans_result ON compliance_scans(result);
CREATE INDEX idx_compliance_scans_created ON compliance_scans(created_at DESC);

CREATE INDEX idx_compliance_evidence_scan ON compliance_evidence(scan_id);
CREATE INDEX idx_compliance_evidence_policy ON compliance_evidence(policy_id);
CREATE INDEX idx_compliance_evidence_status ON compliance_evidence(status);
CREATE INDEX idx_compliance_evidence_type ON compliance_evidence(evidence_type);

COMMENT ON TABLE compliance_policies IS 'Compliance policy definitions and automated rules';
COMMENT ON TABLE compliance_scans IS 'Compliance scan execution records and results';
COMMENT ON TABLE compliance_evidence IS 'Collected evidence supporting compliance posture';

-- ============================================================================
-- 7. SANCTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sanctions_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    issuing_authority VARCHAR(255) NOT NULL,
    country VARCHAR(3),
    description TEXT,
    source_url VARCHAR(1000),
    format VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMP,
    entries_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sanctions_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES sanctions_lists(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    entry_type VARCHAR(50) NOT NULL
        CHECK (entry_type IN ('individual', 'entity', 'vessel', 'aircraft', 'address', 'crypto_wallet', 'other')),
    primary_name VARCHAR(500) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    nationality VARCHAR(3),
    date_of_birth DATE,
    identification_documents JSONB DEFAULT '[]',
    addresses JSONB DEFAULT '[]',
    reasons TEXT,
    programs TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'removed', 'amended', 'expired')),
    listed_on DATE,
    delisted_on DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (list_id, external_id)
);

CREATE TABLE IF NOT EXISTS screening_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    batch_type VARCHAR(50) NOT NULL DEFAULT 'ad_hoc'
        CHECK (batch_type IN ('ad_hoc', 'scheduled', 'real_time', 'bulk')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    matched_records INTEGER DEFAULT 0,
    lists_screened UUID[] DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES screening_batches(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES sanctions_entries(id) ON DELETE SET NULL,
    screened_name VARCHAR(500) NOT NULL,
    screened_data JSONB DEFAULT '{}',
    match_score DECIMAL(5,4) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    match_type VARCHAR(50) NOT NULL
        CHECK (match_type IN ('exact', 'fuzzy', 'phonetic', 'alias', 'partial')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'confirmed_match', 'false_positive', 'escalated', 'dismissed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sanctions_lists_authority ON sanctions_lists(issuing_authority);
CREATE INDEX idx_sanctions_lists_active ON sanctions_lists(is_active) WHERE is_active = true;

CREATE INDEX idx_sanctions_entries_list ON sanctions_entries(list_id);
CREATE INDEX idx_sanctions_entries_type ON sanctions_entries(entry_type);
CREATE INDEX idx_sanctions_entries_name ON sanctions_entries(primary_name);
CREATE INDEX idx_sanctions_entries_name_trgm ON sanctions_entries USING GIN(primary_name gin_trgm_ops);
CREATE INDEX idx_sanctions_entries_status ON sanctions_entries(status);
CREATE INDEX idx_sanctions_entries_nationality ON sanctions_entries(nationality);
CREATE INDEX idx_sanctions_entries_aliases ON sanctions_entries USING GIN(aliases);
CREATE INDEX idx_sanctions_entries_programs ON sanctions_entries USING GIN(programs);

CREATE INDEX idx_screening_batches_status ON screening_batches(status);
CREATE INDEX idx_screening_batches_type ON screening_batches(batch_type);
CREATE INDEX idx_screening_batches_submitted ON screening_batches(submitted_by);

CREATE INDEX idx_screening_results_batch ON screening_results(batch_id);
CREATE INDEX idx_screening_results_entry ON screening_results(entry_id);
CREATE INDEX idx_screening_results_status ON screening_results(status);
CREATE INDEX idx_screening_results_score ON screening_results(match_score DESC);
CREATE INDEX idx_screening_results_reviewed ON screening_results(reviewed_by) WHERE reviewed_by IS NOT NULL;

COMMENT ON TABLE sanctions_lists IS 'Sanctions list registries from global authorities (OFAC, EU, UN, etc.)';
COMMENT ON TABLE sanctions_entries IS 'Individual and entity records within sanctions lists';
COMMENT ON TABLE screening_batches IS 'Batch screening jobs for sanctions compliance';
COMMENT ON TABLE screening_results IS 'Screening match results with disposition workflow';

-- ============================================================================
-- 8. TRADE INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trade_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_country VARCHAR(3) NOT NULL,
    destination_country VARCHAR(3) NOT NULL,
    commodity_code VARCHAR(20),
    commodity_description VARCHAR(500),
    value_usd DECIMAL(20,2),
    quantity DECIMAL(20,4),
    unit VARCHAR(50),
    transport_mode VARCHAR(50)
        CHECK (transport_mode IN ('sea', 'air', 'rail', 'road', 'pipeline', 'multimodal', 'other')),
    flow_type VARCHAR(20) NOT NULL DEFAULT 'export'
        CHECK (flow_type IN ('export', 'import', 're_export', 'transit')),
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags TEXT[] DEFAULT '{}',
    data_source VARCHAR(255),
    period_start DATE,
    period_end DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    partner_type VARCHAR(50) NOT NULL
        CHECK (partner_type IN ('exporter', 'importer', 'broker', 'carrier', 'bank', 'insurer', 'other')),
    country VARCHAR(3),
    registration_number VARCHAR(255),
    industry_codes TEXT[] DEFAULT '{}',
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags TEXT[] DEFAULT '{}',
    sanctions_status VARCHAR(50) DEFAULT 'clear'
        CHECK (sanctions_status IN ('clear', 'flagged', 'sanctioned', 'pending_review')),
    last_screened_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    address JSONB,
    contact_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restriction_type VARCHAR(100) NOT NULL
        CHECK (restriction_type IN ('embargo', 'tariff', 'quota', 'license_required', 'dual_use',
            'end_user_restriction', 'anti_dumping', 'countervailing', 'safeguard', 'custom')),
    issuing_authority VARCHAR(255) NOT NULL,
    origin_country VARCHAR(3),
    destination_country VARCHAR(3),
    commodity_codes TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    legal_reference VARCHAR(500),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL,
    effective_until DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_flows_origin ON trade_flows(origin_country);
CREATE INDEX idx_trade_flows_destination ON trade_flows(destination_country);
CREATE INDEX idx_trade_flows_commodity ON trade_flows(commodity_code);
CREATE INDEX idx_trade_flows_pair ON trade_flows(origin_country, destination_country);
CREATE INDEX idx_trade_flows_risk ON trade_flows(risk_score DESC) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_trade_flows_period ON trade_flows(period_start, period_end);
CREATE INDEX idx_trade_flows_type ON trade_flows(flow_type);
CREATE INDEX idx_trade_flows_risk_flags ON trade_flows USING GIN(risk_flags);

CREATE INDEX idx_trade_partners_type ON trade_partners(partner_type);
CREATE INDEX idx_trade_partners_country ON trade_partners(country);
CREATE INDEX idx_trade_partners_sanctions ON trade_partners(sanctions_status);
CREATE INDEX idx_trade_partners_risk ON trade_partners(risk_score DESC) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_trade_partners_active ON trade_partners(is_active) WHERE is_active = true;
CREATE INDEX idx_trade_partners_name_trgm ON trade_partners USING GIN(name gin_trgm_ops);

CREATE INDEX idx_trade_restrictions_type ON trade_restrictions(restriction_type);
CREATE INDEX idx_trade_restrictions_origin ON trade_restrictions(origin_country);
CREATE INDEX idx_trade_restrictions_destination ON trade_restrictions(destination_country);
CREATE INDEX idx_trade_restrictions_active ON trade_restrictions(is_active) WHERE is_active = true;
CREATE INDEX idx_trade_restrictions_effective ON trade_restrictions(effective_from, effective_until);
CREATE INDEX idx_trade_restrictions_commodities ON trade_restrictions USING GIN(commodity_codes);

COMMENT ON TABLE trade_flows IS 'International trade flow data for intelligence and risk analysis';
COMMENT ON TABLE trade_partners IS 'Trade partner profiles with risk and sanctions screening status';
COMMENT ON TABLE trade_restrictions IS 'Active trade restrictions, embargoes, and regulatory controls';

-- ============================================================================
-- 9. DIGITAL TWINS
-- ============================================================================

CREATE TABLE IF NOT EXISTS digital_twins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    twin_type VARCHAR(100) NOT NULL
        CHECK (twin_type IN ('supply_chain', 'infrastructure', 'organization', 'country',
            'region', 'market', 'network', 'process', 'custom')),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'calibrating', 'error', 'archived')),
    model_definition JSONB NOT NULL DEFAULT '{}',
    current_state JSONB NOT NULL DEFAULT '{}',
    parameters JSONB DEFAULT '{}',
    data_sources UUID[] DEFAULT '{}',
    fidelity_score DECIMAL(5,4) CHECK (fidelity_score >= 0 AND fidelity_score <= 1),
    last_synced_at TIMESTAMP,
    sync_interval_minutes INTEGER DEFAULT 60,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS twin_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    simulation_type VARCHAR(100) NOT NULL
        CHECK (simulation_type IN ('monte_carlo', 'agent_based', 'system_dynamics',
            'discrete_event', 'stress_test', 'what_if', 'custom')),
    initial_state JSONB NOT NULL DEFAULT '{}',
    parameters JSONB NOT NULL DEFAULT '{}',
    results JSONB DEFAULT '{}',
    iterations INTEGER DEFAULT 1,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms BIGINT,
    started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS twin_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id UUID NOT NULL REFERENCES digital_twins(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    state_hash VARCHAR(64),
    trigger VARCHAR(100) NOT NULL DEFAULT 'sync'
        CHECK (trigger IN ('sync', 'manual', 'simulation', 'event', 'scheduled')),
    delta_from_previous JSONB,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_digital_twins_type ON digital_twins(twin_type);
CREATE INDEX idx_digital_twins_status ON digital_twins(status);
CREATE INDEX idx_digital_twins_created_by ON digital_twins(created_by);

CREATE INDEX idx_twin_simulations_twin ON twin_simulations(twin_id, created_at DESC);
CREATE INDEX idx_twin_simulations_scenario ON twin_simulations(scenario_id);
CREATE INDEX idx_twin_simulations_status ON twin_simulations(status);
CREATE INDEX idx_twin_simulations_type ON twin_simulations(simulation_type);

CREATE INDEX idx_twin_states_twin ON twin_states(twin_id, captured_at DESC);
CREATE INDEX idx_twin_states_trigger ON twin_states(trigger);
CREATE INDEX idx_twin_states_captured ON twin_states(captured_at DESC);

COMMENT ON TABLE digital_twins IS 'Digital twin models mirroring real-world entities and systems';
COMMENT ON TABLE twin_simulations IS 'Simulations executed against digital twin models';
COMMENT ON TABLE twin_states IS 'Historical state snapshots of digital twins for replay and analysis';

-- ============================================================================
-- 10. WAR GAMING
-- ============================================================================

CREATE TABLE IF NOT EXISTS wargaming_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    game_type VARCHAR(100) NOT NULL
        CHECK (game_type IN ('tabletop', 'seminar', 'matrix', 'red_team_blue_team',
            'crisis_simulation', 'campaign', 'custom')),
    status VARCHAR(50) NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'setup', 'in_progress', 'paused', 'completed', 'cancelled', 'archived')),
    objectives JSONB DEFAULT '[]',
    rules JSONB DEFAULT '{}',
    participants JSONB DEFAULT '[]',
    turn_number INTEGER DEFAULT 0,
    current_phase VARCHAR(100),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    findings JSONB DEFAULT '[]',
    lessons_learned TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wargaming_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES wargaming_games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_phase VARCHAR(100),
    initial_conditions JSONB NOT NULL DEFAULT '{}',
    injects JSONB DEFAULT '[]',
    expected_outcomes JSONB DEFAULT '[]',
    actual_outcomes JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    activated_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wargaming_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES wargaming_games(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES wargaming_scenarios(id) ON DELETE SET NULL,
    turn_number INTEGER NOT NULL,
    team VARCHAR(100) NOT NULL,
    player_id UUID REFERENCES users(id) ON DELETE SET NULL,
    move_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    decision_rationale TEXT,
    resources_used JSONB DEFAULT '{}',
    outcomes JSONB DEFAULT '{}',
    adjudicator_notes TEXT,
    adjudicated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    adjudicated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wargaming_games_type ON wargaming_games(game_type);
CREATE INDEX idx_wargaming_games_status ON wargaming_games(status);
CREATE INDEX idx_wargaming_games_created_by ON wargaming_games(created_by);
CREATE INDEX idx_wargaming_games_dates ON wargaming_games(start_date, end_date);

CREATE INDEX idx_wargaming_scenarios_game ON wargaming_scenarios(game_id, sort_order);
CREATE INDEX idx_wargaming_scenarios_active ON wargaming_scenarios(is_active) WHERE is_active = true;

CREATE INDEX idx_wargaming_moves_game ON wargaming_moves(game_id, turn_number);
CREATE INDEX idx_wargaming_moves_scenario ON wargaming_moves(scenario_id);
CREATE INDEX idx_wargaming_moves_player ON wargaming_moves(player_id);
CREATE INDEX idx_wargaming_moves_team ON wargaming_moves(team, turn_number);

COMMENT ON TABLE wargaming_games IS 'War gaming sessions for strategic and crisis analysis';
COMMENT ON TABLE wargaming_scenarios IS 'Scenario injects and conditions within a war game';
COMMENT ON TABLE wargaming_moves IS 'Recorded moves and decisions made during war game turns';

-- ============================================================================
-- 11. POLICY IMPACT
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    policy_area VARCHAR(100) NOT NULL
        CHECK (policy_area IN ('trade', 'sanctions', 'defense', 'economic', 'environmental',
            'technology', 'energy', 'health', 'immigration', 'regulatory', 'custom')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_progress', 'review', 'published', 'archived')),
    methodology VARCHAR(100),
    scope VARCHAR(255),
    affected_regions TEXT[] DEFAULT '{}',
    affected_sectors TEXT[] DEFAULT '{}',
    key_findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    impact_score DECIMAL(5,2) CHECK (impact_score >= 0 AND impact_score <= 100),
    confidence_level VARCHAR(20)
        CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    data_sources JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policy_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES policy_analyses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(50) NOT NULL DEFAULT 'baseline'
        CHECK (scenario_type IN ('baseline', 'optimistic', 'pessimistic', 'alternative', 'extreme')),
    assumptions JSONB NOT NULL DEFAULT '[]',
    projected_impacts JSONB NOT NULL DEFAULT '{}',
    probability DECIMAL(5,4) CHECK (probability >= 0 AND probability <= 1),
    time_horizon VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policy_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    analysis_ids UUID[] NOT NULL,
    comparison_criteria JSONB NOT NULL DEFAULT '[]',
    results JSONB NOT NULL DEFAULT '{}',
    summary TEXT,
    recommendation TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_analyses_area ON policy_analyses(policy_area);
CREATE INDEX idx_policy_analyses_status ON policy_analyses(status);
CREATE INDEX idx_policy_analyses_created_by ON policy_analyses(created_by);
CREATE INDEX idx_policy_analyses_published ON policy_analyses(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_policy_analyses_regions ON policy_analyses USING GIN(affected_regions);
CREATE INDEX idx_policy_analyses_sectors ON policy_analyses USING GIN(affected_sectors);

CREATE INDEX idx_policy_scenarios_analysis ON policy_scenarios(analysis_id);
CREATE INDEX idx_policy_scenarios_type ON policy_scenarios(scenario_type);

CREATE INDEX idx_policy_comparisons_created_by ON policy_comparisons(created_by);
CREATE INDEX idx_policy_comparisons_analyses ON policy_comparisons USING GIN(analysis_ids);

COMMENT ON TABLE policy_analyses IS 'Policy impact analysis for geopolitical and regulatory changes';
COMMENT ON TABLE policy_scenarios IS 'Projected scenarios within a policy impact analysis';
COMMENT ON TABLE policy_comparisons IS 'Side-by-side comparisons of multiple policy analyses';

-- ============================================================================
-- 12. REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL
        CHECK (report_type IN ('risk_summary', 'threat_brief', 'compliance_report', 'trade_analysis',
            'sanctions_screening', 'situation_report', 'executive_brief', 'incident_report',
            'intelligence_product', 'custom')),
    template_schema JSONB NOT NULL DEFAULT '{}',
    default_parameters JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    output_formats TEXT[] DEFAULT '{pdf,html}',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'generating', 'review', 'approved', 'published', 'archived', 'failed')),
    parameters JSONB DEFAULT '{}',
    content JSONB NOT NULL DEFAULT '{}',
    summary TEXT,
    classification VARCHAR(50) DEFAULT 'internal'
        CHECK (classification IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    output_format VARCHAR(20) DEFAULT 'pdf',
    file_uri VARCHAR(1000),
    file_size_bytes BIGINT,
    generated_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    parameters JSONB DEFAULT '{}',
    recipients JSONB DEFAULT '[]',
    output_format VARCHAR(20) DEFAULT 'pdf',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    last_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    failure_count INTEGER DEFAULT 0,
    max_failures INTEGER DEFAULT 3,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_templates_type ON report_templates(report_type);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_report_templates_code ON report_templates(code);

CREATE INDEX idx_reports_template ON reports(template_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_classification ON reports(classification);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_published ON reports(published_at DESC) WHERE published_at IS NOT NULL;

CREATE INDEX idx_report_schedules_template ON report_schedules(template_id);
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

COMMENT ON TABLE report_templates IS 'Reusable report templates with configurable layouts and parameters';
COMMENT ON TABLE reports IS 'Generated reports with content, classification, and approval workflow';
COMMENT ON TABLE report_schedules IS 'Scheduled automatic report generation via cron expressions';

-- ============================================================================
-- 13. GRAPH INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_type VARCHAR(100) NOT NULL,
    source_entity_id UUID NOT NULL,
    target_entity_type VARCHAR(100) NOT NULL,
    target_entity_id UUID NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'directed'
        CHECK (direction IN ('directed', 'undirected', 'bidirectional')),
    weight DECIMAL(10,6) DEFAULT 1.0,
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    properties JSONB DEFAULT '{}',
    source VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entity_communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    description TEXT,
    detection_algorithm VARCHAR(100) NOT NULL,
    detection_parameters JSONB DEFAULT '{}',
    member_count INTEGER DEFAULT 0,
    members JSONB NOT NULL DEFAULT '[]',
    centrality_scores JSONB DEFAULT '{}',
    cohesion_score DECIMAL(5,4),
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graph_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    analysis_type VARCHAR(100) NOT NULL
        CHECK (analysis_type IN ('shortest_path', 'centrality', 'community_detection',
            'link_prediction', 'anomaly_detection', 'influence_propagation',
            'network_flow', 'subgraph_matching', 'custom')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    parameters JSONB NOT NULL DEFAULT '{}',
    scope JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    node_count INTEGER,
    edge_count INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms BIGINT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entity_rel_source ON entity_relationships(source_entity_type, source_entity_id);
CREATE INDEX idx_entity_rel_target ON entity_relationships(target_entity_type, target_entity_id);
CREATE INDEX idx_entity_rel_type ON entity_relationships(relationship_type);
CREATE INDEX idx_entity_rel_active ON entity_relationships(is_active) WHERE is_active = true;
CREATE INDEX idx_entity_rel_weight ON entity_relationships(weight DESC);
CREATE INDEX idx_entity_rel_pair ON entity_relationships(source_entity_id, target_entity_id);

CREATE INDEX idx_entity_communities_algorithm ON entity_communities(detection_algorithm);
CREATE INDEX idx_entity_communities_risk ON entity_communities(risk_score DESC) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_entity_communities_tags ON entity_communities USING GIN(tags);

CREATE INDEX idx_graph_analyses_type ON graph_analyses(analysis_type);
CREATE INDEX idx_graph_analyses_status ON graph_analyses(status);
CREATE INDEX idx_graph_analyses_created_by ON graph_analyses(created_by);
CREATE INDEX idx_graph_analyses_created ON graph_analyses(created_at DESC);

COMMENT ON TABLE entity_relationships IS 'Graph edges representing relationships between any entity types';
COMMENT ON TABLE entity_communities IS 'Detected communities and clusters within the entity graph';
COMMENT ON TABLE graph_analyses IS 'Graph algorithm execution records and results';

-- ============================================================================
-- 14. NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL
        CHECK (notification_type IN ('alert', 'info', 'warning', 'success', 'task', 'mention',
            'system', 'report_ready', 'compliance', 'threat', 'risk_change')),
    title VARCHAR(500) NOT NULL,
    message TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app'
        CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'webhook', 'slack')),
    source_type VARCHAR(100),
    source_id UUID,
    action_url VARCHAR(1000),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
    is_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    min_priority VARCHAR(20) DEFAULT 'low'
        CHECK (min_priority IN ('low', 'normal', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_source ON notifications(source_type, source_id);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX idx_notif_prefs_type ON notification_preferences(notification_type, channel);

COMMENT ON TABLE notifications IS 'User notifications across multiple delivery channels';
COMMENT ON TABLE notification_preferences IS 'Per-user notification channel and type preferences';

-- ============================================================================
-- 15. SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, category, key)
);

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    is_readonly BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (namespace, key)
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);
CREATE INDEX idx_user_settings_category ON user_settings(user_id, category);
CREATE INDEX idx_user_settings_lookup ON user_settings(user_id, category, key);

CREATE INDEX idx_system_config_namespace ON system_config(namespace);
CREATE INDEX idx_system_config_lookup ON system_config(namespace, key);

COMMENT ON TABLE user_settings IS 'Per-user configuration and preference key-value store';
COMMENT ON TABLE system_config IS 'Global system configuration with namespace isolation';

-- ============================================================================
-- UTILITY: updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables that have an updated_at column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'scenarios', 'threats', 'threat_actors', 'threat_indicators', 'threat_feeds',
            'news_sources', 'news_articles', 'osint_signals',
            'nlp_entities',
            'ml_models', 'ml_experiments',
            'compliance_policies', 'compliance_evidence',
            'sanctions_lists', 'sanctions_entries', 'screening_results',
            'trade_flows', 'trade_partners', 'trade_restrictions',
            'digital_twins',
            'wargaming_games', 'wargaming_scenarios',
            'policy_analyses', 'policy_scenarios', 'policy_comparisons',
            'report_templates', 'reports', 'report_schedules',
            'entity_relationships', 'entity_communities', 'graph_analyses',
            'notification_preferences',
            'user_settings', 'system_config'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default report templates
INSERT INTO report_templates (name, code, description, report_type, template_schema, default_parameters, output_formats) VALUES
    ('Daily Risk Summary', 'daily_risk_summary',
     'Automated daily summary of risk posture across all monitored entities',
     'risk_summary',
     '{"sections": ["executive_summary", "risk_heatmap", "top_risks", "alerts", "trend_analysis"]}',
     '{"lookback_days": 1, "top_n_risks": 10}',
     '{pdf,html}'),
    ('Weekly Threat Brief', 'weekly_threat_brief',
     'Weekly intelligence briefing on emerging threats and threat actor activity',
     'threat_brief',
     '{"sections": ["executive_summary", "new_threats", "actor_updates", "ioc_summary", "recommendations"]}',
     '{"lookback_days": 7, "min_severity": "medium"}',
     '{pdf,html}'),
    ('Compliance Status Report', 'compliance_status',
     'Current compliance status across all regulations and policies',
     'compliance_report',
     '{"sections": ["summary", "policy_status", "scan_results", "evidence_gaps", "remediation_plan"]}',
     '{"regulations": [], "include_evidence": true}',
     '{pdf,html,csv}'),
    ('Sanctions Screening Report', 'sanctions_screening',
     'Results of sanctions screening with match details and dispositions',
     'sanctions_screening',
     '{"sections": ["summary", "matches", "false_positives", "escalations", "statistics"]}',
     '{"min_match_score": 0.7, "include_dismissed": false}',
     '{pdf,csv}'),
    ('Situation Report (SITREP)', 'sitrep',
     'Incident or crisis situation report template',
     'situation_report',
     '{"sections": ["situation", "background", "assessment", "actions_taken", "next_steps", "annexes"]}',
     '{"classification": "internal"}',
     '{pdf,html}'),
    ('Executive Intelligence Brief', 'exec_brief',
     'Concise intelligence briefing for executive leadership',
     'executive_brief',
     '{"sections": ["key_judgments", "risk_outlook", "strategic_issues", "action_items"]}',
     '{"max_length_pages": 3}',
     '{pdf}'),
    ('Trade Analysis Report', 'trade_analysis',
     'Analysis of trade flows, restrictions, and partner risk profiles',
     'trade_analysis',
     '{"sections": ["trade_overview", "flow_analysis", "partner_risk", "restrictions", "anomalies"]}',
     '{"lookback_months": 3}',
     '{pdf,html,csv}'),
    ('Incident Report', 'incident_report',
     'Structured incident report for security events and disruptions',
     'incident_report',
     '{"sections": ["incident_summary", "timeline", "impact_assessment", "root_cause", "corrective_actions", "lessons_learned"]}',
     '{"severity_levels": ["high", "critical"]}',
     '{pdf,html}')
ON CONFLICT (code) DO NOTHING;

-- Default system configuration
INSERT INTO system_config (namespace, key, value, description, is_sensitive, is_readonly) VALUES
    ('platform', 'version', '"4.0.0"', 'Current platform version', false, true),
    ('platform', 'maintenance_mode', 'false', 'Global maintenance mode flag', false, false),
    ('risk', 'default_threshold_critical', '85', 'Default critical risk score threshold', false, false),
    ('risk', 'default_threshold_high', '65', 'Default high risk score threshold', false, false),
    ('risk', 'default_threshold_medium', '40', 'Default medium risk score threshold', false, false),
    ('risk', 'reassessment_interval_days', '30', 'Days between automatic risk reassessments', false, false),
    ('threats', 'auto_expire_days', '90', 'Days after which inactive threats auto-expire', false, false),
    ('threats', 'default_tlp_level', '"amber"', 'Default TLP classification for new threats', false, false),
    ('sanctions', 'default_match_threshold', '0.75', 'Minimum score for screening match flagging', false, false),
    ('sanctions', 'auto_screening_enabled', 'true', 'Enable automatic screening of new trade partners', false, false),
    ('compliance', 'scan_retention_days', '365', 'Days to retain compliance scan results', false, false),
    ('compliance', 'evidence_expiry_warning_days', '30', 'Days before evidence expiry to send warning', false, false),
    ('reports', 'default_classification', '"internal"', 'Default classification for new reports', false, false),
    ('reports', 'max_scheduled_reports', '50', 'Maximum number of active report schedules', false, false),
    ('notifications', 'retention_days', '90', 'Days to retain read notifications', false, false),
    ('notifications', 'max_per_user_per_day', '100', 'Maximum notifications per user per day', false, false),
    ('ml', 'max_concurrent_training', '3', 'Maximum concurrent ML training jobs', false, false),
    ('ml', 'prediction_log_retention_days', '180', 'Days to retain prediction logs', false, false),
    ('graph', 'max_traversal_depth', '6', 'Maximum depth for graph traversal queries', false, false),
    ('graph', 'community_detection_min_size', '3', 'Minimum members for community detection', false, false)
ON CONFLICT (namespace, key) DO NOTHING;

-- Default sanctions lists (registries only, no entries)
INSERT INTO sanctions_lists (name, issuing_authority, country, description, source_url) VALUES
    ('OFAC SDN List', 'U.S. Department of the Treasury', 'USA',
     'Office of Foreign Assets Control Specially Designated Nationals and Blocked Persons List',
     'https://www.treasury.gov/ofac/downloads/sdnlist.txt'),
    ('EU Consolidated Sanctions List', 'European Union', NULL,
     'EU consolidated list of persons, groups and entities subject to financial sanctions',
     'https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions'),
    ('UN Security Council Consolidated List', 'United Nations', NULL,
     'UN Security Council consolidated list of sanctioned individuals and entities',
     'https://scsanctions.un.org/resources/xml/en/consolidated.xml'),
    ('UK Sanctions List', 'HM Treasury', 'GBR',
     'UK financial sanctions consolidated list',
     'https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets'),
    ('OFAC Consolidated Non-SDN', 'U.S. Department of the Treasury', 'USA',
     'Non-SDN consolidated sanctions list including sectoral and other programs',
     'https://www.treasury.gov/ofac/downloads/consolidated/cons_advanced.xml')
ON CONFLICT (name) DO NOTHING;
