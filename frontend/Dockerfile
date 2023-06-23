# Node.js Docker Image
# * [DockerHub Page](https://hub.docker.com/_/node)
ARG NODE_RELEASE=16 \
    DEBIAN_RELEASE=bullseye \
    NODE_TAG=${NODE_RELEASE}-${DEBIAN_RELEASE}

# Taken from https://nextjs.org/docs/deployment
# Install dependencies only when needed
FROM node:${NODE_TAG} AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then \
        # Based on https://stackoverflow.com/questions/58482655/what-is-the-closest-to-npm-ci-in-yarn
        rm -rf node_modules && yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
        npm ci; \
    elif [ -f pnpm-lock.yaml ]; then \
        yarn global add pnpm && pnpm i --frozen-lockfile; \
    else \
        echo "Lockfile not found." && exit 1; \
    fi


# Rebuild the source code only when needed
FROM node:${NODE_TAG} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy source code to the image
COPY . .
# Disable telemetry during the build. See: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

ARG NEXT_PUBLIC_BACKEND_WS
ENV NEXT_PUBLIC_BACKEND_WS=${NEXT_PUBLIC_BACKEND_WS}
    
# Build frontend
RUN ["yarn", "build"]

###
# Create image from builder for linting
#
# ESLint statically analyzes your code to quickly find problems. 
# See: https://eslint.org/
###

FROM builder AS staticchecking

CMD [ "yarn", "lint" ]



###
# Create image from builder for testing
###
FROM builder AS testing

CMD [ "yarn", "test" ]


###
# Create image from builder to create testreports
###
FROM builder AS reporter

ENV NODE_ENV development
# Disable telemetry during the build. See: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

CMD [ \
"sh", "-c", \
"yarn --frozen-lockfile && yarn test_artifacts" \
]

###
# Create image from builder to audit for outdated packages
###
FROM builder AS auditing

ENV NODE_ENV development
# Disable telemetry during the build. See: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

CMD [ \
"sh", "-c", \
"yarn --frozen-lockfile && yarn audit" \
]

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
