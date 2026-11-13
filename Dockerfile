# Build stage: installs every workspace dependency and bundles each role into one file.
FROM node:24-alpine AS build
WORKDIR /src
RUN npm install -g pnpm@11.9.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/fake-tally/package.json packages/fake-tally/
COPY apps/cloud/package.json apps/cloud/
COPY apps/connector/package.json apps/connector/
COPY apps/console/package.json apps/console/
RUN pnpm install --frozen-lockfile
COPY packages packages
COPY apps apps
COPY scripts scripts
RUN pnpm typecheck && node scripts/build.mjs

# Builds the console. API_INTERNAL_URL is fixed here because Next.js bakes rewrites into its build.
FROM build AS console-build
ARG API_INTERNAL_URL=http://api:3000
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @hexspare/console build

# The developer console: the Next.js standalone server, with only the packages it traces as needed.
FROM node:24-alpine AS console
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=console-build /src/apps/console/.next/standalone ./
COPY --from=console-build /src/apps/console/.next/static ./apps/console/.next/static
COPY --from=console-build /src/apps/console/public ./apps/console/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "apps/console/server.js"]

# The API and the webhook worker. No package manager, no source and no node_modules.
FROM node:24-alpine AS cloud
ENV NODE_ENV=production MIGRATIONS_DIR=/app/db/migrations PORT=3000
WORKDIR /app
COPY --from=build /src/dist/cloud.mjs ./cloud.mjs
COPY db/migrations db/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/readyz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["node", "cloud.mjs"]
CMD ["serve"]

# The demo only: simulated Tally plus headless connector. Never part of a production deployment.
FROM node:24-alpine AS demo
ENV NODE_ENV=production CONNECTOR_DB=/data/connector.sqlite
WORKDIR /app
COPY --from=build /src/dist/connector.mjs /src/dist/fake-tally.mjs ./
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
