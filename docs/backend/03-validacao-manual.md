# Etapa 8 - Validacao Manual da API

## Pre-requisitos

1. Banco PostgreSQL ativo e acessivel em `DATABASE_URL`.
2. Rodar no backend:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Fluxo recomendado no Postman/Insomnia

1. Executar `Auth - Register`.
2. Executar `Auth - Login` e copiar token JWT para a variavel `token`.
3. Executar endpoints protegidos:
- `Transactions - List`
- `Goals - List`
- `Subscriptions - List`
- `Family - List Groups`
- `Analytics - Overview`
- `Prediction - GET /prediction`
- `Alerts - List`

## Regras que devem ser validadas

- Sem token, rotas protegidas retornam `401`.
- Usuario nao pode acessar/alterar transacoes de outro usuario.
- Filtro de transacoes por periodo funciona corretamente.
- `GET /prediction` retorna `futureBalance` e campos de previsao.
- Alertas retornam `NEGATIVE_FUTURE_BALANCE` quando aplicavel.
- Sugestao de categoria via `/categories/suggest` retorna correspondencia por keyword.

## Observacao

Neste ambiente de desenvolvimento atual, a migration automatica nao foi aplicada por indisponibilidade de PostgreSQL local. A migration inicial SQL ja foi versionada em `backend/prisma/migrations` para execucao quando o banco estiver ativo.
