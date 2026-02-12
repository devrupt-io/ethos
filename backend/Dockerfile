FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm install tsx

COPY tsconfig.json ./
COPY src/ ./src/

CMD ["npx", "tsx", "src/index.ts"]
