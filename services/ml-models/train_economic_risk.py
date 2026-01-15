"""
Economic Risk Model Training
LSTM model for economic risk forecasting
"""

import numpy as np
import pandas as pd
import mlflow
import mlflow.keras
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
import os

def create_sequences(data, seq_length=30):
    """Create sequences for LSTM"""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length])
    return np.array(X), np.array(y)

def train_model():
    """Train economic risk LSTM model"""
    # TODO: Load actual time-series data
    # Generate synthetic time-series data
    np.random.seed(42)
    n_samples = 1000
    
    # Simulate economic indicators
    time_series = np.cumsum(np.random.randn(n_samples) * 0.1) + 50
    time_series = np.clip(time_series, 0, 100)
    
    # Normalize
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(time_series.reshape(-1, 1)).flatten()
    
    # Create sequences
    seq_length = 30
    X, y = create_sequences(scaled_data, seq_length)
    
    # Split
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    # Reshape for LSTM
    X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], 1))
    X_test = X_test.reshape((X_test.shape[0], X_test.shape[1], 1))
    
    # MLflow experiment
    mlflow.set_experiment("economic-risk")
    
    with mlflow.start_run():
        # Build model
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(seq_length, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        # Train
        history = model.fit(
            X_train, y_train,
            epochs=10,
            batch_size=32,
            validation_split=0.2,
            verbose=1
        )
        
        # Evaluate
        y_pred = model.predict(X_test)
        mape = mean_absolute_percentage_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        # Log metrics
        mlflow.log_metric("mape", mape)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("final_loss", history.history['loss'][-1])
        
        # Log model
        mlflow.keras.log_model(model, "model")
        
        print(f"Model trained - MAPE: {mape:.3f}, RMSE: {rmse:.3f}")
        
        # Save model
        os.makedirs("models", exist_ok=True)
        model.save("models/economic_risk_lstm.h5")
        joblib.dump(scaler, "models/economic_risk_scaler.pkl")
        
        return model

if __name__ == "__main__":
    import joblib
    from tensorflow import keras
    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"))
    train_model()
