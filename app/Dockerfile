FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --prefer-offline --no-audit

FROM deps AS build
ARG VITE_RAZORPAY_KEY_ID
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db/migrations ./db/migrations
COPY package.json ./

# Create persistent data directory (mount a Railway Volume here)
RUN mkdir -p /data

# Default DB path — override with Railway Volume env var DATABASE_URL=/data/sqlite.db
ENV DATABASE_URL=/data/sqlite.db

EXPOSE 3000
CMD ["npm", "start"]
