# OrbitX node-backend
# Runs TypeScript directly via tsx (source imports use .ts extensions),
# so there is no build/compile step — install deps and start.
FROM node:22-slim

# Enable pnpm via corepack (version pinned in package.json)
RUN corepack enable

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy the rest of the source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# Railway/host injects PORT; env.ts falls back to 5000
CMD ["pnpm", "start"]
