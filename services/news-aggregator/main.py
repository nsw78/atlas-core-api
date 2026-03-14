"""
News Aggregator Service
Ingests news from multiple sources (RSS, APIs) and processes them
Persists to PostgreSQL with Redis caching
"""

import os
import json
import uvicorn
import httpx
import feedparser
import redis
import logging
import uuid as uuid_mod
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import asyncpg
from aiokafka import AIOKafkaProducer

# ==================================
# Logging
# ==================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================================
# Configuration
# ==================================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://atlas:atlas_dev@localhost:5437/atlas")
db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)

RSS_FEEDS = [
    {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "source_type": "rss", "language": "en"},
    {"name": "Reuters Top News", "url": "http://feeds.reuters.com/reuters/topNews", "source_type": "rss", "language": "en"},
    {"name": "New York Times", "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "source_type": "rss", "language": "en"},
]
ARTICLE_TTL_SECONDS = 3600  # 1 hour

# ==================================
# Models
# ==================================
class Article(BaseModel):
    id: str
    title: str
    source: str
    published_at: str
    url: str
    summary: Optional[str] = None


class ArticleDB(BaseModel):
    id: str
    title: str
    source_name: Optional[str] = None
    published_at: Optional[str] = None
    url: Optional[str] = None
    summary: Optional[str] = None
    language: Optional[str] = None
    sentiment_score: Optional[float] = None
    is_processed: bool = False
    created_at: Optional[str] = None


class OsintSignalCreate(BaseModel):
    signal_type: str
    source: str
    title: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    severity: str = "informational"
    confidence: Optional[float] = None
    regions: Optional[List[str]] = None
    entities: Optional[List[str]] = None


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
# Kafka Producer Configuration
# ==================================
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9093")

kafka_producer = None


async def get_kafka_producer():
    global kafka_producer
    if kafka_producer is None:
        kafka_producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await kafka_producer.start()
    return kafka_producer


async def publish_event(topic: str, event: dict):
    try:
        producer = await get_kafka_producer()
        await producer.send_and_wait(topic, event)
        logger.info(f"Published event to {topic}: {event}")
    except Exception as e:
        logger.warning(f"Failed to publish event to {topic}: {e}")
        # Non-blocking: don't fail the request if Kafka is down


# ==================================
# Redis Connection
# ==================================
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ==================================
# DB helper: ensure a news source exists and return its id
# ==================================
async def ensure_news_source(conn, name: str, source_type: str = "rss", url: str = None, language: str = "en"):
    """Upsert a news source and return its UUID."""
    row = await conn.fetchrow(
        "SELECT id FROM news_sources WHERE name = $1",
        name,
    )
    if row:
        return row["id"]
    row = await conn.fetchrow(
        """
        INSERT INTO news_sources (name, source_type, url, language, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
        """,
        name,
        source_type,
        url,
        language,
    )
    return row["id"]


# ==================================
# Ingestion Logic
# ==================================
async def ingest_feeds():
    """Fetches articles from RSS_FEEDS, parses them, stores in Redis cache AND PostgreSQL."""
    logger.info(f"Starting news ingestion from {len(RSS_FEEDS)} sources...")
    articles_ingested = 0

    try:
        p = await get_pool()
    except Exception as e:
        logger.error(f"Could not get DB pool during ingestion: {e}")
        p = None

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for feed_info in RSS_FEEDS:
            try:
                response = await client.get(feed_info["url"], timeout=10.0)
                response.raise_for_status()
                feed = feedparser.parse(response.text)

                # Ensure source exists in DB
                source_id = None
                if p:
                    try:
                        async with p.acquire() as conn:
                            source_id = await ensure_news_source(
                                conn,
                                feed_info["name"],
                                feed_info.get("source_type", "rss"),
                                feed_info["url"],
                                feed_info.get("language", "en"),
                            )
                    except Exception as db_err:
                        logger.error(f"DB error ensuring source {feed_info['name']}: {db_err}")

                for entry in feed.entries:
                    article_id = entry.get("id", entry.get("link"))
                    if not article_id:
                        continue

                    article = Article(
                        id=article_id,
                        title=entry.get("title", "No Title"),
                        source=feed_info["name"],
                        published_at=entry.get("published", "No Date"),
                        url=entry.get("link", "#"),
                        summary=entry.get("summary"),
                    )

                    # Cache in Redis
                    try:
                        pipe = redis_client.pipeline()
                        redis_key = f"article:{article_id}"
                        pipe.set(redis_key, article.model_dump_json())
                        pipe.expire(redis_key, ARTICLE_TTL_SECONDS)
                        pipe.execute()
                    except Exception as redis_err:
                        logger.warning(f"Redis cache write failed: {redis_err}")

                    # Persist to PostgreSQL
                    if p and source_id:
                        try:
                            async with p.acquire() as conn:
                                published_at_ts = None
                                try:
                                    from email.utils import parsedate_to_datetime
                                    published_at_ts = parsedate_to_datetime(entry.get("published", ""))
                                except Exception:
                                    published_at_ts = datetime.utcnow()

                                await conn.execute(
                                    """
                                    INSERT INTO news_articles
                                        (source_id, external_id, title, summary, url, language, published_at)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (source_id, external_id) DO UPDATE
                                        SET title = EXCLUDED.title,
                                            summary = EXCLUDED.summary,
                                            updated_at = CURRENT_TIMESTAMP
                                    """,
                                    source_id,
                                    article_id,
                                    article.title,
                                    article.summary,
                                    article.url,
                                    feed_info.get("language", "en"),
                                    published_at_ts,
                                )
                        except Exception as db_err:
                            logger.error(f"DB error saving article '{article.title[:50]}': {db_err}")

                    articles_ingested += 1

                logger.info(f"Successfully ingested {len(feed.entries)} articles from {feed_info['name']}")

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching {feed_info['url']}: {e}")
            except Exception as e:
                logger.error(f"Error processing feed {feed_info['name']}: {e}")

    logger.info(f"News ingestion complete. Total articles processed: {articles_ingested}")

    # Publish news ingested event to Kafka
    if articles_ingested > 0:
        await publish_event("atlas.news.ingested", {
            "article_count": articles_ingested,
            "source": "rss_feeds",
            "timestamp": datetime.utcnow().isoformat(),
        })


# ==================================
# Lifespan - Startup/Shutdown Events
# ==================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    logger.info("News Aggregator service starting up...")

    # Redis check
    try:
        redis_client.ping()
        logger.info("Successfully connected to Redis.")
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Could not connect to Redis: {e}")

    # PostgreSQL check
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        logger.info("Successfully connected to PostgreSQL.")
    except Exception as e:
        logger.error(f"Could not connect to PostgreSQL: {e}")

    # Start Kafka producer
    try:
        await get_kafka_producer()
        logger.info("Kafka producer started.")
    except Exception as e:
        logger.warning(f"Could not start Kafka producer: {e}")

    await ingest_feeds()
    yield
    # On shutdown
    logger.info("News Aggregator service shutting down...")
    global kafka_producer
    if kafka_producer:
        await kafka_producer.stop()
        kafka_producer = None
        logger.info("Kafka producer stopped.")
    if pool:
        await pool.close()


# ==================================
# FastAPI App
# ==================================
app = FastAPI(
    title="ATLAS News Aggregator Service",
    description="OSINT news aggregation and processing with PostgreSQL persistence",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================
# API Routes
# ==================================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    status = {"status": "healthy", "service": "news-aggregator"}
    try:
        redis_client.ping()
        status["redis"] = "connected"
    except redis.exceptions.ConnectionError:
        status["redis"] = "disconnected"
        status["status"] = "degraded"

    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"
        status["status"] = "degraded"

    if status["status"] != "healthy":
        raise HTTPException(status_code=503, detail=status)
    return status


@app.post("/api/v1/news/ingest")
async def trigger_ingestion_endpoint():
    """Manually triggers the news ingestion process."""
    await ingest_feeds()
    return {"message": "News ingestion process completed."}


@app.get("/api/v1/news/articles")
async def get_articles(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    source: Optional[str] = None,
    language: Optional[str] = None,
):
    """Retrieves news articles from PostgreSQL with Redis cache fallback."""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Build query with optional filters
            conditions = []
            params = []
            param_idx = 1

            if source:
                conditions.append(f"ns.name = ${param_idx}")
                params.append(source)
                param_idx += 1
            if language:
                conditions.append(f"na.language = ${param_idx}")
                params.append(language)
                param_idx += 1

            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

            query = f"""
                SELECT
                    na.id, na.title, na.summary, na.url, na.language,
                    na.published_at, na.sentiment_score, na.is_processed,
                    na.created_at, ns.name AS source_name
                FROM news_articles na
                LEFT JOIN news_sources ns ON na.source_id = ns.id
                {where_clause}
                ORDER BY na.published_at DESC NULLS LAST
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])

            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM news_articles na LEFT JOIN news_sources ns ON na.source_id = ns.id {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        articles = [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "source": r["source_name"] or "unknown",
                "published_at": r["published_at"].isoformat() if r["published_at"] else None,
                "url": r["url"],
                "summary": r["summary"],
                "language": r["language"],
                "sentiment_score": float(r["sentiment_score"]) if r["sentiment_score"] is not None else None,
                "is_processed": r["is_processed"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
        return {"articles": articles, "total": total, "limit": limit, "offset": offset}

    except Exception as e:
        logger.error(f"DB error in get_articles, falling back to Redis: {e}")

        # Fallback to Redis cache
        try:
            article_keys = redis_client.keys("article:*")
            if not article_keys:
                return {"articles": [], "total": 0, "limit": limit, "offset": offset}

            paginated_keys = article_keys[offset: offset + limit]
            pipe = redis_client.pipeline()
            for key in paginated_keys:
                pipe.get(key)
            articles_json = pipe.execute()
            articles = [json.loads(art) for art in articles_json if art]
            return {"articles": articles, "total": len(article_keys), "limit": limit, "offset": offset}
        except Exception as redis_err:
            logger.error(f"Redis fallback also failed: {redis_err}")
            raise HTTPException(status_code=503, detail="Could not retrieve articles from any data store.")


@app.get("/api/v1/news/articles/{article_id}")
async def get_article(article_id: str):
    """Get a single article by id"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT na.*, ns.name AS source_name
                FROM news_articles na
                LEFT JOIN news_sources ns ON na.source_id = ns.id
                WHERE na.id = $1
                """,
                uuid_mod.UUID(article_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Article not found")

            return {
                "id": str(row["id"]),
                "title": row["title"],
                "source": row["source_name"],
                "summary": row["summary"],
                "content": row["content"],
                "url": row["url"],
                "language": row["language"],
                "published_at": row["published_at"].isoformat() if row["published_at"] else None,
                "sentiment_score": float(row["sentiment_score"]) if row["sentiment_score"] is not None else None,
                "is_processed": row["is_processed"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting article: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================
# News Sources CRUD
# ==================================
@app.get("/api/v1/news/sources")
async def list_sources(active_only: bool = True):
    """List configured news sources from DB"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            if active_only:
                rows = await conn.fetch(
                    "SELECT * FROM news_sources WHERE is_active = true ORDER BY name"
                )
            else:
                rows = await conn.fetch("SELECT * FROM news_sources ORDER BY name")

        return {
            "sources": [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "source_type": r["source_type"],
                    "url": r["url"],
                    "language": r["language"],
                    "is_active": r["is_active"],
                    "article_count": r["article_count"],
                    "last_fetched_at": r["last_fetched_at"].isoformat() if r["last_fetched_at"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ]
        }
    except Exception as e:
        logger.error(f"Error listing sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================
# OSINT Signals
# ==================================
@app.post("/api/v1/news/osint-signals")
async def create_osint_signal(signal: OsintSignalCreate):
    """Create a new OSINT signal"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO osint_signals
                    (signal_type, source, title, content, url, severity, confidence, regions, entities)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, created_at
                """,
                signal.signal_type,
                signal.source,
                signal.title,
                signal.content,
                signal.url,
                signal.severity,
                signal.confidence,
                signal.regions or [],
                signal.entities or [],
            )
        # Publish OSINT signal event to Kafka
        await publish_event("atlas.osint.signal", {
            "signal_id": str(row["id"]),
            "severity": signal.severity,
            "signal_type": signal.signal_type,
            "title": signal.title,
            "timestamp": row["created_at"].isoformat(),
        })

        return {
            "id": str(row["id"]),
            "signal_type": signal.signal_type,
            "source": signal.source,
            "title": signal.title,
            "severity": signal.severity,
            "created_at": row["created_at"].isoformat(),
        }
    except Exception as e:
        logger.error(f"Error creating OSINT signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/news/osint-signals")
async def list_osint_signals(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    severity: Optional[str] = None,
    signal_type: Optional[str] = None,
):
    """List OSINT signals with optional filters"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            param_idx = 1

            if severity:
                conditions.append(f"severity = ${param_idx}")
                params.append(severity)
                param_idx += 1
            if signal_type:
                conditions.append(f"signal_type = ${param_idx}")
                params.append(signal_type)
                param_idx += 1

            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

            query = f"""
                SELECT id, signal_type, source, title, content, url, severity,
                       confidence, regions, entities, is_verified, detected_at, created_at
                FROM osint_signals
                {where_clause}
                ORDER BY detected_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            params.extend([limit, offset])

            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM osint_signals {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "signals": [
                {
                    "id": str(r["id"]),
                    "signal_type": r["signal_type"],
                    "source": r["source"],
                    "title": r["title"],
                    "content": r["content"],
                    "url": r["url"],
                    "severity": r["severity"],
                    "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
                    "regions": r["regions"],
                    "entities": r["entities"],
                    "is_verified": r["is_verified"],
                    "detected_at": r["detected_at"].isoformat() if r["detected_at"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing OSINT signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/news/osint-signals/{signal_id}")
async def get_osint_signal(signal_id: str):
    """Get a single OSINT signal"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM osint_signals WHERE id = $1",
                uuid_mod.UUID(signal_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="OSINT signal not found")

            return {
                "id": str(row["id"]),
                "signal_type": row["signal_type"],
                "source": row["source"],
                "title": row["title"],
                "content": row["content"],
                "url": row["url"],
                "severity": row["severity"],
                "confidence": float(row["confidence"]) if row["confidence"] is not None else None,
                "regions": row["regions"],
                "entities": row["entities"],
                "is_verified": row["is_verified"],
                "detected_at": row["detected_at"].isoformat() if row["detected_at"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OSINT signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8083"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
