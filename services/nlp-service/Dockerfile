FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
RUN pip install --default-timeout=1000 --no-cache-dir fastapi==0.104.1
RUN pip install --default-timeout=1000 --no-cache-dir uvicorn[standard]==0.24.0
RUN pip install --default-timeout=1000 --no-cache-dir spacy==3.7.2
RUN pip install --default-timeout=1000 --no-cache-dir transformers==4.35.0
RUN pip install --default-timeout=1000 --no-cache-dir torch==2.1.0
RUN pip install --default-timeout=1000 --no-cache-dir pydantic==2.5.0
RUN pip install --default-timeout=1000 --no-cache-dir python-multipart==0.0.6

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8088

CMD ["python", "cmd/main.py"]
