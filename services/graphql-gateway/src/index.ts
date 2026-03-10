import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import { logger } from './middleware/logging';
import { extractContext, GatewayContext } from './middleware/auth';
import { metricsPlugin, registry } from './plugins/metrics';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',');
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

interface SubgraphConfig {
  name: string;
  url: string;
}

const subgraphs: SubgraphConfig[] = [
  { name: 'risk', url: process.env.RISK_SERVICE_URL || 'http://risk-assessment:4001/graphql' },
  { name: 'sanctions', url: process.env.SANCTIONS_SERVICE_URL || 'http://sanctions-screening:4002/graphql' },
  { name: 'graph-intel', url: process.env.GRAPH_INTEL_SERVICE_URL || 'http://graph-intelligence:4003/graphql' },
  { name: 'iam', url: process.env.IAM_SERVICE_URL || 'http://iam:4004/graphql' },
  { name: 'osint', url: process.env.OSINT_SERVICE_URL || 'http://news-aggregator:4005/graphql' },
  { name: 'simulations', url: process.env.SIMULATIONS_SERVICE_URL || 'http://scenario-simulation:4006/graphql' },
];

// ---------------------------------------------------------------------------
// Custom RemoteGraphQLDataSource for context propagation
// ---------------------------------------------------------------------------

class AuthenticatedDataSource extends RemoteGraphQLDataSource<GatewayContext> {
  override willSendRequest({
    request,
    context,
  }: {
    request: { http?: { headers: { set(key: string, value: string): void } } };
    context: GatewayContext;
  }): void {
    if (context.user) {
      request.http?.headers.set('x-user-id', context.user.sub);
      request.http?.headers.set('x-user-email', context.user.email);
      request.http?.headers.set('x-user-roles', context.user.roles.join(','));
      request.http?.headers.set('x-tenant-id', context.user.tenantId);
    }
    request.http?.headers.set('x-request-id', context.requestId);
    request.http?.headers.set('x-correlation-id', context.correlationId);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);

  // ---- Security & compression middleware ----
  app.use(
    helmet({
      contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

  // ---- Health check (before gateway so it always responds) ----
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'graphql-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/health/ready', (_req: Request, res: Response) => {
    // Readiness: gateway must be loaded
    if (gatewayReady) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  // ---- Prometheus metrics ----
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      logger.error('Failed to collect metrics', { error: err });
      res.status(500).end();
    }
  });

  // ---- Apollo Gateway ----
  let gatewayReady = false;

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: subgraphs.map((s) => ({ name: s.name, url: s.url })),
      pollIntervalInMs: 30_000,
    }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
  });

  const server = new ApolloServer<GatewayContext>({
    gateway,
    plugins: [
      metricsPlugin(),
      {
        async serverWillStart() {
          logger.info('Apollo Gateway starting');
          return {
            async drainServer() {
              logger.info('Apollo Gateway draining');
            },
          };
        },
      },
    ],
    introspection: NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: NODE_ENV !== 'production',
    formatError: (formattedError, _error) => {
      // Mask internal errors in production
      if (NODE_ENV === 'production' && !formattedError.extensions?.['code']) {
        return {
          ...formattedError,
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }
      return formattedError;
    },
  });

  await server.start();
  gatewayReady = true;
  logger.info('Apollo Server started');

  // ---- Mount GraphQL endpoint ----
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: CORS_ORIGINS.includes('*') ? true : CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
    }),
    expressMiddleware(server, {
      context: async ({ req }) => extractContext(req),
    })
  );

  // ---- Start listening ----
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => resolve());
  });

  logger.info(`GraphQL Gateway listening on port ${PORT}`, {
    environment: NODE_ENV,
    subgraphs: subgraphs.map((s) => s.name),
  });

  // ---- Graceful shutdown ----
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown`);
    gatewayReady = false;

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Drain Apollo
    await server.stop();
    logger.info('Apollo Server stopped');

    // Force exit after timeout
    const timer = setTimeout(() => {
      logger.warn('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start GraphQL Gateway', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
