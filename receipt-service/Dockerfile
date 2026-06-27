FROM node:20-slim

RUN apt-get update && apt-get install -y \
  chromium \
  chromium-sandbox \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .

EXPOSE 4000

CMD ["node", "index.js"]
