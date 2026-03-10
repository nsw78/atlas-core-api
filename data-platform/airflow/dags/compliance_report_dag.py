"""
ATLAS Core API - Compliance Report DAG

Daily DAG to generate regulatory compliance reports:
  - Gathers audit logs from all platform services
  - Checks sanctions screening compliance metrics
  - Generates structured PDF/JSON reports
  - Stores reports in S3 for archival
  - Notifies compliance stakeholders
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
POSTGRES_CONN_ID = "atlas_postgres"
S3_CONN_ID = "atlas_s3"
SLACK_CONN_ID = "atlas_slack"
S3_REPORTS_BUCKET = "atlas-compliance-reports"
S3_REPORTS_PREFIX = "daily-reports"

COMPLIANCE_THRESHOLDS = {
    "screening_coverage_pct": 99.5,     # % of transactions screened
    "avg_screening_latency_ms": 500,    # max avg latency for screening
    "false_positive_rate_max": 0.05,    # max FP rate
    "audit_log_completeness_pct": 99.9, # % of events with audit trail
    "data_retention_days": 2555,        # 7 years for AML compliance
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
    "email": [Variable.get("alert_email", default_var="compliance@atlas-core.io")],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=2),
    "on_failure_callback": _on_failure_callback,
    "sla": timedelta(hours=4),
}


@dag(
    dag_id="compliance_report",
    description="Daily compliance report generation with audit trail and sanctions metrics",
    schedule="0 6 * * *",  # 06:00 UTC daily
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["compliance", "reporting", "audit", "atlas-core"],
    default_args=default_args,
    sla_miss_callback=_sla_miss_callback,
    doc_md=__doc__,
)
def compliance_report():

    # -----------------------------------------------------------------------
    # Gather audit logs
    # -----------------------------------------------------------------------

    @task(task_id="gather_audit_logs")
    def gather_audit_logs(**context) -> dict:
        """Collect and aggregate audit logs from the last 24 hours."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        logical_date = context["logical_date"]
        report_start = logical_date - timedelta(days=1)
        report_end = logical_date

        try:
            # Total audit events
            cursor.execute(
                """
                SELECT COUNT(*),
                       COUNT(DISTINCT user_id),
                       COUNT(DISTINCT service_name),
                       COUNT(DISTINCT action_type)
                FROM audit_events
                WHERE created_at >= %s AND created_at < %s
                """,
                (report_start, report_end),
            )
            row = cursor.fetchone()
            total_events = row[0]
            unique_users = row[1]
            unique_services = row[2]
            unique_actions = row[3]

            # Events by service
            cursor.execute(
                """
                SELECT service_name, COUNT(*) as cnt
                FROM audit_events
                WHERE created_at >= %s AND created_at < %s
                GROUP BY service_name
                ORDER BY cnt DESC
                """,
                (report_start, report_end),
            )
            by_service = {row[0]: row[1] for row in cursor.fetchall()}

            # Events by action type
            cursor.execute(
                """
                SELECT action_type, COUNT(*) as cnt
                FROM audit_events
                WHERE created_at >= %s AND created_at < %s
                GROUP BY action_type
                ORDER BY cnt DESC
                """,
                (report_start, report_end),
            )
            by_action = {row[0]: row[1] for row in cursor.fetchall()}

            # Failed / unauthorized attempts
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM audit_events
                WHERE created_at >= %s AND created_at < %s
                AND (status = 'FAILED' OR status = 'UNAUTHORIZED')
                """,
                (report_start, report_end),
            )
            failed_events = cursor.fetchone()[0]

            result = {
                "report_period": {
                    "start": report_start.isoformat(),
                    "end": report_end.isoformat(),
                },
                "total_events": total_events,
                "unique_users": unique_users,
                "unique_services": unique_services,
                "unique_actions": unique_actions,
                "events_by_service": by_service,
                "events_by_action": by_action,
                "failed_events": failed_events,
                "gathered_at": datetime.utcnow().isoformat(),
            }

            logger.info(
                "Audit logs gathered: %d events, %d users, %d services",
                total_events,
                unique_users,
                unique_services,
            )
            return result

        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Check sanctions compliance
    # -----------------------------------------------------------------------

    @task(task_id="check_sanctions_compliance")
    def check_sanctions_compliance(**context) -> dict:
        """Evaluate sanctions screening compliance metrics."""
        from airflow.providers.postgres.hooks.postgres import PostgresHook

        pg_hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        conn = pg_hook.get_conn()
        cursor = conn.cursor()

        logical_date = context["logical_date"]
        report_start = logical_date - timedelta(days=1)
        report_end = logical_date

        try:
            # Screening coverage
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_transactions,
                    COUNT(screening_id) AS screened_transactions,
                    AVG(screening_latency_ms) AS avg_latency_ms,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY screening_latency_ms) AS p95_latency_ms,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY screening_latency_ms) AS p99_latency_ms
                FROM transaction_screenings
                WHERE created_at >= %s AND created_at < %s
                """,
                (report_start, report_end),
            )
            row = cursor.fetchone()
            total_txns = row[0] or 0
            screened_txns = row[1] or 0
            avg_latency = float(row[2] or 0)
            p95_latency = float(row[3] or 0)
            p99_latency = float(row[4] or 0)

            coverage_pct = (screened_txns / total_txns * 100) if total_txns > 0 else 0

            # Match statistics
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_matches,
                    COUNT(CASE WHEN is_true_positive THEN 1 END) AS true_positives,
                    COUNT(CASE WHEN NOT is_true_positive AND resolution IS NOT NULL THEN 1 END) AS false_positives,
                    COUNT(CASE WHEN resolution IS NULL THEN 1 END) AS pending_review
                FROM sanctions_screening_results
                WHERE created_at >= %s AND created_at < %s
                """,
                (report_start, report_end),
            )
            match_row = cursor.fetchone()
            total_matches = match_row[0] or 0
            true_positives = match_row[1] or 0
            false_positives = match_row[2] or 0
            pending_review = match_row[3] or 0

            fp_rate = (false_positives / total_matches) if total_matches > 0 else 0

            # Compliance checks
            violations = []
            if coverage_pct < COMPLIANCE_THRESHOLDS["screening_coverage_pct"]:
                violations.append({
                    "metric": "screening_coverage",
                    "threshold": COMPLIANCE_THRESHOLDS["screening_coverage_pct"],
                    "actual": round(coverage_pct, 2),
                })
            if avg_latency > COMPLIANCE_THRESHOLDS["avg_screening_latency_ms"]:
                violations.append({
                    "metric": "avg_screening_latency",
                    "threshold": COMPLIANCE_THRESHOLDS["avg_screening_latency_ms"],
                    "actual": round(avg_latency, 2),
                })
            if fp_rate > COMPLIANCE_THRESHOLDS["false_positive_rate_max"]:
                violations.append({
                    "metric": "false_positive_rate",
                    "threshold": COMPLIANCE_THRESHOLDS["false_positive_rate_max"],
                    "actual": round(fp_rate, 4),
                })

            result = {
                "screening": {
                    "total_transactions": total_txns,
                    "screened_transactions": screened_txns,
                    "coverage_pct": round(coverage_pct, 2),
                    "avg_latency_ms": round(avg_latency, 2),
                    "p95_latency_ms": round(p95_latency, 2),
                    "p99_latency_ms": round(p99_latency, 2),
                },
                "matches": {
                    "total_matches": total_matches,
                    "true_positives": true_positives,
                    "false_positives": false_positives,
                    "pending_review": pending_review,
                    "false_positive_rate": round(fp_rate, 4),
                },
                "compliance_violations": violations,
                "compliant": len(violations) == 0,
                "checked_at": datetime.utcnow().isoformat(),
            }

            logger.info(
                "Sanctions compliance: coverage=%.2f%%, FP rate=%.4f, violations=%d",
                coverage_pct,
                fp_rate,
                len(violations),
            )
            return result

        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------------------------------------
    # Generate report
    # -----------------------------------------------------------------------

    @task(task_id="generate_report")
    def generate_report(
        audit_data: dict,
        sanctions_data: dict,
        **context,
    ) -> dict:
        """Generate the structured compliance report."""
        logical_date = context["logical_date"]
        report_date = (logical_date - timedelta(days=1)).strftime("%Y-%m-%d")

        report = {
            "report_metadata": {
                "report_id": f"compliance-{report_date}-{context['run_id'][:8]}",
                "report_date": report_date,
                "report_type": "daily_compliance",
                "generated_at": datetime.utcnow().isoformat(),
                "generated_by": "atlas-data-platform",
                "version": "1.0",
            },
            "executive_summary": {
                "overall_status": "COMPLIANT" if sanctions_data["compliant"] else "NON-COMPLIANT",
                "total_audit_events": audit_data["total_events"],
                "screening_coverage_pct": sanctions_data["screening"]["coverage_pct"],
                "active_violations": len(sanctions_data["compliance_violations"]),
                "pending_reviews": sanctions_data["matches"]["pending_review"],
            },
            "audit_trail": {
                "period": audit_data["report_period"],
                "total_events": audit_data["total_events"],
                "unique_users": audit_data["unique_users"],
                "events_by_service": audit_data["events_by_service"],
                "events_by_action": audit_data["events_by_action"],
                "failed_events": audit_data["failed_events"],
            },
            "sanctions_compliance": {
                "screening_metrics": sanctions_data["screening"],
                "match_statistics": sanctions_data["matches"],
                "compliance_violations": sanctions_data["compliance_violations"],
            },
            "regulatory_notes": {
                "applicable_regulations": [
                    "OFAC Compliance Program",
                    "EU AML Directive 6 (6AMLD)",
                    "UK Money Laundering Regulations 2017",
                    "FATF Recommendations",
                ],
                "data_retention_policy": f"{COMPLIANCE_THRESHOLDS['data_retention_days']} days",
                "next_review_date": (logical_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            },
        }

        logger.info(
            "Report generated: %s (status=%s)",
            report["report_metadata"]["report_id"],
            report["executive_summary"]["overall_status"],
        )

        return report

    # -----------------------------------------------------------------------
    # Store in S3
    # -----------------------------------------------------------------------

    @task(task_id="store_in_s3")
    def store_in_s3(report: dict, **context) -> dict:
        """Store the compliance report in S3 for archival."""
        from airflow.providers.amazon.aws.hooks.s3 import S3Hook

        s3_hook = S3Hook(aws_conn_id=S3_CONN_ID)

        report_id = report["report_metadata"]["report_id"]
        report_date = report["report_metadata"]["report_date"]

        # Store JSON report
        json_key = f"{S3_REPORTS_PREFIX}/{report_date}/{report_id}.json"
        s3_hook.load_string(
            string_data=json.dumps(report, indent=2, default=str),
            key=json_key,
            bucket_name=S3_REPORTS_BUCKET,
            replace=True,
        )

        # Store summary for quick access
        summary_key = f"{S3_REPORTS_PREFIX}/{report_date}/{report_id}-summary.json"
        s3_hook.load_string(
            string_data=json.dumps(report["executive_summary"], indent=2),
            key=summary_key,
            bucket_name=S3_REPORTS_BUCKET,
            replace=True,
        )

        logger.info("Report stored in S3: s3://%s/%s", S3_REPORTS_BUCKET, json_key)

        return {
            "s3_bucket": S3_REPORTS_BUCKET,
            "s3_json_key": json_key,
            "s3_summary_key": summary_key,
            "report_id": report_id,
            "stored_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Notify stakeholders
    # -----------------------------------------------------------------------

    @task(task_id="notify_stakeholders", trigger_rule=TriggerRule.ALL_DONE)
    def notify_stakeholders(
        report: dict,
        s3_result: dict,
        **context,
    ) -> None:
        """Send compliance report notifications to stakeholders."""
        from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook

        status = report["executive_summary"]["overall_status"]
        color = "#36A64F" if status == "COMPLIANT" else "#FF0000"

        summary = report["executive_summary"]
        screening = report["sanctions_compliance"]["screening_metrics"]

        message_text = (
            f"*Daily Compliance Report - {report['report_metadata']['report_date']}*\n\n"
            f"Status: *{status}*\n"
            f"Audit events: {summary['total_audit_events']:,}\n"
            f"Screening coverage: {screening['coverage_pct']}%\n"
            f"Avg screening latency: {screening['avg_latency_ms']}ms\n"
            f"Pending reviews: {summary['pending_reviews']}\n"
            f"Active violations: {summary['active_violations']}\n\n"
            f"Full report: s3://{s3_result['s3_bucket']}/{s3_result['s3_json_key']}"
        )

        try:
            slack_hook = SlackWebhookHook(slack_webhook_conn_id=SLACK_CONN_ID)
            slack_hook.send(
                text=f"Compliance Report [{status}]",
                attachments=[
                    {
                        "color": color,
                        "text": message_text,
                        "footer": f"ATLAS Core | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                    }
                ],
            )
        except Exception as exc:
            logger.warning("Failed to send Slack notification: %s", exc)

        # Log notification
        logger.info(
            "Stakeholders notified: report=%s, status=%s",
            report["report_metadata"]["report_id"],
            status,
        )

    # -----------------------------------------------------------------------
    # Wire the DAG
    # -----------------------------------------------------------------------

    audit = gather_audit_logs()
    sanctions = check_sanctions_compliance()

    report = generate_report(audit, sanctions)
    s3 = store_in_s3(report)
    notify_stakeholders(report, s3)


# Instantiate
compliance_report()
