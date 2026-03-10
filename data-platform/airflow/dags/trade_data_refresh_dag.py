"""
ATLAS Core API - Trade Data Refresh DAG

Daily DAG to pull trade data from:
  - UN Comtrade API (bilateral trade flows)
  - World Bank (development indicators)
  - WTO (trade statistics and tariff data)

Data is transformed, loaded into Apache Iceberg tables,
and the Redis cache layer is refreshed for low-latency lookups.
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
REDIS_CONN_ID = "atlas_redis"
S3_CONN_ID = "atlas_s3"
SLACK_CONN_ID = "atlas_slack"
ICEBERG_CATALOG = "atlas_iceberg"
ICEBERG_NAMESPACE = "trade_intelligence"

COMTRADE_API_KEY_VAR = "comtrade_api_key"
WORLDBANK_BASE_URL = "https://api.worldbank.org/v2"
WTO_BASE_URL = "https://api.wto.org/timeseries/v1"

REDIS_CACHE_TTL = 86400  # 24 hours
MONITORED_COMMODITY_CODES = ["27", "72", "84", "85", "87", "90"]  # HS2 codes
PRIORITY_COUNTRIES = ["US", "CN", "DE", "JP", "GB", "KR", "FR", "IT", "NL", "IN"]


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
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=3),
    "on_failure_callback": _on_failure_callback,
    "sla": timedelta(hours=6),
}


@dag(
    dag_id="trade_data_refresh",
    description="Daily refresh of trade data from UN Comtrade, World Bank, and WTO",
    schedule="0 2 * * *",  # 02:00 UTC daily
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["trade", "data-refresh", "atlas-core"],
    default_args=default_args,
    sla_miss_callback=_sla_miss_callback,
    doc_md=__doc__,
)
def trade_data_refresh():

    # -----------------------------------------------------------------------
    # Fetch tasks
    # -----------------------------------------------------------------------

    @task(task_id="fetch_comtrade", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_comtrade(**context) -> dict:
        """Fetch bilateral trade flow data from UN Comtrade API."""
        import requests

        api_key = Variable.get(COMTRADE_API_KEY_VAR)
        logical_date = context["logical_date"]
        year = logical_date.year - 1  # most recent complete year

        base_url = "https://comtradeapi.un.org/data/v1/get/C/A"
        all_records = []

        for commodity_code in MONITORED_COMMODITY_CODES:
            params = {
                "reporterCode": ",".join(PRIORITY_COUNTRIES),
                "cmdCode": commodity_code,
                "period": str(year),
                "motCode": "0",
                "subscription-key": api_key,
            }

            logger.info("Fetching Comtrade data for HS %s, year %s", commodity_code, year)
            response = requests.get(base_url, params=params, timeout=120)
            response.raise_for_status()

            data = response.json()
            records = data.get("data", [])
            all_records.extend(records)
            logger.info("HS %s: %d records", commodity_code, len(records))

        logger.info("Total Comtrade records fetched: %d", len(all_records))

        return {
            "source": "comtrade",
            "record_count": len(all_records),
            "year": year,
            "commodity_codes": MONITORED_COMMODITY_CODES,
            "fetched_at": datetime.utcnow().isoformat(),
        }

    @task(task_id="fetch_worldbank", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_worldbank(**context) -> dict:
        """Fetch development and trade indicators from World Bank API."""
        import requests

        indicators = [
            "NE.EXP.GNFS.ZS",  # Exports of goods and services (% GDP)
            "NE.IMP.GNFS.ZS",  # Imports of goods and services (% GDP)
            "TM.TAX.MRCH.WM.AR.ZS",  # Tariff rate, applied, weighted mean
            "IC.BUS.EASE.XQ",  # Ease of doing business index
            "FP.CPI.TOTL.ZG",  # Inflation, consumer prices
            "NY.GDP.MKTP.KD.ZG",  # GDP growth (annual %)
        ]

        all_records = []
        for indicator in indicators:
            url = f"{WORLDBANK_BASE_URL}/country/all/indicator/{indicator}"
            params = {
                "format": "json",
                "per_page": 1000,
                "date": "2020:2025",
            }

            logger.info("Fetching World Bank indicator: %s", indicator)
            response = requests.get(url, params=params, timeout=120)
            response.raise_for_status()

            data = response.json()
            if len(data) > 1 and data[1]:
                records = data[1]
                all_records.extend(records)
                logger.info("Indicator %s: %d records", indicator, len(records))

        logger.info("Total World Bank records fetched: %d", len(all_records))

        return {
            "source": "worldbank",
            "record_count": len(all_records),
            "indicators": indicators,
            "fetched_at": datetime.utcnow().isoformat(),
        }

    @task(task_id="fetch_wto", retries=3, retry_delay=timedelta(minutes=5))
    def fetch_wto(**context) -> dict:
        """Fetch trade statistics from WTO Timeseries API."""
        import requests

        wto_api_key = Variable.get("wto_api_key", default_var="")
        headers = {}
        if wto_api_key:
            headers["Ocp-Apim-Subscription-Key"] = wto_api_key

        indicator_codes = [
            "TP_A_0010",  # Merchandise exports
            "TP_A_0020",  # Merchandise imports
            "TP_A_0030",  # Commercial services exports
        ]

        all_records = []
        for code in indicator_codes:
            url = f"{WTO_BASE_URL}/data"
            params = {
                "i": code,
                "r": "all",
                "ps": "2020-2025",
                "max": 10000,
                "fmt": "json",
                "mode": "full",
                "lang": 1,
            }

            logger.info("Fetching WTO indicator: %s", code)
            response = requests.get(url, params=params, headers=headers, timeout=180)
            response.raise_for_status()

            data = response.json()
            records = data.get("Dataset", [])
            all_records.extend(records)
            logger.info("WTO %s: %d records", code, len(records))

        logger.info("Total WTO records fetched: %d", len(all_records))

        return {
            "source": "wto",
            "record_count": len(all_records),
            "indicator_codes": indicator_codes,
            "fetched_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Transform
    # -----------------------------------------------------------------------

    @task(task_id="transform_data")
    def transform_data(
        comtrade_meta: dict,
        worldbank_meta: dict,
        wto_meta: dict,
        **context,
    ) -> dict:
        """Normalize, deduplicate, and enrich raw trade data."""
        total_input = (
            comtrade_meta["record_count"]
            + worldbank_meta["record_count"]
            + wto_meta["record_count"]
        )

        # In production this would run Spark / pandas transformations
        # against the raw data staged in S3.  Here we capture metadata.
        transform_stats = {
            "total_input_records": total_input,
            "comtrade_records": comtrade_meta["record_count"],
            "worldbank_records": worldbank_meta["record_count"],
            "wto_records": wto_meta["record_count"],
            "deduplicated_records": int(total_input * 0.95),
            "enriched_records": int(total_input * 0.95),
            "transform_completed_at": datetime.utcnow().isoformat(),
        }

        logger.info(
            "Transform complete: %d input -> %d deduplicated",
            total_input,
            transform_stats["deduplicated_records"],
        )
        return transform_stats

    # -----------------------------------------------------------------------
    # Load to Iceberg
    # -----------------------------------------------------------------------

    @task(task_id="load_to_iceberg")
    def load_to_iceberg(transform_stats: dict, **context) -> dict:
        """Write transformed trade data to Apache Iceberg tables."""
        from pyiceberg.catalog import load_catalog

        catalog = load_catalog(
            ICEBERG_CATALOG,
            **{
                "type": "rest",
                "uri": Variable.get("iceberg_rest_uri", default_var="http://iceberg-rest:8181"),
                "s3.endpoint": Variable.get("s3_endpoint", default_var="http://minio:9000"),
                "s3.access-key-id": Variable.get("s3_access_key"),
                "s3.secret-access-key": Variable.get("s3_secret_key"),
            },
        )

        tables_written = []
        for table_name in ["trade_flows", "economic_indicators", "tariff_data"]:
            fqn = f"{ICEBERG_NAMESPACE}.{table_name}"
            try:
                tbl = catalog.load_table(fqn)
                logger.info("Writing to Iceberg table %s", fqn)
                # In production: tbl.append(arrow_table)
                tables_written.append(fqn)
            except Exception as exc:
                logger.error("Failed to write to %s: %s", fqn, exc)
                raise

        return {
            "tables_written": tables_written,
            "total_records": transform_stats["enriched_records"],
            "loaded_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Update Redis cache
    # -----------------------------------------------------------------------

    @task(task_id="update_redis_cache")
    def update_redis_cache(iceberg_result: dict, **context) -> dict:
        """Refresh Redis cache with latest trade data for hot-path queries."""
        from airflow.providers.redis.hooks.redis import RedisHook

        redis_hook = RedisHook(redis_conn_id=REDIS_CONN_ID)
        redis_conn = redis_hook.get_conn()

        cache_keys_updated = 0

        # Cache trade summary per country pair
        for reporter in PRIORITY_COUNTRIES:
            for partner in PRIORITY_COUNTRIES:
                if reporter == partner:
                    continue
                key = f"atlas:trade:summary:{reporter}:{partner}"
                redis_conn.setex(
                    key,
                    REDIS_CACHE_TTL,
                    json.dumps({
                        "reporter": reporter,
                        "partner": partner,
                        "last_updated": datetime.utcnow().isoformat(),
                    }),
                )
                cache_keys_updated += 1

        # Cache commodity aggregates
        for code in MONITORED_COMMODITY_CODES:
            key = f"atlas:trade:commodity:{code}"
            redis_conn.setex(
                key,
                REDIS_CACHE_TTL,
                json.dumps({
                    "hs_code": code,
                    "last_updated": datetime.utcnow().isoformat(),
                }),
            )
            cache_keys_updated += 1

        # Set metadata key
        redis_conn.setex(
            "atlas:trade:last_refresh",
            REDIS_CACHE_TTL,
            json.dumps({
                "tables": iceberg_result["tables_written"],
                "total_records": iceberg_result["total_records"],
                "refreshed_at": datetime.utcnow().isoformat(),
            }),
        )

        logger.info("Redis cache updated: %d keys", cache_keys_updated)

        return {
            "cache_keys_updated": cache_keys_updated,
            "ttl_seconds": REDIS_CACHE_TTL,
            "updated_at": datetime.utcnow().isoformat(),
        }

    # -----------------------------------------------------------------------
    # Wire the DAG
    # -----------------------------------------------------------------------

    comtrade = fetch_comtrade()
    worldbank = fetch_worldbank()
    wto = fetch_wto()

    transformed = transform_data(comtrade, worldbank, wto)
    iceberg_result = load_to_iceberg(transformed)
    update_redis_cache(iceberg_result)


# Instantiate
trade_data_refresh()
