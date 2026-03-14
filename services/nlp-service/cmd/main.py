"""
NLP Service
Provides NLP capabilities: NER, Sentiment Analysis, Document Classification, Summarization
Persists analyses and extracted entities to PostgreSQL
"""

import os
import json
import logging
import time
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncpg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================================
# Database Configuration
# ==================================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://atlas:atlas_dev@localhost:5437/atlas")
db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)

pool = None


async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    return pool


# ==================================
# NLP Models (lazy loading)
# ==================================
nlp_model = None
sentiment_pipeline = None
classifier_pipeline = None


def load_models():
    """Load NLP models on startup"""
    global nlp_model, sentiment_pipeline, classifier_pipeline
    try:
        import spacy
        nlp_model = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded")
    except Exception as e:
        logger.warning(f"Failed to load spaCy model: {e}. Using fallback.")

    try:
        from transformers import pipeline as hf_pipeline
        sentiment_pipeline = hf_pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=-1,
        )
        logger.info("Sentiment model loaded")
    except Exception as e:
        logger.warning(f"Failed to load sentiment model: {e}. Using fallback.")

    try:
        from transformers import pipeline as hf_pipeline
        classifier_pipeline = hf_pipeline(
            "text-classification",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1,
        )
        logger.info("Classification model loaded")
    except Exception as e:
        logger.warning(f"Failed to load classification model: {e}. Using fallback.")


# ==================================
# Lifespan
# ==================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NLP Service starting up...")
    load_models()
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        logger.info("Database connection pool established.")
    except Exception as e:
        logger.error(f"Could not connect to PostgreSQL: {e}")
    yield
    logger.info("NLP Service shutting down...")
    if pool:
        await pool.close()


# ==================================
# FastAPI App
# ==================================
app = FastAPI(
    title="ATLAS NLP Service",
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
# Models
# ==================================
class TextInput(BaseModel):
    text: str
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None


class NERRequest(BaseModel):
    text: str
    entity_types: Optional[List[str]] = None
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None


class SentimentRequest(BaseModel):
    text: str
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None


class ClassificationRequest(BaseModel):
    text: str
    categories: Optional[List[str]] = None
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None


class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    source_type: Optional[str] = "manual"
    source_id: Optional[str] = None


# ==================================
# Helper: Map spaCy labels to DB entity types
# ==================================
SPACY_LABEL_MAP = {
    "PERSON": "person",
    "ORG": "organization",
    "GPE": "location",
    "LOC": "location",
    "DATE": "date",
    "MONEY": "money",
    "EVENT": "event",
    "PRODUCT": "product",
    "FAC": "location",
    "NORP": "organization",
    "LAW": "regulation",
    "WORK_OF_ART": "custom",
    "LANGUAGE": "custom",
    "CARDINAL": "custom",
    "ORDINAL": "custom",
    "QUANTITY": "custom",
    "PERCENT": "custom",
    "TIME": "date",
}


def map_entity_type(spacy_label: str) -> str:
    return SPACY_LABEL_MAP.get(spacy_label, "custom")


# ==================================
# Helper: save analysis + entities to DB
# ==================================
async def save_analysis(
    analysis_type: str,
    source_type: str,
    source_id: str,
    model_name: str,
    input_text: str,
    output: dict,
    processing_time_ms: int,
    entities: list = None,
):
    """Save an NLP analysis and its entities to the database."""
    try:
        p = await get_pool()
        source_uuid = uuid.UUID(source_id) if source_id else uuid.uuid4()

        async with p.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO nlp_analyses
                        (source_type, source_id, analysis_type, model_name, status,
                         input_text, output, processing_time_ms, completed_at)
                    VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    source_type,
                    source_uuid,
                    analysis_type,
                    model_name,
                    input_text[:5000],  # Limit stored input size
                    json.dumps(output),
                    processing_time_ms,
                )
                analysis_id = row["id"]

                # Save entities if provided
                if entities:
                    for ent in entities:
                        await conn.execute(
                            """
                            INSERT INTO nlp_entities
                                (analysis_id, entity_type, entity_text, normalized_text,
                                 start_offset, end_offset, confidence)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            """,
                            analysis_id,
                            ent["entity_type"],
                            ent["text"],
                            ent["text"].lower(),
                            ent.get("start"),
                            ent.get("end"),
                            ent.get("confidence"),
                        )

        return str(analysis_id)
    except Exception as e:
        logger.error(f"Failed to save analysis to DB: {e}")
        return None


# ==================================
# Helper: save sentiment result to DB
# ==================================
async def save_sentiment_result(analysis_id_str: str, sentiment: str, score: float, magnitude: float = None):
    """Save sentiment result to the nlp_sentiment_results table."""
    if not analysis_id_str:
        return
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO nlp_sentiment_results
                    (analysis_id, scope, sentiment, score, magnitude)
                VALUES ($1, 'document', $2, $3, $4)
                """,
                uuid.UUID(analysis_id_str),
                sentiment,
                round(score, 4),
                round(magnitude, 4) if magnitude is not None else None,
            )
    except Exception as e:
        logger.error(f"Failed to save sentiment result to DB: {e}")


# ==================================
# API Routes
# ==================================
@app.get("/health")
async def health_check():
    status = {
        "status": "healthy",
        "service": "nlp-service",
        "models_loaded": nlp_model is not None,
    }
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"
        status["status"] = "degraded"
    return status


@app.post("/api/v1/nlp/ner")
async def extract_entities(request: NERRequest):
    """Extract named entities from text and persist to DB"""
    try:
        if nlp_model is None:
            load_models()
        if nlp_model is None:
            raise HTTPException(status_code=503, detail="NLP model not available")

        start = time.time()
        doc = nlp_model(request.text)
        processing_ms = int((time.time() - start) * 1000)

        entities = []
        for ent in doc.ents:
            entity_type = map_entity_type(ent.label_)
            entity = {
                "text": ent.text,
                "label": ent.label_,
                "entity_type": entity_type,
                "start": ent.start_char,
                "end": ent.end_char,
                "confidence": 0.85,
            }
            if request.entity_types and entity_type not in request.entity_types:
                continue
            entities.append(entity)

        output = {"entities": entities, "count": len(entities)}

        # Persist to DB
        analysis_id = await save_analysis(
            analysis_type="ner",
            source_type=request.source_type or "manual",
            source_id=request.source_id,
            model_name="spacy/en_core_web_sm",
            input_text=request.text,
            output=output,
            processing_time_ms=processing_ms,
            entities=entities,
        )

        output["analysis_id"] = analysis_id
        return output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NER failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/nlp/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of text and persist to DB"""
    try:
        if sentiment_pipeline is None:
            load_models()
        if sentiment_pipeline is None:
            raise HTTPException(status_code=503, detail="Sentiment model not available")

        start = time.time()
        result = sentiment_pipeline(request.text)[0]
        processing_ms = int((time.time() - start) * 1000)

        label = result["label"].lower()
        score = result["score"]

        sentiment_score = 0.0
        if "positive" in label:
            sentiment_score = score
        elif "negative" in label:
            sentiment_score = -score
        elif "neutral" in label:
            sentiment_score = 0.0

        output = {
            "sentiment": label,
            "score": sentiment_score,
            "confidence": score,
        }

        # Persist to DB
        analysis_id = await save_analysis(
            analysis_type="sentiment",
            source_type=request.source_type or "manual",
            source_id=request.source_id,
            model_name="cardiffnlp/twitter-roberta-base-sentiment-latest",
            input_text=request.text,
            output=output,
            processing_time_ms=processing_ms,
        )

        # Also save to the dedicated sentiment results table
        db_sentiment = "positive" if sentiment_score > 0.1 else ("negative" if sentiment_score < -0.1 else "neutral")
        await save_sentiment_result(analysis_id, db_sentiment, sentiment_score, score)

        output["analysis_id"] = analysis_id
        return output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/nlp/classify")
async def classify_document(request: ClassificationRequest):
    """Classify document into categories and persist to DB"""
    try:
        if classifier_pipeline is None:
            load_models()
        if classifier_pipeline is None:
            raise HTTPException(status_code=503, detail="Classification model not available")

        start = time.time()
        result = classifier_pipeline(request.text)[0]
        processing_ms = int((time.time() - start) * 1000)

        output = {
            "category": result["label"],
            "confidence": result["score"],
        }

        analysis_id = await save_analysis(
            analysis_type="classification",
            source_type=request.source_type or "manual",
            source_id=request.source_id,
            model_name="distilbert-base-uncased-finetuned-sst-2-english",
            input_text=request.text,
            output=output,
            processing_time_ms=processing_ms,
        )

        output["analysis_id"] = analysis_id
        return output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/nlp/summarize")
async def summarize_text(request: SummarizationRequest):
    """Generate summary of text and persist to DB"""
    try:
        start = time.time()
        sentences = request.text.split(".")
        summary = ". ".join(sentences[:3]) + "."
        processing_ms = int((time.time() - start) * 1000)

        output = {
            "summary": summary,
            "original_length": len(request.text),
            "summary_length": len(summary),
            "compression_ratio": len(summary) / len(request.text) if len(request.text) > 0 else 0,
        }

        analysis_id = await save_analysis(
            analysis_type="summarization",
            source_type=request.source_type or "manual",
            source_id=request.source_id,
            model_name="extractive_baseline",
            input_text=request.text,
            output=output,
            processing_time_ms=processing_ms,
        )

        output["analysis_id"] = analysis_id
        return output
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/nlp/process")
async def process_text(request: TextInput):
    """Process text with all NLP capabilities and persist each analysis"""
    try:
        results = {}

        # NER
        if nlp_model:
            start = time.time()
            doc = nlp_model(request.text)
            ner_ms = int((time.time() - start) * 1000)
            entities = [
                {
                    "text": ent.text,
                    "label": ent.label_,
                    "entity_type": map_entity_type(ent.label_),
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "confidence": 0.85,
                }
                for ent in doc.ents
            ]
            results["entities"] = entities
            await save_analysis(
                analysis_type="ner",
                source_type=request.source_type or "manual",
                source_id=request.source_id,
                model_name="spacy/en_core_web_sm",
                input_text=request.text,
                output={"entities": entities},
                processing_time_ms=ner_ms,
                entities=entities,
            )

        # Sentiment
        if sentiment_pipeline:
            start = time.time()
            sentiment_result = sentiment_pipeline(request.text)[0]
            sent_ms = int((time.time() - start) * 1000)
            results["sentiment"] = {
                "label": sentiment_result["label"],
                "score": sentiment_result["score"],
            }
            await save_analysis(
                analysis_type="sentiment",
                source_type=request.source_type or "manual",
                source_id=request.source_id,
                model_name="cardiffnlp/twitter-roberta-base-sentiment-latest",
                input_text=request.text,
                output=results["sentiment"],
                processing_time_ms=sent_ms,
            )

        # Classification
        if classifier_pipeline:
            start = time.time()
            class_result = classifier_pipeline(request.text)[0]
            cls_ms = int((time.time() - start) * 1000)
            results["classification"] = {
                "category": class_result["label"],
                "confidence": class_result["score"],
            }
            await save_analysis(
                analysis_type="classification",
                source_type=request.source_type or "manual",
                source_id=request.source_id,
                model_name="distilbert-base-uncased-finetuned-sst-2-english",
                input_text=request.text,
                output=results["classification"],
                processing_time_ms=cls_ms,
            )

        return results
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================
# Read-back endpoints for stored analyses
# ==================================
@app.get("/api/v1/nlp/analyses")
async def list_analyses(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    analysis_type: Optional[str] = None,
):
    """List stored NLP analyses"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if analysis_type:
                conditions.append(f"analysis_type = ${idx}")
                params.append(analysis_type)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT id, source_type, source_id, analysis_type, model_name, status,
                       processing_time_ms, created_at, completed_at
                FROM nlp_analyses
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM nlp_analyses {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "analyses": [
                {
                    "id": str(r["id"]),
                    "source_type": r["source_type"],
                    "source_id": str(r["source_id"]),
                    "analysis_type": r["analysis_type"],
                    "model_name": r["model_name"],
                    "status": r["status"],
                    "processing_time_ms": r["processing_time_ms"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing analyses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/nlp/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a stored NLP analysis with its entities"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM nlp_analyses WHERE id = $1",
                uuid.UUID(analysis_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Analysis not found")

            entities = await conn.fetch(
                "SELECT * FROM nlp_entities WHERE analysis_id = $1 ORDER BY start_offset",
                uuid.UUID(analysis_id),
            )

        return {
            "id": str(row["id"]),
            "source_type": row["source_type"],
            "source_id": str(row["source_id"]),
            "analysis_type": row["analysis_type"],
            "model_name": row["model_name"],
            "status": row["status"],
            "input_text": row["input_text"],
            "output": json.loads(row["output"]) if isinstance(row["output"], str) else row["output"],
            "processing_time_ms": row["processing_time_ms"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            "entities": [
                {
                    "id": str(e["id"]),
                    "entity_type": e["entity_type"],
                    "entity_text": e["entity_text"],
                    "normalized_text": e["normalized_text"],
                    "start_offset": e["start_offset"],
                    "end_offset": e["end_offset"],
                    "confidence": float(e["confidence"]) if e["confidence"] is not None else None,
                }
                for e in entities
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/nlp/entities")
async def list_entities(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    entity_type: Optional[str] = None,
):
    """List extracted NLP entities across all analyses"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if entity_type:
                conditions.append(f"entity_type = ${idx}")
                params.append(entity_type)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT e.id, e.analysis_id, e.entity_type, e.entity_text,
                       e.normalized_text, e.confidence, e.created_at,
                       a.analysis_type, a.source_type
                FROM nlp_entities e
                JOIN nlp_analyses a ON e.analysis_id = a.id
                {where_clause}
                ORDER BY e.created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM nlp_entities e {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "entities": [
                {
                    "id": str(r["id"]),
                    "analysis_id": str(r["analysis_id"]),
                    "entity_type": r["entity_type"],
                    "entity_text": r["entity_text"],
                    "normalized_text": r["normalized_text"],
                    "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
                    "analysis_type": r["analysis_type"],
                    "source_type": r["source_type"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error listing entities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8088"))
    uvicorn.run(app, host="0.0.0.0", port=port)
