"""
Geopolitical Risk Model Training
XGBoost model for geopolitical risk prediction
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import mlflow
import mlflow.xgboost
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os

def prepare_features(df):
    """Prepare features for training"""
    # Feature engineering
    features = [
        'news_sentiment',
        'economic_growth',
        'inflation_rate',
        'currency_volatility',
        'trade_balance',
        'political_stability_index',
        'regional_conflicts',
        'sanctions_count'
    ]
    
    # Select and fill missing values
    X = df[features].fillna(0)
    return X

def train_model():
    """Train geopolitical risk model"""
    # TODO: Load actual training data
    # For now, generate synthetic data
    np.random.seed(42)
    n_samples = 1000
    
    data = {
        'news_sentiment': np.random.uniform(-1, 1, n_samples),
        'economic_growth': np.random.uniform(-5, 10, n_samples),
        'inflation_rate': np.random.uniform(0, 20, n_samples),
        'currency_volatility': np.random.uniform(0, 1, n_samples),
        'trade_balance': np.random.uniform(-100, 100, n_samples),
        'political_stability_index': np.random.uniform(0, 1, n_samples),
        'regional_conflicts': np.random.randint(0, 5, n_samples),
        'sanctions_count': np.random.randint(0, 10, n_samples),
        'risk_score': np.random.uniform(0, 1, n_samples)
    }
    
    df = pd.DataFrame(data)
    X = prepare_features(df)
    y = (df['risk_score'] > 0.5).astype(int)  # Binary classification
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # MLflow experiment
    mlflow.set_experiment("geopolitical-risk")
    
    with mlflow.start_run():
        # Train model
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Log metrics
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("precision", precision)
        mlflow.log_metric("recall", recall)
        mlflow.log_metric("f1_score", f1)
        
        # Log parameters
        mlflow.log_params({
            "n_estimators": 100,
            "max_depth": 5,
            "learning_rate": 0.1
        })
        
        # Log model
        mlflow.xgboost.log_model(model, "model")
        
        print(f"Model trained - Accuracy: {accuracy:.3f}, F1: {f1:.3f}")
        
        # Save model locally
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, "models/geopolitical_risk_model.pkl")
        
        return model

if __name__ == "__main__":
    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"))
    train_model()
