# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
# Install dependencies (will generate package-lock.json if needed)
RUN npm install

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Use the node user that already exists in node:18-alpine (UID 1000, GID 1000)
# This user is already created in the base image
RUN chown -R node:node /app

# Switch to node user (non-root)
USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "start"]
