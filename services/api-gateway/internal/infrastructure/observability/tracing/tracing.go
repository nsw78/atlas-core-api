package tracing

import (
	"context"
	"fmt"
	"io"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

// TracerProvider represents a tracing provider
type TracerProvider struct {
	shutdownFunc func(context.Context) error
	tracer       trace.Tracer
	logger       *zap.Logger
}

// NewTracerProvider initializes a new tracer provider with OTLP/gRPC (Jaeger-compatible)
func NewTracerProvider(serviceName, endpoint string, logger *zap.Logger) (*TracerProvider, error) {
	ctx := context.Background()

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		logger.Error("Failed to create OTLP exporter", zap.Error(err))
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String("2.0.0"),
		),
	)
	if err != nil {
		logger.Error("Failed to create resource", zap.Error(err))
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	otel.SetTracerProvider(tp)

	tracer := tp.Tracer(serviceName)

	logger.Info("Tracer provider initialized",
		zap.String("service", serviceName),
		zap.String("endpoint", endpoint),
	)

	return &TracerProvider{
		shutdownFunc: tp.Shutdown,
		tracer:       tracer,
		logger:       logger,
	}, nil
}

// NewNoopTracerProvider creates a no-op tracer provider for development/testing
func NewNoopTracerProvider(serviceName string, logger *zap.Logger) *TracerProvider {
	logger.Info("Using no-op tracer provider (development/testing mode)")
	return &TracerProvider{
		tracer: otel.Tracer(serviceName),
		shutdownFunc: func(ctx context.Context) error {
			return nil
		},
		logger: logger,
	}
}

// Tracer returns the underlying trace.Tracer
func (tp *TracerProvider) Tracer() trace.Tracer {
	return tp.tracer
}

// Shutdown shuts down the tracer provider
func (tp *TracerProvider) Shutdown(ctx context.Context) error {
	if tp.shutdownFunc != nil {
		return tp.shutdownFunc(ctx)
	}
	return nil
}

// StartSpan starts a new span
func (tp *TracerProvider) StartSpan(ctx context.Context, name string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return tp.tracer.Start(ctx, name, opts...)
}

// RecordSpanAttribute records an attribute in the current span
func RecordSpanAttribute(ctx context.Context, key string, value interface{}) {
	span := trace.SpanFromContext(ctx)
	if span != nil {
		span.AddEvent(fmt.Sprintf("%s=%v", key, value))
	}
}

// RecordSpanError records an error in the current span
func RecordSpanError(ctx context.Context, err error) {
	span := trace.SpanFromContext(ctx)
	if span != nil && err != nil {
		span.RecordError(err)
	}
}

// GetTraceID gets trace ID from context
func GetTraceID(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span != nil {
		return span.SpanContext().TraceID().String()
	}
	return ""
}

// NoopCloser implements io.Closer for noop operations
type NoopCloser struct{}

func (nc *NoopCloser) Close() error {
	return nil
}

var _ io.Closer = (*NoopCloser)(nil)
