-- Rollback geospatial migration 000002

-- Drop functions
DROP FUNCTION IF EXISTS find_features_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS check_point_in_risk_zones(DOUBLE PRECISION, DOUBLE PRECISION);

-- Drop indexes
DROP INDEX IF EXISTS idx_geo_features_geom;
DROP INDEX IF EXISTS idx_geo_features_type;
DROP INDEX IF EXISTS idx_geo_features_risk;
DROP INDEX IF EXISTS idx_routes_geom;
DROP INDEX IF EXISTS idx_routes_mode;
DROP INDEX IF EXISTS idx_routes_active;
DROP INDEX IF EXISTS idx_zones_boundary;
DROP INDEX IF EXISTS idx_zones_type;
DROP INDEX IF EXISTS idx_zones_risk;
DROP INDEX IF EXISTS idx_poi_location;
DROP INDEX IF EXISTS idx_poi_type;
DROP INDEX IF EXISTS idx_poi_category;
DROP INDEX IF EXISTS idx_geo_events_location;
DROP INDEX IF EXISTS idx_geo_events_type;
DROP INDEX IF EXISTS idx_geo_events_occurred;

-- Drop tables
DROP TABLE IF EXISTS geo_events;
DROP TABLE IF EXISTS points_of_interest;
DROP TABLE IF EXISTS risk_zones;
DROP TABLE IF EXISTS supply_chain_routes;
DROP TABLE IF EXISTS geo_features;

-- Drop extensions (be cautious in production)
-- DROP EXTENSION IF EXISTS postgis_topology;
-- DROP EXTENSION IF EXISTS postgis;
