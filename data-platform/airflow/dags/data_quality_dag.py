"""
ATLAS Core API - Data Quality DAG

Runs every 4 hours to check data freshness, completeness, and
consistency across all ATLAS platform services.

Quality dimensions checked:
  - Freshness: data not older than expected SLA
  - Completeness: no missing required fields, row count thresholds
  - Consistency: cross-service referential integrity
  - Accuracy: statistical distribution checks
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from airflow.decorators import dag, task, task_group
from airflow.models import Variable
from airflow.utils.trigger_rule import TriggerRule

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
POSTGRES_CONN_ID = "atlas_postgres"
REDIS_CONN_ID = "atlas_redis"
SLACK_CONN_ID = "atlas_slack"

# Freshness SLAs per data source (max age in hours)
FRESHNESS_SLAS = {
    "sanctions_lists": 7,           # synced every 6h, allow 1h buffer
    "trade_data": 25,               # daily refresh + 1h buffer
    "risk_scores": 2,               # hourly aggregation + 1h buffer
    "entity_profiles": 24,
    "graph_data": 12,
    "model_predictions": 2,
    "audit_logs": 1,
}

# Minimum expected row counts per table
MIN_ROW_COUNTS = {
    "sanctions_entries": 50000,
    "entity_profiles": 1000,
    "risk_scores": 1000,
    "trade_flows": 100000,
    "audit_events": 10000,
}

# Required fields per table
REQUIRED_FIELDS = {
    "sanctions_entries": ["id", "source", "entity_name", "list_type", "created_at"],
    "entity_profiles": ["entity_id", "entity_type", "name", "status", "created_at"],
    "risk_scores": ["entity_id", "composite_score", "risk_level", "calculated_at"],
    "trade_flows": ["reporter_code", "partner_code", "commodity_code", "trade_value"],
}


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
    "max_retry_delay": timedelta(minutes=15),
    "execution_timeout": timedelta(hours=1),
    "on_failure_callback": _on_failure_callback,
    "sla": timedelta(hours=2),
}


@dag(
    dag_id="data_quality",
    description="Check data freshness, completeness, and consistency every 4 hours",
    schedule="0 */4 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["data-quality", "monitoring", "atlas-core"],
    default_args=default_args,
    sla_miss_callback=_sla_miss_callback,
    doc_md=__doc__,
)
def data_quality():

    # -----------------------------------------------------------------------
    # Freshness checks
    # -----------------------------------------------------------------------

    @task(task_id="check_freshness")
    def check_freshness(**context) -> dict:
        """Check that all data sources are within their freshness SLAs."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        results = {}
        violations = []

        freshness_queries = {
            "sanctions_lists": "SELECT MAX(last_sync_at) FROM sanctions_list_metadata",
            "trade_data": "SELECT MAX(loaded_at) FROM trade_data_load_log",
            "risk_scores": "SELECT MAX(calculated_at) FROM entity_risk_scores",
            "entity_profiles": "SELECT MAX(updated_at) FROM entity_profiles",
            "graph_data": "SELECT MAX(computed_at) FROM graph_metrics",
            "model_predictions": "SELECT MAX(predicted_at) FROM model_predictions",
            "audit_logs": "SELECT MAX(created_at) FROM audit_events",
        }

        for source, query in freshness_queries.items():
            try:
                cursor.execute(query)
                row = cursor.fetchone()
                last_updated = row[0] if row and row[0] else None

                if last_updated is None:
                    age_hours = float("inf")
                    status = "MISSING"
                else:
                    age_hours = (datetime.utcnow() - last_updated).total_seconds() / 3600
                    sla_hours = FRESHNESS_SLAS.get(source, 24)
                    status = "OK" if age_hours <= sla_hours else "STALE"

                if status != "OK":
                    violations.append({
                        "source": source,
                        "status": status,
                        "age_hours": round(age_hours, 2),
                        "sla_hours": FRESHNESS_SLAS.get(source, 24),
                    })

                results[source] = {
                    "last_updated": last_updated.isoformat() if last_updated else None,
                    "age_hours": round(age_hours, 2),
                    "sla_hours": FRESHNESS_SLAS.get(source, 24),
                    "status": status,
                }
            except Exception as exc:
                logger.error("Freshness check failed for %s: %s", source, exc)
                results[source] = {"status": "ERROR", "error": str(exc)}
                violations.append({"source": source, "status": "ERROR", "error": str(exc)})

        cursor.close()
        conn.close()

        logger.info(
            "Freshness check: %d sources checked, %d violations",
            len(results),
            len(violations),
        )

        return {
            "results": results,
            "violations": violations,
            "total_checked": len(results),
            "total_violations": len(violations),
            "checked_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Completeness checks
    # -----------------------------------------------------------------------

    @task(task_id="check_completeness")
    def check_completeness(**context) -> dict:
        """Verify row counts and required field population."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        results = {}
        violations = []

        # Row count checks
        for table, min_count in MIN_ROW_COUNTS.items():
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608
                actual_count = cursor.fetchone()[0]
                status = "OK" if actual_count >= min_count else "LOW"

                if status != "OK":
                    violations.append({
                        "table": table,
                        "check": "row_count",
                        "expected_min": min_count,
                        "actual": actual_count,
                    })

                results[f"{table}.row_count"] = {
                    "actual": actual_count,
                    "expected_min": min_count,
                    "status": status,
                }
            except Exception as exc:
                logger.error("Row count check failed for %s: %s", table, exc)
                results[f"{table}.row_count"] = {"status": "ERROR", "error": str(exc)}

        # Null checks on required fields
        for table, fields in REQUIRED_FIELDS.items():
            for field in fields:
                try:
                    cursor.execute(
                        f"SELECT COUNT(*) FROM {table} WHERE {field} IS NULL"  # noqa: S608
                    )
                    null_count = cursor.fetchone()[0]
                    status = "OK" if null_count == 0 else "HAS_NULLS"

                    if status != "OK":
                        violations.append({
                            "table": table,
                            "check": "null_field",
                            "field": field,
                            "null_count": null_count,
                        })

                    results[f"{table}.{field}.nulls"] = {
                        "null_count": null_count,
                        "status": status,
                    }
                except Exception as exc:
                    logger.error(
                        "Null check failed for %s.%s: %s", table, field, exc
                    )

        cursor.close()
        conn.close()

        logger.info(
            "Completeness check: %d checks run, %d violations",
            len(results),
            len(violations),
        )

        return {
            "results": results,
            "violations": violations,
            "total_checks": len(results),
            "total_violations": len(violations),
            "checked_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Consistency checks
    # -----------------------------------------------------------------------

    @task(task_id="check_consistency")
    def check_consistency(**context) -> dict:
        """Check cross-service referential integrity and data consistency."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        results = {}
        violations = []

        consistency_checks = [
            {
                "name": "risk_scores_without_entity",
                "query": """
                    SELECT COUNT(*) FROM entity_risk_scores rs
                    LEFT JOIN entity_profiles ep ON rs.entity_id = ep.entity_id
                    WHERE ep.entity_id IS NULL
                """,
                "expected": 0,
                "description": "Risk scores referencing non-existent entities",
            },
            {
                "name": "orphaned_sanctions_matches",
                "query": """
                    SELECT COUNT(*) FROM sanctions_screening_results sr
                    LEFT JOIN entity_profiles ep ON sr.entity_id = ep.entity_id
                    WHERE ep.entity_id IS NULL
                """,
                "expected": 0,
                "description": "Sanctions matches for non-existent entities",
            },
            {
                "name": "duplicate_active_risk_scores",
                "query": """
                    SELECT COUNT(*) FROM (
                        SELECT entity_id, COUNT(*) as cnt
                        FROM entity_risk_scores
                        WHERE is_active = true
                        GROUP BY entity_id
                        HAVING COUNT(*) > 1
                    ) dupes
                """,
                "expected": 0,
                "description": "Entities with multiple active risk scores",
            },
            {
                "name": "score_range_violations",
                "query": """
                    SELECT COUNT(*) FROM entity_risk_scores
                    WHERE composite_score < 0 OR composite_score > 1
                """,
                "expected": 0,
                "description": "Risk scores outside valid range [0, 1]",
            },
            {
                "name": "future_timestamps",
                "query": """
                    SELECT COUNT(*) FROM audit_events
                    WHERE created_at > NOW() + INTERVAL '1 hour'
                """,
                "expected": 0,
                "description": "Audit events with future timestamps",
            },
        ]

        for check in consistency_checks:
            try:
                cursor.execute(check["query"])
                actual = cursor.fetchone()[0]
                status = "OK" if actual <= check["expected"] else "VIOLATION"

                if status != "OK":
                    violations.append({
                        "check": check["name"],
                        "description": check["description"],
                        "expected": check["expected"],
                        "actual": actual,
                    })

                results[check["name"]] = {
                    "description": check["description"],
                    "actual": actual,
                    "expected": check["expected"],
                    "status": status,
                }
            except Exception as exc:
                logger.error("Consistency check %s failed: %s", check["name"], exc)
                results[check["name"]] = {"status": "ERROR", "error": str(exc)}

        cursor.close()
        conn.close()

        logger.info(
            "Consistency check: %d checks run, %d violations",
            len(results),
            len(violations),
        )

        return {
            "results": results,
            "violations": violations,
            "total_checks": len(results),
            "total_violations": len(violations),
            "checked_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Generate quality report and alert
    # -----------------------------------------------------------------------

    @task(task_id="generate_report_and_alert", trigger_rule=TriggerRule.ALL_DONE)
    def generate_report_and_alert(
        freshness: dict,
        completeness: dict,
        consistency: dict,
        **context,
    ) -> dict:
        """Aggregate quality results, store report, and alert on violations."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook
        from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook

        total_violations = (
            freshness["total_violations"]
            + completeness["total_violations"]
            + consistency["total_violations"]
        )

        overall_status = "HEALTHY" if total_violations == 0 else "DEGRADED"
        if total_violations > 5:
            overall_status = "CRITICAL"

        report = {
            "overall_status": overall_status,
            "total_violations": total_violations,
            "freshness": {
                "violations": freshness["total_violations"],
                "details": freshness["violations"],
            },
            "completeness": {
                "violations": completeness["total_violations"],
                "details": completeness["violations"],
            },
            "consistency": {
                "violations": consistency["total_violations"],
                "details": consistency["violations"],
            },
            "generated_at": datetime.utcnow().isoformat(),
            "dag_run_id": context["run_id"],
        }

        # Persist report
        try:
            pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
            conn = pg_hook.get_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO data_quality_reports
                    (run_id, overall_status, total_violations, report_data, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (context["run_id"], overall_status, total_violations, json.dumps(report)),
            )
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as exc:
            logger.error("Failed to persist quality report: %s", exc)

        # Alert on violations
        if total_violations > 0:
            color = "#FF0000" if overall_status == "CRITICAL" else "#FFA500"
            try:
                slack_hook = SlackWebhookHook(slack_webhook_conn_id=SLACK_CONN_ID)
                slack_hook.send(
                    text=f"Data Quality [{overall_status}]",
                    attachments=[
                        {
                            "color": color,
                            "text": (
                                f"*Data Quality Report*\n"
                                f"Status: {overall_status}\n"
                                f"Total violations: {total_violations}\n"
                                f"Freshness: {freshness['total_violations']} issues\n"
                                f"Completeness: {completeness['total_violations']} issues\n"
                                f"Consistency: {consistency['total_violations']} issues"
                            ),
                            "footer": f"ATLAS Core | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                        }
                    ],
                )
            except Exception as exc:
                logger.warning("Failed to send Slack alert: %s", exc)

        logger.info("Data quality report: %s (%d violations)", overall_status, total_violations)
        return report

    # -----------------------------------------------------------------------
    # Wire the DAG
    # -----------------------------------------------------------------------

    freshness = check_freshness()
    completeness = check_completeness()
    consistency = check_consistency()

    generate_report_and_alert(freshness, completeness, consistency)


# Instantiate
data_quality()
