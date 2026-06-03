FROM node:22-slim

WORKDIR /app

ENV CI=true

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finmind_ai?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN npm ci

COPY . .

RUN npm run prisma:generate && npm run build

EXPOSE 3080

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]