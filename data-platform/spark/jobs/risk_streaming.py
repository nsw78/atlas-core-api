"""
ATLAS Spark Structured Streaming - Risk Events Pipeline
Reads risk events from Kafka, transforms, writes to Iceberg.
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_json, window, avg, count, max as spark_max,
    min as spark_min, current_timestamp, when
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType,
    TimestampType, IntegerType, MapType
)

KAFKA_BROKERS = "kafka.atlas-infra:9092"
ICEBERG_WAREHOUSE = "s3://atlas-datalake/warehouse"
CHECKPOINT_BASE = "s3://atlas-datalake/checkpoints"

risk_event_schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("event_type", StringType(), False),
    StructField("aggregate_id", StringType(), False),
    StructField("timestamp", TimestampType(), False),
    StructField("version", IntegerType(), True),
    StructField("source", StringType(), True),
    StructField("payload", MapType(StringType(), StringType()), True),
])


def create_spark_session():
    return (
        SparkSession.builder
        .appName("atlas-risk-streaming")
        .config("spark.sql.catalog.atlas", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.atlas.type", "hadoop")
        .config("spark.sql.catalog.atlas.warehouse", ICEBERG_WAREHOUSE)
        .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .config("spark.sql.adaptive.enabled", "true")
        .getOrCreate()
    )


def stream_risk_events(spark):
    raw_stream = (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BROKERS)
        .option("subscribe", "atlas.risk.assessed,atlas.alert.triggered,atlas.alert.resolved")
        .option("startingOffsets", "latest")
        .option("maxOffsetsPerTrigger", 10000)
        .load()
    )

    parsed = (
        raw_stream
        .select(
            col("topic"), col("timestamp").alias("kafka_ts"),
            from_json(col("value").cast("string"), risk_event_schema).alias("e")
        )
        .select("topic", "kafka_ts", "e.*")
        .withColumn("processing_time", current_timestamp())
        .withColumn("risk_score", col("payload").getItem("risk_score").cast(DoubleType()))
        .withColumn("risk_level", col("payload").getItem("risk_level"))
        .withColumn("country_code", col("payload").getItem("country_code"))
    )

    raw_q = (
        parsed.writeStream.format("iceberg").outputMode("append")
        .option("path", "atlas.risk_intelligence.risk_events")
        .option("checkpointLocation", f"{CHECKPOINT_BASE}/risk/raw")
        .trigger(processingTime="30 seconds").start()
    )

    windowed = (
        parsed.withWatermark("timestamp", "10 minutes")
        .groupBy(window("timestamp", "5 minutes"), "event_type", "country_code", "risk_level")
        .agg(
            count("*").alias("event_count"),
            avg("risk_score").alias("avg_risk_score"),
            spark_max("risk_score").alias("max_risk_score"),
            spark_min("risk_score").alias("min_risk_score"),
        )
        .select(col("window.start").alias("window_start"), col("window.end").alias("window_end"),
                "event_type", "country_code", "risk_level", "event_count",
                "avg_risk_score", "max_risk_score", "min_risk_score")
    )

    agg_q = (
        windowed.writeStream.format("iceberg").outputMode("append")
        .option("path", "atlas.risk_intelligence.risk_aggregates")
        .option("checkpointLocation", f"{CHECKPOINT_BASE}/risk/agg")
        .trigger(processingTime="1 minute").start()
    )

    return raw_q, agg_q


if __name__ == "__main__":
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")
    raw_q, agg_q = stream_risk_events(spark)
    spark.streams.awaitAnyTermination()
