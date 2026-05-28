## Frontend Flutter

| Rota | Tela | Finalidade |
|---|---|---|
| /dashboard | DashboardScreen | Visão geral financeira com indicadores principais. |
| /transactions | TransactionsScreen | Listagem, filtros e edição de transações. |
| /goals | GoalsScreen | Gestão de metas financeiras e cofrinho. |
| /intelligence | IntelligenceScreen | Sugestões automáticas e plano financeiro inteligente. |
| /family | FamilyScreen | Grupos familiares, dashboard coletivo e transações do grupo. |

## Autenticação

| Rota | Tela | Finalidade |
|---|---|---|
| / | AuthScreen | Entrada inicial quando não existe sessão salva. |

## Backend API

| Rota | Método | Finalidade |
|---|---|---|
| /api/health | GET | Verificação de saúde da API. |
| /api/auth/register | POST | Cadastro de usuário. |
| /api/auth/login | POST | Login com emissão de token JWT. |
| /api/transactions | GET/POST/PUT/DELETE | CRUD de transações. |
| /api/goals | GET/POST/PUT/DELETE | CRUD de metas. |
| /api/categories | GET/POST/PUT/DELETE | CRUD de categorias. |
| /api/subscriptions | GET/POST/PUT/DELETE | CRUD de assinaturas. |
| /api/family | GET/POST/PUT/DELETE | Rotas de família e dashboard coletivo. |
| /api/admin | GET/POST/PUT/DELETE | Operações administrativas. |
| /api/analytics | GET | Indicadores e análises financeiras. |
| /api/predictions | GET | Previsões financeiras. |
| /api/alerts | GET | Alertas e desvios. |
| /api/advisor | GET | Recomendações financeiras. |
