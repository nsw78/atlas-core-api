import { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener } from '@apollo/server';
import client, { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { GatewayContext } from '../middleware/auth';

export const registry = new Registry();

client.collectDefaultMetrics({ register: registry });

const gqlRequestsTotal = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation_type', 'operation_name', 'status'],
  registers: [registry],
});

const gqlRequestDuration = new Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation_type', 'operation_name'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const gqlErrors = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation_type', 'operation_name', 'error_code'],
  registers: [registry],
});

const gqlActiveRequests = new Gauge({
  name: 'graphql_active_requests',
  help: 'Number of currently active GraphQL requests',
  registers: [registry],
});

const gqlCacheHits = new Counter({
  name: 'graphql_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['operation_name'],
  registers: [registry],
});

const gqlCacheMisses = new Counter({
  name: 'graphql_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['operation_name'],
  registers: [registry],
});

const subgraphRequestDuration = new Histogram({
  name: 'graphql_subgraph_request_duration_seconds',
  help: 'Duration of subgraph fetch requests in seconds',
  labelNames: ['subgraph_name', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export function metricsPlugin(): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart(
      _requestContext: GraphQLRequestContext<GatewayContext>
    ): Promise<GraphQLRequestListener<GatewayContext>> {
      const startTime = process.hrtime.bigint();
      gqlActiveRequests.inc();

      let operationType = 'unknown';
      let operationName = 'anonymous';

      return {
        async didResolveOperation(ctx) {
          operationType = ctx.operation?.operation || 'unknown';
          operationName = ctx.operationName || 'anonymous';
        },

        async responseForOperation(ctx) {
          // Track cache hits via response cache
          if (ctx.response?.http?.headers?.get('x-cache') === 'HIT') {
            gqlCacheHits.inc({ operation_name: operationName });
          } else {
            gqlCacheMisses.inc({ operation_name: operationName });
          }
          return null;
        },

        async willSendResponse() {
          const durationNs = process.hrtime.bigint() - startTime;
          const durationSec = Number(durationNs) / 1e9;

          gqlRequestDuration.observe(
            { operation_type: operationType, operation_name: operationName },
            durationSec
          );
          gqlRequestsTotal.inc({
            operation_type: operationType,
            operation_name: operationName,
            status: 'success',
          });
          gqlActiveRequests.dec();
        },

        async didEncounterErrors(ctx) {
          for (const error of ctx.errors) {
            const code =
              (error.extensions?.['code'] as string) || 'INTERNAL_SERVER_ERROR';
            gqlErrors.inc({
              operation_type: operationType,
              operation_name: operationName,
              error_code: code,
            });
          }
          gqlRequestsTotal.inc({
            operation_type: operationType,
            operation_name: operationName,
            status: 'error',
          });
        },
      };
    },
  };
}

export function trackSubgraphFetch(
  subgraphName: string,
  durationMs: number,
  success: boolean
): void {
  subgraphRequestDuration.observe(
    { subgraph_name: subgraphName, status: success ? 'success' : 'error' },
    durationMs / 1000
  );
}
