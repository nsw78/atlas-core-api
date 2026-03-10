"""
ATLAS Spark Batch - Sanctions Screening Analytics
Match rates, false positive analysis, geographic distribution.
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, avg, sum as spark_sum, when, desc, round as spark_round, expr

ICEBERG_WAREHOUSE = "s3://atlas-datalake/warehouse"

def create_spark_session():
    return (
        SparkSession.builder.appName("atlas-sanctions-analytics")
        .config("spark.sql.catalog.atlas", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.atlas.type", "hadoop")
        .config("spark.sql.catalog.atlas.warehouse", ICEBERG_WAREHOUSE)
        .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .getOrCreate()
    )

def analyze_match_rates(spark, out):
    df = spark.read.format("iceberg").load("atlas.sanctions.screening_results")
    by_source = (
        df.groupBy("list_source").agg(
            count("*").alias("total"),
            spark_sum(when(col("is_match"), 1).otherwise(0)).alias("matches"),
            spark_sum(when(col("is_true_positive"), 1).otherwise(0)).alias("tp"),
        )
        .withColumn("match_rate", spark_round(col("matches") / col("total") * 100, 4))
        .withColumn("precision", spark_round(col("tp") / col("matches") * 100, 2))
        .orderBy(desc("total"))
    )
    by_source.write.format("iceberg").mode("overwrite").save(f"{out}/match_rates")

def analyze_geographic(spark, out):
    df = spark.read.format("iceberg").load("atlas.sanctions.screening_results")
    geo = (
        df.filter(col("is_match")).groupBy("entity_country", "list_source")
        .agg(count("*").alias("matches"), avg("match_score").alias("avg_score"))
        .orderBy(desc("matches"))
    )
    geo.write.format("iceberg").mode("overwrite").save(f"{out}/geographic")

def analyze_false_positives(spark, out):
    df = spark.read.format("iceberg").load("atlas.sanctions.screening_results")
    fp = (
        df.filter(~col("is_true_positive") & col("is_match"))
        .withColumn("score_bucket", expr("FLOOR(match_score * 10) / 10"))
        .groupBy("score_bucket").agg(count("*").alias("fp_count"), avg("match_score").alias("avg_score"))
        .orderBy("score_bucket")
    )
    fp.write.format("iceberg").mode("overwrite").save(f"{out}/false_positives")

if __name__ == "__main__":
    spark = create_spark_session()
    out = "atlas.sanctions_analytics"
    analyze_match_rates(spark, out)
    analyze_geographic(spark, out)
    analyze_false_positives(spark, out)
    spark.stop()
