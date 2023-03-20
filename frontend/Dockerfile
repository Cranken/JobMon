# Node.js Docker Image
# * [DockerHub Page](https://hub.docker.com/_/node)
ARG NODE_TAG=16-alpine

###
# node.js dependencies
###
# Taken from https://nextjs.org/docs/deployment
# Install dependencies only when needed
FROM node:${NODE_TAG} AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then \
        yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
        npm ci; \
    elif [ -f pnpm-lock.yaml ]; then \
        yarn global add pnpm && pnpm i --frozen-lockfile; \
    else \
        echo "Lockfile not found." && exit 1; \
    fi

###
# Development environment
###
FROM deps AS dev_env
WORKDIR /app
ENV NODE_ENV development
# Disable telemetry during the build. See: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1
# reads NEXT_PUBLIC_BACKEND_URL and NEXT_PUBLIC_BACKEND_WS from frontend/.env.development
CMD [ "yarn", "dev" ]

###
# Builder
###
FROM deps AS builder
WORKDIR /app
# Copy source code to the image
COPY . .
# Disable telemetry during the build. See: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

ARG NEXT_PUBLIC_BACKEND_WS
ENV NEXT_PUBLIC_BACKEND_WS=${NEXT_PUBLIC_BACKEND_WS}

RUN ["yarn", "build"]

# Production image, copy all the files and run next
FROM node:${NODE_TAG} AS runner
WORKDIR /app

ENV NODE_ENV production
# Disable telemetry during runtime. See: https://nextjs.org/telemetry# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]