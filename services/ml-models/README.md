# ML Models Training

This directory contains training scripts for Phase 2 ML models.

## Models

1. **Geopolitical Risk Model** (`train_geopolitical_risk.py`)
   - XGBoost classifier
   - Binary risk classification
   - Targets: Accuracy >70%, F1 >68%

2. **Economic Risk Model** (`train_economic_risk.py`)
   - LSTM time-series model
   - Economic risk forecasting
   - Targets: MAPE <15%, RMSE <10%

## Usage

```bash
# Set MLflow tracking URI
export MLFLOW_TRACKING_URI=http://localhost:5000

# Train geopolitical risk model
python train_geopolitical_risk.py

# Train economic risk model
python train_economic_risk.py
```

## Output

Models are saved to:
- `models/geopolitical_risk_model.pkl`
- `models/economic_risk_lstm.h5`
- `models/economic_risk_scaler.pkl`

Models are also registered in MLflow for versioning and deployment.
