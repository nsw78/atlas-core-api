from datetime import timedelta
from feast import FeatureView, Field
from feast.types import Float64, Int64, String, Bool
from feast.infra.offline_stores.contrib.postgres_offline_store.postgres_source import PostgreSQLSource
from entities import entity, country

entity_risk_source = PostgreSQLSource(name="entity_risk_components", query="SELECT * FROM entity_risk_components", timestamp_field="updated_at")
sanctions_source = PostgreSQLSource(name="sanctions_features", query="SELECT * FROM sanctions_screening_features", timestamp_field="last_screened_at")
trade_source = PostgreSQLSource(name="trade_features", query="SELECT * FROM trade_entity_features", timestamp_field="calculated_at")
graph_source = PostgreSQLSource(name="graph_features", query="SELECT * FROM graph_entity_features", timestamp_field="computed_at")

entity_risk_features = FeatureView(
    name="entity_risk_features", entities=[entity], ttl=timedelta(hours=24), online=True, source=entity_risk_source,
    schema=[
        Field(name="sanctions_score", dtype=Float64), Field(name="trade_anomaly_score", dtype=Float64),
        Field(name="graph_signal_score", dtype=Float64), Field(name="historical_score", dtype=Float64),
        Field(name="country_risk_score", dtype=Float64), Field(name="pep_exposure_score", dtype=Float64),
        Field(name="composite_risk_score", dtype=Float64), Field(name="risk_level", dtype=String),
        Field(name="transaction_count_30d", dtype=Int64), Field(name="avg_transaction_value_30d", dtype=Float64),
    ],
)

sanctions_features = FeatureView(
    name="sanctions_features", entities=[entity], ttl=timedelta(hours=12), online=True, source=sanctions_source,
    schema=[
        Field(name="match_count", dtype=Int64), Field(name="highest_match_score", dtype=Float64),
        Field(name="lists_matched", dtype=Int64), Field(name="is_sanctioned", dtype=Bool),
        Field(name="screening_count_30d", dtype=Int64), Field(name="false_positive_count", dtype=Int64),
    ],
)

trade_features = FeatureView(
    name="trade_features", entities=[entity], ttl=timedelta(hours=24), online=True, source=trade_source,
    schema=[
        Field(name="export_volume_90d", dtype=Float64), Field(name="import_volume_90d", dtype=Float64),
        Field(name="unique_partners_90d", dtype=Int64), Field(name="sanctioned_country_trade_pct", dtype=Float64),
        Field(name="trade_velocity_change", dtype=Float64),
    ],
)

graph_features = FeatureView(
    name="graph_features", entities=[entity], ttl=timedelta(hours=12), online=True, source=graph_source,
    schema=[
        Field(name="degree_centrality", dtype=Float64), Field(name="betweenness_centrality", dtype=Float64),
        Field(name="pagerank_score", dtype=Float64), Field(name="community_risk_score", dtype=Float64),
        Field(name="shortest_path_to_sanctioned", dtype=Int64),
    ],
)

country_risk_features = FeatureView(
    name="country_risk_features", entities=[country], ttl=timedelta(hours=48), online=True,
    source=PostgreSQLSource(name="country_risk", query="SELECT * FROM country_risk_indicators", timestamp_field="updated_at"),
    schema=[
        Field(name="overall_risk_score", dtype=Float64), Field(name="sanctions_risk", dtype=Float64),
        Field(name="corruption_index", dtype=Float64), Field(name="is_us_sanctioned", dtype=Bool),
        Field(name="is_eu_sanctioned", dtype=Bool), Field(name="is_fatf_greylist", dtype=Bool),
    ],
)
