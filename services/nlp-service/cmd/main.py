"""
NLP Service
Provides NLP capabilities: NER, Sentiment Analysis, Document Classification, Summarization
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import spacy
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATLAS NLP Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load NLP models (lazy loading)
nlp_model = None
sentiment_pipeline = None
classifier_pipeline = None

def load_models():
    """Load NLP models on startup"""
    global nlp_model, sentiment_pipeline, classifier_pipeline
    try:
        # Load spaCy model for NER
        nlp_model = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded")
        
        # Load sentiment analysis model
        sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=-1  # CPU
        )
        logger.info("Sentiment model loaded")
        
        # Load document classifier
        classifier_pipeline = pipeline(
            "text-classification",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1  # CPU
        )
        logger.info("Classification model loaded")
    except Exception as e:
        logger.warning(f"Failed to load some models: {e}. Using fallback.")

class TextInput(BaseModel):
    text: str

class NERRequest(BaseModel):
    text: str
    entity_types: Optional[List[str]] = None

class SentimentRequest(BaseModel):
    text: str

class ClassificationRequest(BaseModel):
    text: str
    categories: Optional[List[str]] = None

class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150

@app.on_event("startup")
async def startup_event():
    load_models()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "nlp-service",
        "models_loaded": nlp_model is not None
    }

@app.post("/api/v1/nlp/ner")
async def extract_entities(request: NERRequest):
    """Extract named entities from text"""
    try:
        if nlp_model is None:
            load_models()
        
        doc = nlp_model(request.text)
        entities = []
        
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "confidence": 0.85  # TODO: Calculate actual confidence
            })
        
        return {
            "entities": entities,
            "count": len(entities)
        }
    except Exception as e:
        logger.error(f"NER failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nlp/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of text"""
    try:
        if sentiment_pipeline is None:
            load_models()
        
        result = sentiment_pipeline(request.text)[0]
        
        # Normalize to -1 to +1 scale
        label = result['label'].lower()
        score = result['score']
        
        sentiment_score = 0.0
        if 'positive' in label:
            sentiment_score = score
        elif 'negative' in label:
            sentiment_score = -score
        elif 'neutral' in label:
            sentiment_score = 0.0
        
        return {
            "sentiment": label,
            "score": sentiment_score,
            "confidence": score
        }
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nlp/classify")
async def classify_document(request: ClassificationRequest):
    """Classify document into categories"""
    try:
        if classifier_pipeline is None:
            load_models()
        
        result = classifier_pipeline(request.text)[0]
        
        return {
            "category": result['label'],
            "confidence": result['score']
        }
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nlp/summarize")
async def summarize_text(request: SummarizationRequest):
    """Generate summary of text"""
    try:
        # TODO: Implement summarization with T5 or BART
        # For now, return a simple extractive summary
        sentences = request.text.split('.')
        summary = '. '.join(sentences[:3]) + '.'
        
        return {
            "summary": summary,
            "original_length": len(request.text),
            "summary_length": len(summary),
            "compression_ratio": len(summary) / len(request.text) if len(request.text) > 0 else 0
        }
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nlp/process")
async def process_text(request: TextInput):
    """Process text with all NLP capabilities"""
    try:
        results = {}
        
        # NER
        if nlp_model:
            doc = nlp_model(request.text)
            results["entities"] = [
                {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
                for ent in doc.ents
            ]
        
        # Sentiment
        if sentiment_pipeline:
            sentiment_result = sentiment_pipeline(request.text)[0]
            results["sentiment"] = {
                "label": sentiment_result['label'],
                "score": sentiment_result['score']
            }
        
        # Classification
        if classifier_pipeline:
            class_result = classifier_pipeline(request.text)[0]
            results["classification"] = {
                "category": class_result['label'],
                "confidence": class_result['score']
            }
        
        return results
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8088"))
    uvicorn.run(app, host="0.0.0.0", port=port)
