import { Request } from 'express';
import jwt, { JwtPayload, JwtHeader } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from './logging';

export interface AtlasUser {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface GatewayContext {
  user: AtlasUser | null;
  authenticated: boolean;
  requestId: string;
  correlationId: string;
}

const JWKS_URI = process.env.JWKS_URI || 'http://iam-service:8080/.well-known/jwks.json';
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://atlas-core.io/iam';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'atlas-core-api';
const JWT_SECRET = process.env.JWT_SECRET;

const client = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600_000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(header: JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      reject(new Error('JWT header missing kid'));
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      if (!key) {
        reject(new Error('Signing key not found'));
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export async function extractContext(req: Request): Promise<GatewayContext> {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, authenticated: false, requestId, correlationId };
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyToken(token);
    return {
      user: {
        sub: decoded.sub as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) || [],
        tenantId: (decoded.tenant_id as string) || '',
        permissions: (decoded.permissions as string[]) || [],
        iat: decoded.iat,
        exp: decoded.exp,
      },
      authenticated: true,
      requestId,
      correlationId,
    };
  } catch (err) {
    logger.warn('JWT verification failed', {
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return { user: null, authenticated: false, requestId, correlationId };
  }
}

async function verifyToken(token: string): Promise<JwtPayload> {
  // If a static secret is configured, use it (dev/test environments)
  if (JWT_SECRET) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        JWT_SECRET,
        { issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded as JwtPayload);
        }
      );
    });
  }

  // Production: use JWKS endpoint
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader === 'string') {
    throw new Error('Invalid token structure');
  }

  const signingKey = await getSigningKey(decodedHeader.header);
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKey,
      { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithms: ['RS256'] },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as JwtPayload);
      }
    );
  });
}

export function requireAuth(context: GatewayContext): void {
  if (!context.authenticated || !context.user) {
    throw new Error('Authentication required');
  }
}

export function requireRole(context: GatewayContext, ...roles: string[]): void {
  requireAuth(context);
  const hasRole = roles.some((role) => context.user!.roles.includes(role));
  if (!hasRole) {
    throw new Error(`Insufficient permissions. Required roles: ${roles.join(', ')}`);
  }
}
