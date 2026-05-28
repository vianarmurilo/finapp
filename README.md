# FinMind AI+

Aplicativo full-stack para gestão financeira pessoal e familiar, com recursos de análise, previsão e recomendações impulsionadas por componentes de inteligência (analytics/advisor).

## Índice
- Visão geral
- Principais funcionalidades
- Arquitetura e tecnologias
- Estrutura do repositório
- Como rodar (desenvolvimento)
- Variáveis de ambiente importantes
- Endpoints principais
- Testes e qualidade
- Deploy
- Como contribuir

## Visão geral

FinMind é uma plataforma que combina um aplicativo cliente (Flutter) e uma API (Node.js + TypeScript) para ajudar usuários e famílias a controlar finanças, planejar metas, monitorar assinaturas e receber recomendações e alertas financeiros.

O sistema suporta contas individuais e contas familiares (grupos com convites), com dashboards, relatórios e recursos de previsão/analytics que auxiliam na tomada de decisão.

## Principais funcionalidades

- **Autenticação e Autorização:** login/registro com JWT, roles (usuário, admin) e endpoints protegidos.
- **Transações:** CRUD completo (criar, ler, atualizar, deletar) de transações financeiras com categorias e tags.
- **Categorias:** gerenciar categorias e subcategorias para organizar transações.
- **Metas (Goals):** criar e acompanhar metas financeiras com progresso e prazos.
- **Assinaturas (Subscriptions):** cadastro e monitoramento de cobranças recorrentes.
- **Família/Grupos:** criar grupos, convidar membros, dashboard financeiro colaborativo e permissões.
- **Dashboard & Analytics:** indicadores (saldo, receitas, despesas, tendências), gráficos e métricas agregadas.
- **Previsões & Alertas:** modelos de previsão simples e regras de alerta para gastos e metas.
- **Advisor/Assistente Financeiro:** recomendações e insights baseados em histórico e métricas.
- **Saúde da API:** endpoint de healthcheck e monitoramento básico.

## Arquitetura e tecnologias

- **Cliente:** Flutter (mobile e web), gerenciamento de estado com Riverpod, comunicação HTTP com Dio.
- **API:** Node.js + TypeScript + Express. ORM: Prisma com PostgreSQL.
- **Banco de dados:** PostgreSQL (pode ser executado via Docker Compose fornecido no backend).
- **Autenticação:** JWT com tokens de acesso e refresh conforme implementado no backend.
- **Infra:** Docker para ambiente local (DB) e orquestração básica para deploys.

Fluxo resumido: o cliente Flutter comunica-se com a API em /api/*; a API valida JWT, persiste dados no Postgres via Prisma e executa rotinas de análise/forecast quando requisitado.

## Estrutura do repositório

- `lib/`: código Flutter do aplicativo (UI, estados, serviços HTTP)
- `backend/`: API Node/TypeScript, Prisma, scripts e configuração Docker
- `docs/`: documentação, roteiros, coleções de teste e guias de deploy
- `build/`, `ios/`, `android/`, `web/`, `windows/`, `macos/`, `linux/`: artefatos do Flutter

## Como rodar (desenvolvimento)

Pré-requisitos: `Flutter SDK`, `Node.js 20+`, `npm` ou `pnpm`, `Docker` (opcional, recomendado para Postgres).

1) Banco de dados (via Docker, recomendado)

- Abra um terminal em [backend](backend) e rode:

```bash
docker compose up -d
```

2) Backend (API)

- Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cd backend
cp .env.example .env
```

- Ajuste `DATABASE_URL`, `JWT_SECRET` e demais variáveis em `backend/.env`.

- Instale dependências e gere artefatos Prisma:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Por padrão a API iniciará em `http://localhost:3333/api`.

3) Frontend (Flutter)

- No diretório raiz do projeto:

```bash
flutter pub get
flutter run
```

Use `flutter run -d chrome` para web ou selecione um dispositivo/emulador.

## Variáveis de ambiente importantes

- `DATABASE_URL` — string de conexão PostgreSQL (usada pelo Prisma)
- `JWT_SECRET` — segredo para assinar tokens JWT
- `PORT` — porta em que a API será executada (padrão: 3333)

O exemplo está em [backend/.env.example](backend/.env.example).

## Endpoints principais (resumo)

- `POST /api/auth/register` — criar conta
- `POST /api/auth/login` — autenticar e receber token
- `GET /api/transactions` — listar transações
- `POST /api/transactions` — criar transação
- `PUT /api/transactions/:id` — atualizar
- `DELETE /api/transactions/:id` — remover
- `GET/POST /api/goals` — gestão de metas
- `GET/POST /api/categories` — gestão de categorias
- `GET/POST /api/subscriptions` — gestão de assinaturas
- `POST /api/family` — criar grupo / convidar membros
- `GET /api/analytics` — métricas e relatórios
- `GET /api/predictions` — previsões simples
- `GET /api/alerts` — alertas gerados
- `GET /api/advisor` — recomendações financeiras

Consulte a pasta `src/routes` no backend para o mapeamento completo (e a documentação em `docs/backend`).

## Testes e qualidade

- Frontend (Flutter):

```bash
flutter analyze
flutter test
```

- Backend:

```bash
cd backend
npm run test
```

- Testes manuais/coleções de API: `docs/backend/02-api-tests.postman_collection.json`.

## Deploy (dicas rápidas)

- Produção: criar imagem Docker da API, configurar variáveis de ambiente e apontar para um banco Postgres gerenciado.
- Use `prisma migrate deploy` em ambientes de produção para aplicar migrações.
- Considere usar um serviço de CI/CD para buildar artefatos Flutter e publicar releases.

## Como contribuir

- Abra issues para bugs ou sugestões.
- Para PRs: crie uma branch a partir de `main`, implemente testes e descreva a mudança no PR.

## Documentação adicional

- Arquitetura e modelagem: [docs/architecture/01-planejamento-modelagem.md](docs/architecture/01-planejamento-modelagem.md)
- Rotas do frontend: [docs/frontend/routes.md](docs/frontend/routes.md)
- Segurança: [docs/backend/06-seguranca.md](docs/backend/06-seguranca.md)
- Validação manual e testes: [docs/backend/03-validacao-manual.md](docs/backend/03-validacao-manual.md)
- Guia Prisma Dev DB: [docs/backend/04-prisma-dev-db.md](docs/backend/04-prisma-dev-db.md)
- Deploy: [docs/backend/05-deploy-producao.md](docs/backend/05-deploy-producao.md)

## Contato

- Mantido por: equipe do projeto / desenvolvedor(a)
- Para dúvidas técnicas, abra uma issue ou contate via e-mail configurado no repositório.

## Licença

Este repositório inclui código sob a licença definida no projeto. Se nenhum arquivo `LICENSE` existir, confirme com os mantenedores a licença desejada.
