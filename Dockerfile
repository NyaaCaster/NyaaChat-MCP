# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps with cache-friendly layer
COPY package*.json ./
RUN npm ci

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies for a slim runtime install
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Pin timezone (Alpine ships tzdata via apk)
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    MCP_PORT=3094 \
    MCP_HOST=0.0.0.0

# Run as the non-root user provided by the node image
USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3094

CMD ["node", "dist/index.js"]
