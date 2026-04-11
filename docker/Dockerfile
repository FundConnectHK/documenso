###########################
#     BASE CONTAINER      #
###########################
FROM node:22-alpine3.22 AS base

RUN apk add --no-cache openssl
RUN apk add --no-cache font-freefont


###########################
#    BUILDER CONTAINER    #
###########################
FROM base AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache jq
WORKDIR /app

COPY . .

RUN npm install -g "turbo@^1.9.3"

# Outputs to the /out folder
# source: https://turbo.build/repo/docs/reference/command-line-reference/prune#--docker
RUN turbo prune --scope=@documenso/remix --docker

###########################
#   INSTALLER CONTAINER   #
###########################
FROM base AS installer

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache jq
# Required for node_modules/aws-crt
RUN apk add --no-cache make cmake g++ openssl bash

WORKDIR /app

# Disable husky from installing hooks
ENV HUSKY 0
ENV DOCKER_OUTPUT 1
ENV NEXT_TELEMETRY_DISABLED 1

# Encryption keys
ARG NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE"
ENV NEXT_PRIVATE_ENCRYPTION_KEY="$NEXT_PRIVATE_ENCRYPTION_KEY"

ARG NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="DEADBEEF"
ENV NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="$NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY"

# Telemetry credentials (optional, baked into image at build time)
ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"


# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM
# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json

COPY --from=builder /app/lingui.config.ts ./lingui.config.ts
COPY --from=builder /app/patches ./patches

# Install dependencies and clean up in one layer to reduce size
RUN npm ci --prefer-offline --no-audit && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Then copy all the source code (as it changes more often)
# Copy turbo.json first (small file, changes rarely)
COPY --from=builder /app/out/full/turbo.json ./turbo.json

# Copy source code directories
COPY --from=builder /app/out/full/packages ./packages
COPY --from=builder /app/out/full/apps ./apps

RUN npm install -g "turbo@^1.9.3"

# Build and aggressively clean up to reduce layer size
# Save node_modules before cleaning up, as it's needed in runner stage
RUN turbo run build --filter=@documenso/remix... && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/* ~/.npm && \
    find . -type d -name ".turbo" -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "*.map" -type f -delete 2>/dev/null || true && \
    find . -name "*.ts" -not -path "*/node_modules/*" -type f -delete 2>/dev/null || true && \
    find . -name "*.tsx" -not -path "*/node_modules/*" -type f -delete 2>/dev/null || true

# Compress build artifacts to reduce layer size for transfer
# This helps avoid large layer upload failures
RUN cd /app/apps/remix/build && \
    tar -czf /tmp/build-client.tar.gz client && \
    tar -czf /tmp/build-server.tar.gz server && \
    rm -rf client server && \
    mkdir -p client server

###########################
#     RUNNER CONTAINER    #
###########################
FROM base AS runner

ENV HUSKY 0
ENV DOCKER_OUTPUT 1

# Telemetry credentials (baked into image at build time, can be disabled at runtime)
ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/out/json/ .
# Copy the tailwind config files across
COPY --from=builder --chown=nodejs:nodejs /app/out/full/packages/tailwind-config ./packages/tailwind-config
# Copy the patches across
COPY --from=builder --chown=nodejs:nodejs /app/patches ./patches

# Copy package files needed for production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/out/package-lock.json ./package-lock.json

# Copy all node_modules from installer stage, then prune to production only
# This avoids network issues during build and is faster than reinstalling
COPY --from=installer --chown=nodejs:nodejs /app/node_modules ./node_modules

# Prune devDependencies to keep only production dependencies
# This is more reliable than reinstalling and avoids network issues
RUN npm prune --production && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Automatically leverage output traces to reduce image size
# https://nodejs.org/docs/advanced-features/output-file-tracing
# Copy public assets first (usually smaller)
# This will create /app/apps/remix directory with correct permissions
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/public ./apps/remix/public

# Copy compressed build artifacts and extract them
# This creates smaller layers that are easier to push (compressed files transfer faster)
# Copy compressed files to a location where nodejs user can access them
COPY --from=installer --chown=nodejs:nodejs /tmp/build-server.tar.gz /tmp/build-client.tar.gz /tmp/

# Extract build artifacts (tar is available in Alpine base image)
# Create build directory and extract - mkdir will create with correct permissions as nodejs user
RUN mkdir -p /app/apps/remix/build && \
    cd /app/apps/remix && \
    tar -xzf /tmp/build-server.tar.gz -C build && \
    tar -xzf /tmp/build-client.tar.gz -C build

# Copy the prisma binary, schema and migrations
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/migrations ./packages/prisma/migrations

# Generate the prisma client again
RUN npx prisma generate --schema ./packages/prisma/schema.prisma


# Get the start script from docker/
COPY --chown=nodejs:nodejs ./docker/start.sh /app/apps/remix/start.sh

WORKDIR /app/apps/remix

CMD ["sh", "start.sh"]
