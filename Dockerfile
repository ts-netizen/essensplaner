# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifests and lockfile for optimal Docker layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy full source trees
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/web ./apps/web

# Build all packages in topological order (@essensplaner/shared -> @essensplaner/server -> web)
RUN npm run build

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:22-alpine AS runner

# Production environment variables
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Copy manifests for production-only dependencies
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only and purge npm cache
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled shared package artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy compiled backend server artifacts
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy built frontend SPA assets to apps/server/web-dist for static serving
COPY --from=builder /app/apps/web/dist ./apps/server/web-dist

# Change file ownership to unprivileged node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose Cloud Run default port
EXPOSE 8080

# Working directory for server execution
WORKDIR /app/apps/server

# Start the unified Node.js BFF serving both API routes and frontend SPA
CMD ["node", "dist/index.js"]
