FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY next.config.js tsconfig.json tailwind.config.js postcss.config.js ./
COPY src/ ./src/

RUN npm run build

CMD ["npm", "start"]
