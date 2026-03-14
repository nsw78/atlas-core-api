"""
Audit Logging Kafka Consumer
Central event sink that consumes all atlas.* topics and writes events to the audit_logs table.
Runs as a standalone async process alongside the Go audit-logging service.
"""

import os
import json
import re
import logging
import asyncio
import uuid
from datetime import datetime

import asyncpg
from aiokafka import AIOKafkaConsumer

# ==================================
# Logging
# ==================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("audit-kafka-consumer")

# ==================================
# Configuration
# ==================================
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9093")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://atlas:atlas_dev@localhost:5437/atlas")
db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)

CONSUMER_GROUP = os.getenv("KAFKA_CONSUMER_GROUP", "atlas-audit-logging")

# All atlas.* topics to consume
ATLAS_TOPICS = [
    "atlas.simulations.completed",
    "atlas.news.ingested",
    "atlas.osint.signal",
    "atlas.compliance.scan_completed",
    "atlas.wargaming.move_submitted",
]

# ==================================
# Database pool
# ==================================
pool = None


async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    return pool


# ==================================
# Topic-to-event-type mapping
# ==================================
TOPIC_EVENT_TYPE_MAP = {
    "atlas.simulations.completed": "system_event",
    "atlas.news.ingested": "system_event",
    "atlas.osint.signal": "system_event",
    "atlas.compliance.scan_completed": "system_event",
    "atlas.wargaming.move_submitted": "user_action",
}

TOPIC_RESOURCE_MAP = {
    "atlas.simulations.completed": "simulation",
    "atlas.news.ingested": "news_article",
    "atlas.osint.signal": "osint_signal",
    "atlas.compliance.scan_completed": "compliance_scan",
    "atlas.wargaming.move_submitted": "wargaming_move",
}


def derive_action(topic: str) -> str:
    """Derive an action name from the topic."""
    # atlas.simulations.completed -> simulations.completed
    parts = topic.split(".", 1)
    return parts[1] if len(parts) > 1 else topic


def extract_resource_id(topic: str, payload: dict) -> str:
    """Extract the primary resource ID from the event payload based on topic."""
    id_keys = {
        "atlas.simulations.completed": "simulation_id",
        "atlas.news.ingested": None,
        "atlas.osint.signal": "signal_id",
        "atlas.compliance.scan_completed": "scan_id",
        "atlas.wargaming.move_submitted": "move_id",
    }
    key = id_keys.get(topic)
    if key and key in payload:
        return str(payload[key])
    return ""


# ==================================
# Persist audit log to DB
# ==================================
async def persist_audit_log(topic: str, payload: dict):
    """Insert a consumed Kafka event into the audit_logs table."""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            event_type = TOPIC_EVENT_TYPE_MAP.get(topic, "system_event")
            resource = TOPIC_RESOURCE_MAP.get(topic, "unknown")
            action = derive_action(topic)
            resource_id = extract_resource_id(topic, payload)
            event_timestamp = payload.get("timestamp", datetime.utcnow().isoformat())

            await conn.execute(
                """
                INSERT INTO audit_logs
                    (id, event_type, user_id, action, resource, resource_id, ip_address, user_agent, metadata, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                uuid.uuid4(),
                event_type,
                "system",  # Kafka events are system-originated
                action,
                resource,
                resource_id,
                "kafka-consumer",
                f"audit-kafka-consumer/{CONSUMER_GROUP}",
                json.dumps(payload),
                datetime.fromisoformat(event_timestamp) if event_timestamp else datetime.utcnow(),
            )
            logger.info(f"Persisted audit log for topic={topic} resource_id={resource_id}")
    except Exception as e:
        logger.error(f"Failed to persist audit log for topic={topic}: {e}")


# ==================================
# Consumer loop
# ==================================
async def consume():
    """Main consumer loop: subscribe to all atlas.* topics and persist events."""
    logger.info(f"Starting Kafka consumer group={CONSUMER_GROUP} topics={ATLAS_TOPICS}")
    logger.info(f"Kafka brokers: {KAFKA_BROKERS}")

    consumer = AIOKafkaConsumer(
        *ATLAS_TOPICS,
        bootstrap_servers=KAFKA_BROKERS,
        group_id=CONSUMER_GROUP,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )

    # Initialize DB pool before starting consumer
    try:
        await get_pool()
        logger.info("Database connection pool established.")
    except Exception as e:
        logger.error(f"Could not connect to PostgreSQL: {e}")
        return

    retry_delay = 5
    max_retry_delay = 60

    while True:
        try:
            await consumer.start()
            logger.info("Kafka consumer started. Listening for events...")
            retry_delay = 5  # Reset on successful connection

            async for message in consumer:
                topic = message.topic
                payload = message.value
                logger.info(
                    f"Received event: topic={topic} partition={message.partition} "
                    f"offset={message.offset} payload_keys={list(payload.keys()) if isinstance(payload, dict) else 'N/A'}"
                )

                if isinstance(payload, dict):
                    await persist_audit_log(topic, payload)
                else:
                    logger.warning(f"Skipping non-dict message on topic={topic}: {payload}")

        except Exception as e:
            logger.error(f"Kafka consumer error: {e}")
            logger.info(f"Retrying in {retry_delay}s...")
            try:
                await consumer.stop()
            except Exception:
                pass
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, max_retry_delay)
        finally:
            try:
                await consumer.stop()
            except Exception:
                pass


# ==================================
# Graceful shutdown
# ==================================
async def shutdown():
    global pool
    if pool:
        await pool.close()
        pool = None
        logger.info("Database connection pool closed.")


# ==================================
# Entry point
# ==================================
def main():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(consume())
    except KeyboardInterrupt:
        logger.info("Shutting down audit Kafka consumer...")
    finally:
        loop.run_until_complete(shutdown())
        loop.close()


if __name__ == "__main__":
    main()
