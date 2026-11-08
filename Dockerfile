FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV FEATURE_REVIEW_READY_AD_PACK=false
ENV ADVERITY_DB=/var/data/adverity.sqlite
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node docker/start.mjs ./start.mjs
RUN mkdir -p /var/data && chown node:node /var/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/feature-flags').then(async (response)=>{const body=await response.json(); if(!response.ok||body.review_ready_ad_pack!==false) process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "start.mjs"]
