# Phase 2: Enhanced Analytics — ML & Intelligence Layer

**Timeline:** Months 10-15 (6 months)  
**Status:** Specification Complete  
**Prerequisites:** Phase 1 MVP operational

---

## Objectives

1. Deploy ML models for risk prediction and intelligence analysis
2. Implement graph intelligence for entity relationship mapping
3. Add advanced NLP capabilities for document analysis
4. Enable explainable AI (XAI) for all ML decisions
5. Establish ML infrastructure (training, serving, monitoring)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ML Infrastructure Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MLflow     │  │  Feature     │  │   Model      │      │
│  │  (Tracking)  │  │   Store      │  │  Registry    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Seldon     │  │  Evidently   │  │   SHAP       │      │
│  │   Core       │  │   AI         │  │  (XAI)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│   Graph      │   │   NLP Service   │  │  Forecasting│
│ Intelligence │   │                 │  │   Service   │
│   Service    │   │  - NER          │  │             │
│              │   │  - Sentiment    │  │  - Prophet   │
│  - Neo4j     │   │  - Classification│ │  - LSTM     │
│  - Entity    │   │  - Summarization│ │             │
│  Resolution  │   └─────────────────┘  └─────────────┘
└───────┬──────┘
        │
┌───────▼──────┐
│   Neo4j      │
│  (Graph DB)  │
└──────────────┘
```

---

## ML Architecture

### Training Infrastructure

**Components:**
- **MLflow**: Experiment tracking, model registry, model versioning
- **Feature Store**: Feast or Tecton (optional, Phase 2)
- **Training Pipeline**: Kubeflow Pipelines or Airflow
- **GPU Clusters**: AWS SageMaker / GCP Vertex AI / Azure ML

**Workflow:**
1. Data extraction from PostgreSQL/TimescaleDB
2. Feature engineering (Python scripts)
3. Model training (PyTorch, scikit-learn, XGBoost)
4. Model validation (cross-validation, holdout test)
5. Model registration in MLflow
6. Model deployment to Seldon Core

### Inference Infrastructure

**Components:**
- **Seldon Core** (or KServe): Model serving with A/B testing
- **Redis**: Feature caching for low-latency inference
- **API Gateway**: Route requests to appropriate models
- **Load Balancer**: Distribute inference requests

**Serving Patterns:**
- **Synchronous**: REST API for real-time predictions
- **Asynchronous**: Kafka-based batch inference
- **Streaming**: Kafka Streams for continuous predictions

### Model Registry

**MLflow Model Registry:**
- Model versioning (semantic versioning)
- Model staging (development → staging → production)
- Model metadata (training metrics, hyperparameters, data lineage)
- Model approval workflow (human-in-the-loop)

---

## ML Models (Phase 2)

### 1. Geopolitical Risk Model
**Type:** Gradient Boosting (XGBoost/LightGBM)  
**Inputs:**
- News sentiment scores
- Economic indicators
- Historical risk events
- Geospatial features

**Outputs:**
- Risk score (0-100)
- Risk dimension breakdown
- Confidence interval

**Training Data:**
- Historical risk assessments (Phase 1)
- Labeled events (from news, government reports)
- Synthetic data for rare events

**Performance Target:**
- Accuracy: >70%
- Precision: >65%
- Recall: >70%
- F1-Score: >68%

### 2. Economic Risk Model
**Type:** Time-Series LSTM  
**Inputs:**
- GDP growth rates
- Inflation indicators
- Currency exchange rates
- Trade volumes
- Commodity prices

**Outputs:**
- Economic risk forecast (30/60/90 days)
- Volatility predictions
- Trend indicators

**Performance Target:**
- MAPE: <15%
- RMSE: <10% of mean

### 3. NLP Models

#### Named Entity Recognition (NER)
**Model:** spaCy + fine-tuned transformer (BERT/RoBERTa)  
**Entities:**
- Organizations
- Persons
- Locations
- Dates
- Financial amounts
- Legal references

**Performance Target:**
- F1-Score: >85%

#### Sentiment Analysis
**Model:** Fine-tuned BERT/RoBERTa  
**Outputs:**
- Sentiment score (-1 to +1)
- Emotion classification (fear, anger, optimism, etc.)
- Confidence score

**Performance Target:**
- Accuracy: >80%

#### Document Classification
**Model:** Fine-tuned transformer  
**Categories:**
- Threat intelligence
- Economic analysis
- Regulatory update
- Infrastructure report
- General news

**Performance Target:**
- Accuracy: >85%

#### Text Summarization
**Model:** T5 or BART  
**Outputs:**
- Abstractive summary (2-3 sentences)
- Key points extraction

**Performance Target:**
- ROUGE-L: >40%

### 4. Forecasting Model
**Type:** Prophet (Facebook) + ARIMA  
**Use Cases:**
- Risk trend forecasting
- Economic indicator prediction
- Event frequency prediction

**Performance Target:**
- MAPE: <20%

---

## Graph Intelligence

### Architecture

**Graph Database:** Neo4j  
**Graph Service:** Custom Go service with Neo4j driver

### Entity Resolution

**Problem:** Same entity appears with different names/IDs  
**Solution:**
- Fuzzy matching (Levenshtein, Jaro-Winkler)
- Graph-based clustering
- ML-based entity linking

**Entities:**
- Organizations
- Persons
- Locations
- Events
- Documents

### Relationship Mapping

**Relationship Types:**
- `OWNS` (organization → organization)
- `EMPLOYS` (organization → person)
- `LOCATED_IN` (entity → location)
- `MENTIONS` (document → entity)
- `ASSOCIATED_WITH` (entity → entity)
- `TRADES_WITH` (organization → organization)
- `INVESTED_IN` (organization → organization)

**Graph Algorithms:**
- PageRank (importance scoring)
- Community Detection (Louvain)
- Shortest Path (risk propagation)
- Centrality Measures (influence analysis)

### Risk Propagation

**Algorithm:**
1. Identify high-risk entities
2. Traverse graph relationships
3. Calculate risk propagation scores
4. Identify vulnerable entities
5. Generate alerts

**Key APIs:**
```
POST /api/v1/graph/entities/resolve
GET  /api/v1/graph/entities/{id}/relationships
GET  /api/v1/graph/risk/propagate
GET  /api/v1/graph/communities
```

---

## Explainable AI (XAI)

### SHAP Integration

**Purpose:** Explain individual predictions  
**Implementation:**
- SHAP values for tree-based models (XGBoost)
- SHAP for neural networks (Deep SHAP)
- SHAP for NLP models (Kernel SHAP)

**Outputs:**
- Feature importance scores
- Feature contribution plots
- Waterfall charts
- Force plots

### LIME Integration

**Purpose:** Local interpretability for complex models  
**Use Cases:**
- NLP model explanations
- Image classification (if added)
- Ensemble model explanations

### Model Transparency Dashboard

**Components:**
- Prediction explanations (SHAP/LIME)
- Model performance metrics
- Feature importance rankings
- Decision boundaries (for simple models)
- Counterfactual examples

**Key APIs:**
```
POST /api/v1/xai/explain
GET  /api/v1/xai/model/{model_id}/features
GET  /api/v1/xai/prediction/{prediction_id}/explanation
```

---

## Human-in-the-Loop Workflow

### Model Approval Process

1. **Training Complete:** Model trained and validated
2. **Automated Checks:** Performance metrics, bias detection
3. **Human Review:** Data scientist reviews model
4. **Staging Deployment:** Deploy to staging environment
5. **A/B Testing:** Compare with production model
6. **Approval:** Domain expert approves
7. **Production Deployment:** Deploy to production

### Bias Mitigation Controls

**Bias Detection:**
- Demographic parity
- Equalized odds
- Calibration checks
- Disparate impact analysis

**Mitigation Strategies:**
- Pre-processing (data balancing)
- In-processing (fairness constraints)
- Post-processing (threshold adjustment)

**Key APIs:**
```
GET  /api/v1/models/{id}/bias
POST /api/v1/models/{id}/bias/mitigate
GET  /api/v1/models/{id}/fairness
```

---

## Model Monitoring

### Drift Detection

**Data Drift:**
- Feature distribution changes (Evidently AI)
- Statistical tests (KS test, PSI)
- Alert thresholds

**Concept Drift:**
- Prediction accuracy degradation
- Performance metric monitoring
- Retraining triggers

**Model Drift:**
- Model performance over time
- A/B test comparisons
- Shadow mode monitoring

### Monitoring Dashboard

**Metrics:**
- Prediction latency (p50, p95, p99)
- Throughput (requests/second)
- Error rates
- Data drift scores
- Model performance (accuracy, precision, recall)

**Alerts:**
- Performance degradation (>10% drop)
- High latency (>1s p95)
- Data drift detected
- High error rate (>5%)

---

## Technology Stack

### ML Frameworks
- **Training:** PyTorch, scikit-learn, XGBoost, LightGBM
- **NLP:** spaCy, Transformers (Hugging Face), NLTK
- **Time-Series:** Prophet, statsmodels, LSTM (PyTorch)

### ML Infrastructure
- **Experiment Tracking:** MLflow
- **Model Serving:** Seldon Core (or KServe)
- **Feature Store:** Feast (optional)
- **Monitoring:** Evidently AI, Prometheus

### Graph Database
- **Graph DB:** Neo4j 5+
- **Graph Algorithms:** Neo4j GDS Library
- **Client:** Neo4j Go Driver

### XAI Libraries
- **SHAP:** shap library
- **LIME:** lime library
- **Visualization:** Plotly, matplotlib

---

## Key APIs

### ML Model Serving
```yaml
POST /api/v1/ml/models/{model_id}/predict:
  summary: Get prediction from ML model
  requestBody:
    schema:
      type: object
      properties:
        features: object
        explain: boolean
  responses:
    200:
      schema:
        prediction: number
        confidence: number
        explanation: object (if explain=true)
```

### Graph Intelligence
```yaml
POST /api/v1/graph/entities/resolve:
  summary: Resolve entity duplicates
  requestBody:
    schema:
      type: object
      properties:
        entities: array[Entity]
  responses:
    200:
      schema:
        resolved_entities: array[ResolvedEntity]

GET /api/v1/graph/risk/propagate:
  summary: Calculate risk propagation
  parameters:
    - entity_id: string
    - max_depth: integer
  responses:
    200:
      schema:
        propagation_scores: object
```

### Explainable AI
```yaml
POST /api/v1/xai/explain:
  summary: Explain model prediction
  requestBody:
    schema:
      type: object
      properties:
        model_id: string
        prediction_id: string
        method: enum[shap, lime]
  responses:
    200:
      schema:
        explanation: object
        feature_importance: array
```

---

## Deliverables

### Code
- [ ] ML training pipelines (4+ models)
- [ ] Model serving infrastructure (Seldon Core)
- [ ] Graph intelligence service
- [ ] NLP service (4+ models)
- [ ] XAI service (SHAP/LIME)
- [ ] Model monitoring dashboard
- [ ] Drift detection system

### Documentation
- [ ] Model documentation (architecture, performance)
- [ ] Training procedures
- [ ] Inference API documentation
- [ ] Graph schema documentation
- [ ] XAI methodology documentation

### Testing
- [ ] Model unit tests
- [ ] Integration tests (end-to-end ML pipeline)
- [ ] Performance tests (latency, throughput)
- [ ] Bias testing
- [ ] Drift detection tests

---

## Definition of Done

### Functional
- ✅ 4+ ML models deployed and serving predictions
- ✅ Graph intelligence operational (1000+ entities)
- ✅ NLP models processing documents
- ✅ XAI explanations available for all predictions
- ✅ Model monitoring active
- ✅ Drift detection working

### Non-Functional
- ✅ Model inference latency <500ms (p95)
- ✅ Model accuracy targets met
- ✅ Graph queries <200ms (p95)
- ✅ NLP processing <1s per document
- ✅ XAI explanations <2s

### Compliance
- ✅ Model bias checks implemented
- ✅ Human approval workflow operational
- ✅ Model versioning and audit trail
- ✅ XAI documentation complete

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Model performance below target | High | Extensive validation, ensemble methods |
| Data quality issues | High | Robust data validation, quality scoring |
| Model drift | Medium | Continuous monitoring, automated retraining |
| Bias in models | Critical | Bias detection, fairness constraints |
| Graph database scalability | Medium | Neo4j clustering, query optimization |

---

## Success Metrics

- **Technical:**
  - 4+ ML models in production
  - Risk prediction accuracy >70%
  - Graph analysis for 1000+ entities
  - Model inference latency <500ms (p95)
  - NLP F1-score >85% (NER)

- **Functional:**
  - XAI explanations for 100% of predictions
  - Graph relationship mapping operational
  - Document classification accuracy >85%

- **Compliance:**
  - Model bias checks passed
  - Human approval workflow operational
  - Model audit trail complete

---

## Next Phase Preparation

At Month 14, begin planning for **Phase 3: Decision Support**:
- Scenario simulation engine design
- War-gaming architecture
- Digital twin requirements
- Policy impact analysis design

---

**Document Version:** 1.0  
**Status:** Ready for Implementation
