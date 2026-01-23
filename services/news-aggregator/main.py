"""
News Aggregator Service
Ingests news from multiple sources (RSS, APIs) and processes them
"""

import os
import uvicorn
import httpx
import feedparser
import redis
import json
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager

# ==================================
# Logging
# ==================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================================
# Configuration
# ==================================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
RSS_FEEDS = [
    {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "Reuters Top News", "url": "http://feeds.reuters.com/reuters/topNews"},
    {"name": "New York Times", "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"}
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

# ==================================
# Redis Connection
# ==================================
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ==================================
# Ingestion Logic
# ==================================
async def ingest_feeds():
    """Fetches articles from RSS_FEEDS, parses them, and stores them in Redis."""
    logger.info(f"Starting news ingestion from {len(RSS_FEEDS)} sources...")
    articles_ingested = 0
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for feed_info in RSS_FEEDS:
            try:
                response = await client.get(feed_info["url"], timeout=10.0)
                response.raise_for_status()
                
                feed = feedparser.parse(response.text)
                
                for entry in feed.entries:
                    article_id = entry.get("id", entry.get("link"))
                    if not article_id:
                        continue

                    # Use a pipeline to store article and set TTL
                    pipe = redis_client.pipeline()
                    
                    article = Article(
                        id=article_id,
                        title=entry.get("title", "No Title"),
                        source=feed_info["name"],
                        published_at=entry.get("published", "No Date"),
                        url=entry.get("link", "#"),
                        summary=entry.get("summary")
                    )
                    
                    redis_key = f"article:{article_id}"
                    pipe.set(redis_key, article.model_dump_json())
                    pipe.expire(redis_key, ARTICLE_TTL_SECONDS)
                    pipe.execute()
                    
                    articles_ingested += 1
                
                logger.info(f"Successfully ingested {len(feed.entries)} articles from {feed_info['name']}")

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching {feed_info['url']}: {e}")
            except Exception as e:
                logger.error(f"Error processing feed {feed_info['name']}: {e}")
    
    logger.info(f"News ingestion complete. Total articles processed: {articles_ingested}")

# ==================================
# Lifespan - Startup/Shutdown Events
# ==================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    logger.info("News Aggregator service starting up...")
    try:
        redis_client.ping()
        logger.info("Successfully connected to Redis.")
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Could not connect to Redis: {e}")
    
    await ingest_feeds() # Trigger initial ingestion
    yield
    # On shutdown
    logger.info("News Aggregator service shutting down...")

# ==================================
# FastAPI App
# ==================================
app = FastAPI(
    title="ATLAS News Aggregator Service",
    description="OSINT news aggregation and processing",
    version="1.1.0",
    lifespan=lifespan
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
    try:
        redis_client.ping()
        return {"status": "healthy", "service": "news-aggregator", "redis": "connected"}
    except redis.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Redis not connected")

@app.post("/api/v1/news/ingest")
async def trigger_ingestion_endpoint():
    """Manually triggers the news ingestion process."""
    await ingest_feeds()
    return {"message": "News ingestion process completed."}

@app.get("/api/v1/news/articles", response_model=List[Article])
async def get_articles(limit: int = 50, offset: int = 0):
    """Retrieves aggregated news articles from the cache."""
    try:
        article_keys = redis_client.keys("article:*")
        if not article_keys:
            return []

        # Simple pagination (can be improved with SORT)
        paginated_keys = article_keys[offset : offset + limit]

        pipe = redis_client.pipeline()
        for key in paginated_keys:
            pipe.get(key)
        
        articles_json = pipe.execute()
        
        articles = [Article.model_validate_json(art) for art in articles_json if art]
        
        return articles
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Redis connection error in get_articles: {e}")
        raise HTTPException(status_code=503, detail="Could not connect to data store.")
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_articles: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8083"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
