# ==========================================
# STAGE 1: Build the frontend and backend
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package descriptors first to leverage Docker layer caching
COPY package.json package-lock.json tsconfig.json vite.config.ts ./

# Install all dependencies (including devDependencies for build step)
RUN npm ci

# Copy the entire source code
COPY . .

# Run production build (vite build + esbuild server compilation)
RUN npm run build

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files to install only production dependencies
COPY package.json package-lock.json ./

# Install only production-grade dependencies to minimize image size
RUN npm ci --only=production

# Copy built distribution artifacts from Stage 1
COPY --from=builder /app/dist ./dist
# Copy root folders needed for migrations and DB operations
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 3000

# Switch to standard unprivileged non-root user for security compliance
USER node

# Healthcheck configuration to monitor container status
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the bundled Express server
CMD ["node", "dist/server.cjs"]
