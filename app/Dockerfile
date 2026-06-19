FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --prefer-offline --no-audit

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/sqlite.db ./sqlite.db
COPY --from=build /app/db/migrations ./db/migrations
COPY package.json ./

EXPOSE 3000
CMD ["npm", "start"]
