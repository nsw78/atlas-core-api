-- Geospatial schema migration for ATLAS Core API
-- Version: 000002
-- Description: PostGIS tables for geospatial intelligence

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ========================================
-- Geospatial Features Table
-- ========================================

CREATE TABLE IF NOT EXISTS geo_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_type VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    properties JSONB,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Supply Chain Routes
-- ========================================

CREATE TABLE IF NOT EXISTS supply_chain_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    route_geometry GEOMETRY(LineString, 4326) NOT NULL,
    mode_of_transport VARCHAR(50),
    estimated_duration_hours INTEGER,
    risk_score DECIMAL(5,2),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Risk Zones (Polygons)
-- ========================================

CREATE TABLE IF NOT EXISTS risk_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(100) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB,
    population INTEGER,
    affected_entities UUID[],
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Points of Interest (POIs)
-- ========================================

CREATE TABLE IF NOT EXISTS points_of_interest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poi_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    category VARCHAR(100),
    importance_score INTEGER CHECK (importance_score >= 1 AND importance_score <= 10),
    attributes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Geospatial Event Log
-- ========================================

CREATE TABLE IF NOT EXISTS geo_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    severity VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    event_data JSONB,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Spatial Indexes (CRITICAL for Performance)
-- ========================================

CREATE INDEX idx_geo_features_geom ON geo_features USING GIST(geometry);
CREATE INDEX idx_geo_features_type ON geo_features(feature_type);
CREATE INDEX idx_geo_features_risk ON geo_features(risk_level);

CREATE INDEX idx_routes_geom ON supply_chain_routes USING GIST(route_geometry);
CREATE INDEX idx_routes_mode ON supply_chain_routes(mode_of_transport);
CREATE INDEX idx_routes_active ON supply_chain_routes(is_active);

CREATE INDEX idx_zones_boundary ON risk_zones USING GIST(boundary);
CREATE INDEX idx_zones_type ON risk_zones(zone_type);
CREATE INDEX idx_zones_risk ON risk_zones(risk_level);

CREATE INDEX idx_poi_location ON points_of_interest USING GIST(location);
CREATE INDEX idx_poi_type ON points_of_interest(poi_type);
CREATE INDEX idx_poi_category ON points_of_interest(category);

CREATE INDEX idx_geo_events_location ON geo_events USING GIST(location);
CREATE INDEX idx_geo_events_type ON geo_events(event_type);
CREATE INDEX idx_geo_events_occurred ON geo_events(occurred_at DESC);

-- ========================================
-- Spatial Functions for Analysis
-- ========================================

-- Function to find features within a radius
CREATE OR REPLACE FUNCTION find_features_within_radius(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    feature_id UUID,
    feature_name VARCHAR,
    feature_type VARCHAR,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        name,
        feature_type,
        ST_Distance(
            geometry::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) AS distance_meters
    FROM geo_features
    WHERE ST_DWithin(
        geometry::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to check if point is in risk zone
CREATE OR REPLACE FUNCTION check_point_in_risk_zones(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
)
RETURNS TABLE (
    zone_id UUID,
    zone_name VARCHAR,
    risk_level VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        zone_name,
        risk_level
    FROM risk_zones
    WHERE ST_Contains(
        boundary,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    )
    AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE geo_features IS 'Geospatial features with geometry data';
COMMENT ON TABLE risk_zones IS 'Polygonal risk zones for geopolitical analysis';
COMMENT ON TABLE supply_chain_routes IS 'Supply chain logistics routes';
