"""
ATLAS Core API - Risk Aggregation DAG

Hourly DAG to aggregate risk scores across the platform:
  - Reads risk events from Kafka
  - Calculates composite entity risk scores
  - Updates the risk matrix
  - Detects anomalies via statistical and ML-based methods
  - Triggers alerts for high-risk findings
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from airflow.decorators import dag, task
from airflow.models import Variable
from airflow.utils.trigger_rule import TriggerRule

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
KAFKA_CONN_ID = "atlas_kafka"
POSTGRES_CONN_ID = "atlas_postgres"
REDIS_CONN_ID = "atlas_redis"
SLACK_CONN_ID = "atlas_slack"
MLFLOW_TRACKING_URI = "http://mlflow:5000"

KAFKA_TOPICS = [
    "atlas.risk.entity_scored",
    "atlas.risk.sanctions_match",
    "atlas.risk.trade_anomaly",
    "atlas.risk.graph_signal",
    "atlas.alert.created",
    "atlas.alert.resolved",
]

RISK_SCORE_WEIGHTS = {
    "sanctions": 0.30,
    "trade_anomaly": 0.20,
    "graph_signal": 0.15,
    "historical": 0.15,
    "country_risk": 0.10,
    "pep_exposure": 0.10,
}

ANOMALY_Z_SCORE_THRESHOLD = 3.0
HIGH_RISK_THRESHOLD = 0.75
CRITICAL_RISK_THRESHOLD = 0.90


# ---------------------------------------------------------------------------
# Callbacks
# ---------------------------------------------------------------------------

def _sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    logger.error(
        "SLA MISS on DAG %s | tasks: %s",
        dag.dag_id,
        [t.task_id for t in task_list],
    )


def _on_failure_callback(context: dict[str, Any]):
    task_instance = context.get("task_instance")
    logger.error(
        "Task %s failed in DAG %s: %s",
        task_instance.task_id if task_instance else "unknown",
        task_instance.dag_id if task_instance else "unknown",
        context.get("exception"),
    )


# ---------------------------------------------------------------------------
# Default args
# ---------------------------------------------------------------------------
default_args = {
    "owner": "atlas-data-platform",
    "depends_on_past": False,
    "email": [Variable.get("alert_email", default_var="data-ops@atlas-core.io")],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=20),
    "execution_timeout": timedelta(minutes=45),
    "on_failure_callback": _on_failure_callback,
    "sla": timedelta(hours=1),
}


@dag(
    dag_id="risk_aggregation",
    description="Hourly risk score aggregation with anomaly detection",
    schedule="0 * * * *",  # every hour
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["risk", "aggregation", "anomaly-detection", "atlas-core"],
    default_args=default_args,
    sla_miss_callback=_sla_miss_callback,
    doc_md=__doc__,
)
def risk_aggregation():

    # -----------------------------------------------------------------------
    # Read Kafka events
    # -----------------------------------------------------------------------

    @task(task_id="read_kafka_events")
    def read_kafka_events(**context) -> dict:
        """Consume recent risk events from Kafka topics."""
        from confluent_kafka import Consumer, TopicPartition

        kafka_config = {
            "bootstrap.servers": Variable.get("kafka_bootstrap_servers", default_var="kafka:9092"),
            "group.id": "atlas-risk-aggregation",
            "auto.offset.reset": "latest",
            "enable.auto.commit": False,
            "max.poll.interval.ms": 300000,
        }

        consumer = Consumer(kafka_config)
        events_by_topic: dict[str, list] = {topic: [] for topic in KAFKA_TOPICS}
        total_events = 0

        try:
            consumer.subscribe(KAFKA_TOPICS)

            # Poll for up to 60 seconds to collect the batch
            deadline = datetime.utcnow() + timedelta(seconds=60)
            while datetime.utcnow() < deadline:
                msg = consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    logger.warning("Kafka consumer error: %s", msg.error())
                    continue

                topic = msg.topic()
                try:
                    value = json.loads(msg.value().decode("utf-8"))
                    events_by_topic[topic].append(value)
                    total_events += 1
                except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                    logger.warning("Failed to decode message from %s: %s", topic, exc)

            consumer.commit()
        finally:
            consumer.close()

        topic_counts = {t: len(evts) for t, evts in events_by_topic.items()}
        logger.info("Read %d total events: %s", total_events, topic_counts)

        return {
            "total_events": total_events,
            "topic_counts": topic_counts,
            "window_start": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "window_end": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Calculate entity scores
    # -----------------------------------------------------------------------

    @task(task_id="calculate_entity_scores")
    def calculate_entity_scores(kafka_meta: dict, **context) -> dict:
        """Calculate composite risk scores for all active entities."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        try:
            # Fetch entities with recent activity
            cursor.execute(
                """
                SELECT entity_id, entity_type,
                       sanctions_score, trade_anomaly_score,
                       graph_signal_score, historical_score,
                       country_risk_score, pep_exposure_score
                FROM entity_risk_components
                WHERE updated_at >= NOW() - INTERVAL '2 hours'
                """
            )
            rows = cursor.fetchall()

            scored_entities = []
            high_risk_count = 0
            critical_count = 0

            for row in rows:
                entity_id = row[0]
                scores = {
                    "sanctions": row[2] or 0.0,
                    "trade_anomaly": row[3] or 0.0,
                    "graph_signal": row[4] or 0.0,
                    "historical": row[5] or 0.0,
                    "country_risk": row[6] or 0.0,
                    "pep_exposure": row[7] or 0.0,
                }

                composite = sum(
                    scores[k] * RISK_SCORE_WEIGHTS[k] for k in RISK_SCORE_WEIGHTS
                )
                composite = min(1.0, max(0.0, composite))

                if composite >= CRITICAL_RISK_THRESHOLD:
                    critical_count += 1
                    risk_level = "CRITICAL"
                elif composite >= HIGH_RISK_THRESHOLD:
                    high_risk_count += 1
                    risk_level = "HIGH"
                elif composite >= 0.50:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "LOW"

                # Update composite score
                cursor.execute(
                    """
                    UPDATE entity_risk_scores
                    SET composite_score = %s,
                        risk_level = %s,
                        calculated_at = NOW(),
                        component_scores = %s
                    WHERE entity_id = %s
                    """,
                    (composite, risk_level, json.dumps(scores), entity_id),
                )

                scored_entities.append({
                    "entity_id": entity_id,
                    "composite_score": composite,
                    "risk_level": risk_level,
                })

            conn.commit()

            result = {
                "entities_scored": len(scored_entities),
                "high_risk_count": high_risk_count,
                "critical_count": critical_count,
                "calculated_at": datetime.utcnow().isoformat(),
            }
            logger.info(
                "Scored %d entities: %d high risk, %d critical",
                len(scored_entities),
                high_risk_count,
                critical_count,
            )
            return result

        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Update risk matrix
    # -----------------------------------------------------------------------

    @task(task_id="update_risk_matrix")
    def update_risk_matrix(score_result: dict, **context) -> dict:
        """Rebuild the aggregated risk matrix (country x sector x risk-level)."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO risk_matrix_snapshots (
                    snapshot_date, total_entities, high_risk_count,
                    critical_count, matrix_data
                )
                VALUES (NOW(), %s, %s, %s, %s)
                """,
                (
                    score_result["entities_scored"],
                    score_result["high_risk_count"],
                    score_result["critical_count"],
                    json.dumps(score_result),
                ),
            )

            # Refresh materialized views for dashboard queries
            cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_country_risk_summary")
            cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sector_risk_heatmap")

            conn.commit()
            logger.info("Risk matrix updated and materialized views refreshed")

            return {
                "matrix_updated": True,
                "views_refreshed": ["mv_country_risk_summary", "mv_sector_risk_heatmap"],
                "updated_at": datetime.utcnow().isoformat(),
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Detect anomalies
    # -----------------------------------------------------------------------

    @task(task_id="detect_anomalies")
    def detect_anomalies(score_result: dict, **context) -> dict:
        """Detect anomalies using statistical and ML-based methods."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook
        import numpy as np

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        try:
            # Fetch recent score history for z-score computation
            cursor.execute(
                """
                SELECT entity_id, composite_score,
                       AVG(composite_score) OVER (
                           PARTITION BY entity_id
                           ORDER BY calculated_at
                           ROWS BETWEEN 168 PRECEDING AND 1 PRECEDING
                       ) AS rolling_mean,
                       STDDEV(composite_score) OVER (
                           PARTITION BY entity_id
                           ORDER BY calculated_at
                           ROWS BETWEEN 168 PRECEDING AND 1 PRECEDING
                       ) AS rolling_std
                FROM entity_risk_score_history
                WHERE calculated_at >= NOW() - INTERVAL '8 days'
                """
            )
            rows = cursor.fetchall()

            anomalies = []
            for row in rows:
                entity_id, current_score, rolling_mean, rolling_std = row
                if rolling_std and rolling_std > 0:
                    z_score = abs((current_score - rolling_mean) / rolling_std)
                    if z_score >= ANOMALY_Z_SCORE_THRESHOLD:
                        anomalies.append({
                            "entity_id": entity_id,
                            "current_score": float(current_score),
                            "rolling_mean": float(rolling_mean),
                            "z_score": float(z_score),
                            "anomaly_type": "statistical_zscore",
                        })

            # Store anomalies
            for anomaly in anomalies:
                cursor.execute(
                    """
                    INSERT INTO risk_anomalies (
                        entity_id, anomaly_type, z_score,
                        current_score, baseline_score, detected_at, metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW(), %s)
                    """,
                    (
                        anomaly["entity_id"],
                        anomaly["anomaly_type"],
                        anomaly["z_score"],
                        anomaly["current_score"],
                        anomaly["rolling_mean"],
                        json.dumps(anomaly),
                    ),
                )

            conn.commit()

            result = {
                "anomalies_detected": len(anomalies),
                "entities_analyzed": len(rows),
                "threshold": ANOMALY_Z_SCORE_THRESHOLD,
                "detected_at": datetime.utcnow().isoformat(),
            }
            logger.info("Detected %d anomalies out of %d entities", len(anomalies), len(rows))
            return result

        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Trigger alerts
    # -----------------------------------------------------------------------

    @task(task_id="trigger_alerts", trigger_rule=TriggerRule.ALL_DONE)
    def trigger_alerts(
        score_result: dict,
        anomaly_result: dict,
        matrix_result: dict,
        **context,
    ) -> None:
        """Send alerts for high-risk entities and anomalies."""
        from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook
        from airflow.providers.apache.kafka.hooks.produce import KafkaProducerHook

        critical_count = score_result.get("critical_count", 0)
        high_risk_count = score_result.get("high_risk_count", 0)
        anomalies = anomaly_result.get("anomalies_detected", 0)

        # Publish alert events to Kafka
        try:
            producer_hook = KafkaProducerHook(kafka_config_id=KAFKA_CONN_ID)
            producer = producer_hook.get_producer()

            alert_event = {
                "event_type": "risk.aggregation.completed",
                "entities_scored": score_result["entities_scored"],
                "critical_count": critical_count,
                "high_risk_count": high_risk_count,
                "anomalies_detected": anomalies,
                "timestamp": datetime.utcnow().isoformat(),
            }
            producer.send(
                "atlas.alert.risk_aggregation",
                key=b"risk-aggregation",
                value=json.dumps(alert_event).encode("utf-8"),
            )
            producer.flush()
        except Exception as exc:
            logger.error("Failed to publish Kafka alert: %s", exc)

        # Slack notification for critical findings
        if critical_count > 0 or anomalies > 5:
            try:
                slack_hook = SlackWebhookHook(slack_webhook_conn_id=SLACK_CONN_ID)
                slack_hook.send(
                    text="Risk Aggregation Alert",
                    attachments=[
                        {
                            "color": "#FF0000" if critical_count > 0 else "#FFA500",
                            "text": (
                                f"*Risk Aggregation Summary*\n"
                                f"Entities scored: {score_result['entities_scored']}\n"
                                f"Critical: {critical_count}\n"
                                f"High Risk: {high_risk_count}\n"
                                f"Anomalies: {anomalies}"
                            ),
                            "footer": f"ATLAS Core | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                        }
                    ],
                )
            except Exception as exc:
                logger.warning("Failed to send Slack alert: %s", exc)

    # -----------------------------------------------------------------------
    # Wire the DAG
    # -----------------------------------------------------------------------

    kafka_events = read_kafka_events()
    scores = calculate_entity_scores(kafka_events)
    matrix = update_risk_matrix(scores)
    anomalies = detect_anomalies(scores)
    trigger_alerts(scores, anomalies, matrix)


# Instantiate
risk_aggregation()
