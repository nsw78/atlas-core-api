FROM apache/airflow:2.8.1-python3.11
USER root
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
USER airflow
COPY dags/ /opt/airflow/dags/
RUN pip install --no-cache-dir \
    apache-airflow-providers-postgres==5.10.0 \
    apache-airflow-providers-redis==3.6.0 \
    apache-airflow-providers-amazon==8.14.0 \
    apache-airflow-providers-slack==8.5.0 \
    apache-airflow-providers-apache-kafka==1.3.1 \
    apache-airflow-providers-http==4.9.0 \
    confluent-kafka==2.3.0 \
    httpx==0.27.0 \
    mlflow==2.10.0 \
    feast[redis,postgres]==0.36.0 \
    numpy==1.26.3 \
    pandas==2.2.0 \
    pyiceberg==0.6.0
