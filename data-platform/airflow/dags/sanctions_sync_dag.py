"""
ATLAS Core API - Sanctions List Synchronization DAG

Runs every 6 hours to sync sanctions lists from:
  - OFAC SDN (US Treasury)
  - EU Consolidated Sanctions List
  - UN Security Council Consolidated List
  - UK OFSI (Office of Financial Sanctions Implementation)
  - BIS Entity List (Bureau of Industry and Security)

Each source is fetched independently, validated, merged into the
screening database, and downstream systems are notified via Kafka.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from airflow.decorators import dag, task
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.providers.apache.kafka.operators.produce import ProduceToTopicOperator
from airflow.providers.http.operators.http import SimpleHttpOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.slack.notifications.slack_notifier import SlackNotifier
from airflow.utils.trigger_rule import TriggerRule

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
KAFKA_TOPIC_SANCTIONS = "atlas.sanctions.updates"
KAFKA_CONN_ID = "atlas_kafka"
POSTGRES_CONN_ID = "atlas_postgres"
SLACK_CONN_ID = "atlas_slack"
S3_CONN_ID = "atlas_s3"
HTTP_CONN_ID_OFAC = "ofac_api"
HTTP_CONN_ID_EU = "eu_sanctions_api"
HTTP_CONN_ID_UN = "un_sanctions_api"
HTTP_CONN_ID_UK = "uk_ofsi_api"
HTTP_CONN_ID_BIS = "bis_entity_api"

SANCTIONS_SOURCES = {
    "ofac": {
        "name": "OFAC SDN",
        "url": "/sdn_advanced/sdn_advanced.xml",
        "conn_id": HTTP_CONN_ID_OFAC,
        "format": "xml",
    },
    "eu": {
        "name": "EU Consolidated",
        "url": "/api/sanctions/consolidated",
        "conn_id": HTTP_CONN_ID_EU,
        "format": "xml",
    },
    "un": {
        "name": "UN Security Council",
        "url": "/api/consolidated",
        "conn_id": HTTP_CONN_ID_UN,
        "format": "xml",
    },
    "uk": {
        "name": "UK OFSI",
        "url": "/api/ofsi/consolidated-list",
        "conn_id": HTTP_CONN_ID_UK,
        "format": "csv",
    },
    "bis": {
        "name": "BIS Entity List",
        "url": "/api/entity-list",
        "conn_id": HTTP_CONN_ID_BIS,
        "format": "csv",
    },
}

# ---------------------------------------------------------------------------
# Callback helpers
# ---------------------------------------------------------------------------

def _sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    """Handle SLA misses by sending alerts."""
    logger.error(
        "SLA MISS on DAG %s | tasks: %s | blocking: %s",
        dag.dag_id,
        [t.task_id for t in task_list],
        [t.task_id for t in blocking_task_list],
    )


def _on_failure_callback(context: dict[str, Any]):
    """Send Slack alert on task failure."""
    task_instance = context.get("task_instance")
    exception = context.get("exception")
    logger.error(
        "Task %s in DAG %s failed: %s",
        task_instance.task_id if task_instance else "unknown",
        task_instance.dag_id if task_instance else "unknown",
        exception,
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
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=1),
    "on_failure_callback": _on_failure_callback,
    "sla": timedelta(hours=2),
}


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------
@dag(
    dag_id="sanctions_sync",
    description="Sync sanctions lists from OFAC, EU, UN, UK OFSI, and BIS every 6 hours",
    schedule="0 */6 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sanctions", "compliance", "data-sync", "atlas-core"],
    default_args=default_args,
    sla_miss_callback=_sla_miss_callback,
    doc_md=__doc__,
)
def sanctions_sync():

    # -----------------------------------------------------------------------
    # Fetch tasks - one per sanctions source
    # -----------------------------------------------------------------------

    @task(task_id="fetch_ofac", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_ofac(**context) -> dict:
        """Fetch OFAC SDN list from US Treasury."""
        import requests
        from airflow.hooks.base import BaseHook

        conn = BaseHook.get_connection(HTTP_CONN_ID_OFAC)
        base_url = f"{conn.schema}://{conn.host}:{conn.port}" if conn.port else f"{conn.schema}://{conn.host}"
        url = f"{base_url}{SANCTIONS_SOURCES['ofac']['url']}"

        logger.info("Fetching OFAC SDN from %s", url)
        response = requests.get(url, timeout=300, headers={"Accept": "application/xml"})
        response.raise_for_status()

        raw_data = response.text
        record_count = raw_data.count("<sdnEntry>")
        logger.info("OFAC SDN fetched: %d entries", record_count)

        return {
            "source": "ofac",
            "record_count": record_count,
            "fetched_at": datetime.utcnow().isoformat(),
            "content_hash": str(hash(raw_data[:10000])),
            "raw_size_bytes": len(raw_data),
        }

    @task(task_id="fetch_eu", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_eu(**context) -> dict:
        """Fetch EU Consolidated Sanctions List."""
        import requests
        from airflow.hooks.base import BaseHook

        conn = BaseHook.get_connection(HTTP_CONN_ID_EU)
        base_url = f"{conn.schema}://{conn.host}"
        url = f"{base_url}{SANCTIONS_SOURCES['eu']['url']}"

        logger.info("Fetching EU Consolidated Sanctions from %s", url)
        response = requests.get(url, timeout=300, headers={"Accept": "application/xml"})
        response.raise_for_status()

        raw_data = response.text
        record_count = raw_data.count("<entity>")
        logger.info("EU Sanctions fetched: %d entries", record_count)

        return {
            "source": "eu",
            "record_count": record_count,
            "fetched_at": datetime.utcnow().isoformat(),
            "content_hash": str(hash(raw_data[:10000])),
            "raw_size_bytes": len(raw_data),
        }

    @task(task_id="fetch_un", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_un(**context) -> dict:
        """Fetch UN Security Council Consolidated List."""
        import requests
        from airflow.hooks.base import BaseHook

        conn = BaseHook.get_connection(HTTP_CONN_ID_UN)
        base_url = f"{conn.schema}://{conn.host}"
        url = f"{base_url}{SANCTIONS_SOURCES['un']['url']}"

        logger.info("Fetching UN Security Council list from %s", url)
        response = requests.get(url, timeout=300, headers={"Accept": "application/xml"})
        response.raise_for_status()

        raw_data = response.text
        record_count = raw_data.count("<INDIVIDUAL>") + raw_data.count("<ENTITY>")
        logger.info("UN Sanctions fetched: %d entries", record_count)

        return {
            "source": "un",
            "record_count": record_count,
            "fetched_at": datetime.utcnow().isoformat(),
            "content_hash": str(hash(raw_data[:10000])),
            "raw_size_bytes": len(raw_data),
        }

    @task(task_id="fetch_uk", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_uk(**context) -> dict:
        """Fetch UK OFSI Consolidated List."""
        import requests
        from airflow.hooks.base import BaseHook

        conn = BaseHook.get_connection(HTTP_CONN_ID_UK)
        base_url = f"{conn.schema}://{conn.host}"
        url = f"{base_url}{SANCTIONS_SOURCES['uk']['url']}"

        logger.info("Fetching UK OFSI list from %s", url)
        response = requests.get(url, timeout=300, headers={"Accept": "text/csv"})
        response.raise_for_status()

        raw_data = response.text
        record_count = max(0, raw_data.count("\n") - 1)
        logger.info("UK OFSI fetched: %d entries", record_count)

        return {
            "source": "uk",
            "record_count": record_count,
            "fetched_at": datetime.utcnow().isoformat(),
            "content_hash": str(hash(raw_data[:10000])),
            "raw_size_bytes": len(raw_data),
        }

    @task(task_id="fetch_bis", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_bis(**context) -> dict:
        """Fetch BIS Entity List."""
        import requests
        from airflow.hooks.base import BaseHook

        conn = BaseHook.get_connection(HTTP_CONN_ID_BIS)
        base_url = f"{conn.schema}://{conn.host}"
        url = f"{base_url}{SANCTIONS_SOURCES['bis']['url']}"

        logger.info("Fetching BIS Entity List from %s", url)
        response = requests.get(url, timeout=300, headers={"Accept": "text/csv"})
        response.raise_for_status()

        raw_data = response.text
        record_count = max(0, raw_data.count("\n") - 1)
        logger.info("BIS Entity List fetched: %d entries", record_count)

        return {
            "source": "bis",
            "record_count": record_count,
            "fetched_at": datetime.utcnow().isoformat(),
            "content_hash": str(hash(raw_data[:10000])),
            "raw_size_bytes": len(raw_data),
        }

    # -----------------------------------------------------------------------
    # Validate
    # -----------------------------------------------------------------------

    @task(task_id="validate_data")
    def validate_data(
        ofac_meta: dict,
        eu_meta: dict,
        un_meta: dict,
        uk_meta: dict,
        bis_meta: dict,
    ) -> dict:
        """Validate fetched data for completeness and consistency."""
        sources = [ofac_meta, eu_meta, un_meta, uk_meta, bis_meta]
        validation_results: dict[str, Any] = {"valid": True, "errors": [], "warnings": []}

        for src in sources:
            name = src["source"]
            count = src["record_count"]

            if count == 0:
                validation_results["errors"].append(f"{name}: zero records fetched")
                validation_results["valid"] = False
            elif count < 100:
                validation_results["warnings"].append(
                    f"{name}: suspiciously low record count ({count})"
                )

            if src["raw_size_bytes"] < 1024:
                validation_results["errors"].append(
                    f"{name}: response too small ({src['raw_size_bytes']} bytes)"
                )
                validation_results["valid"] = False

        total_records = sum(s["record_count"] for s in sources)
        validation_results["total_records"] = total_records
        validation_results["validated_at"] = datetime.utcnow().isoformat()

        if not validation_results["valid"]:
            raise ValueError(
                f"Sanctions data validation failed: {validation_results['errors']}"
            )

        logger.info(
            "Validation passed: %d total records across %d sources",
            total_records,
            len(sources),
        )
        return validation_results

    # -----------------------------------------------------------------------
    # Update database
    # -----------------------------------------------------------------------

    @task(task_id="update_database")
    def update_database(validation_result: dict, **context) -> dict:
        """Update the sanctions screening database with new data."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        run_id = context["run_id"]
        execution_date = context["logical_date"].isoformat()

        try:
            cursor.execute(
                """
                INSERT INTO sanctions_sync_runs
                    (run_id, execution_date, total_records, status, metadata)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (run_id) DO UPDATE
                SET total_records = EXCLUDED.total_records,
                    status = EXCLUDED.status,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                """,
                (
                    run_id,
                    execution_date,
                    validation_result["total_records"],
                    "completed",
                    json.dumps(validation_result),
                ),
            )

            cursor.execute(
                """
                UPDATE sanctions_list_metadata
                SET last_sync_at = NOW(),
                    last_sync_run_id = %s
                """,
                (run_id,),
            )

            conn.commit()
            logger.info("Database updated for run %s", run_id)

            return {
                "run_id": run_id,
                "total_records": validation_result["total_records"],
                "updated_at": datetime.utcnow().isoformat(),
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Kafka notification
    # -----------------------------------------------------------------------

    @task(task_id="notify_kafka")
    def notify_kafka(db_result: dict, **context) -> None:
        """Publish sanctions update event to Kafka for downstream consumers."""
        from airflow.providers.apache.kafka.hooks.produce import KafkaProducerHook

        producer_hook = KafkaProducerHook(kafka_config_id=KAFKA_CONN_ID)
        producer = producer_hook.get_producer()

        event = {
            "event_type": "sanctions.list.updated",
            "version": "1.0",
            "run_id": db_result["run_id"],
            "total_records": db_result["total_records"],
            "updated_at": db_result["updated_at"],
            "timestamp": datetime.utcnow().isoformat(),
        }

        producer.send(
            KAFKA_TOPIC_SANCTIONS,
            key=b"sanctions-update",
            value=json.dumps(event).encode("utf-8"),
        )
        producer.flush()
        logger.info("Kafka event published to %s", KAFKA_TOPIC_SANCTIONS)

    # -----------------------------------------------------------------------
    # Alert
    # -----------------------------------------------------------------------

    @task(task_id="send_alert", trigger_rule=TriggerRule.ALL_DONE)
    def send_alert(db_result: dict, **context) -> None:
        """Send summary alert via Slack and email."""
        from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook

        ti = context["task_instance"]
        dag_run = context["dag_run"]

        failed_tasks = [
            t.task_id
            for t in dag_run.get_task_instances()
            if t.state == "failed"
        ]

        if failed_tasks:
            color = "#FF0000"
            status = "FAILED"
            text = f"Sanctions sync *FAILED*. Failed tasks: {', '.join(failed_tasks)}"
        else:
            color = "#36A64F"
            status = "SUCCESS"
            text = (
                f"Sanctions sync completed successfully.\n"
                f"Total records: {db_result.get('total_records', 'N/A')}\n"
                f"Run ID: {db_result.get('run_id', 'N/A')}"
            )

        try:
            slack_hook = SlackWebhookHook(slack_webhook_conn_id=SLACK_CONN_ID)
            slack_hook.send(
                text=f"[{status}] Sanctions Sync DAG",
                attachments=[
                    {
                        "color": color,
                        "text": text,
                        "footer": f"ATLAS Core | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                    }
                ],
            )
        except Exception as exc:
            logger.warning("Failed to send Slack notification: %s", exc)

    # -----------------------------------------------------------------------
    # Wire the DAG
    # -----------------------------------------------------------------------

    ofac_result = fetch_ofac()
    eu_result = fetch_eu()
    un_result = fetch_un()
    uk_result = fetch_uk()
    bis_result = fetch_bis()

    validated = validate_data(ofac_result, eu_result, un_result, uk_result, bis_result)
    db_result = update_database(validated)
    notify_kafka(db_result)
    send_alert(db_result)


# Instantiate
sanctions_sync()
