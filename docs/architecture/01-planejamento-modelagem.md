# FinMind AI+ - Etapa 1: Planejamento e Modelagem

Data: 30/03/2026
Objetivo: Definir o dominio de negocio, entidades e relacionamentos para iniciar implementacao full stack com base solida.

## 1. Visao do Produto

FinMind AI+ sera um assistente financeiro inteligente para uso pessoal e familiar, com:
- Controle de transacoes (entrada e saida)
- Metas financeiras
- Deteccao de assinaturas recorrentes
- Analytics e previsoes
- Alertas inteligentes
- Modo familia com dados compartilhados
- Perfil financeiro e gamificacao

## 2. Escopo de Entidades Principais

Entidades obrigatorias desta etapa:
- User
- Transaction
- Category
- Goal
- Subscription
- FamilyGroup
- FamilyMember

Entidades de suporte recomendadas para escalabilidade:
- Budget (orcamento mensal por categoria)
- Alert (alertas gerados pelo sistema)
- Insight (mensagens analiticas)
- UserScore (pontuacao e nivel de gamificacao)
- Achievement (conquistas)
- UserAchievement (relacao usuario-conquista)

## 3. Modelagem Conceitual

### 3.1 User
Representa a conta principal de autenticacao e dono dos dados financeiros.

Atributos sugeridos:
- id (UUID)
- name
- email (unico)
- passwordHash
- avatarUrl (opcional)
- currency (padrao BRL)
- timezone (padrao America/Sao_Paulo)
- createdAt
- updatedAt

Relacoes:
- 1:N com Transaction
- 1:N com Goal
- 1:N com Subscription
- N:N com FamilyGroup (via FamilyMember)
- 1:N com Alert
- 1:1 com UserScore

### 3.2 Transaction
Representa movimentacao financeira.

Atributos sugeridos:
- id (UUID)
- userId (FK User)
- categoryId (FK Category)
- familyGroupId (FK opcional para contexto compartilhado)
- type (INCOME | EXPENSE | TRANSFER)
- amount (decimal com 2 casas)
- description
- occurredAt (data efetiva da transacao)
- paymentMethod (opcional)
- isRecurring (bool)
- merchant (opcional)
- tags (array opcional)
- createdAt
- updatedAt

Relacoes:
- N:1 com User
- N:1 com Category
- N:1 opcional com FamilyGroup

### 3.3 Category
Classificacao da transacao.

Atributos sugeridos:
- id (UUID)
- userId (FK opcional; null para categoria global do sistema)
- name
- type (INCOME | EXPENSE)
- icon
- color
- keywords (lista para categorizacao automatica)
- isDefault
- createdAt
- updatedAt

Relacoes:
- 1:N com Transaction
- N:1 opcional com User (categoria customizada)

### 3.4 Goal
Objetivo financeiro do usuario.

Atributos sugeridos:
- id (UUID)
- userId (FK User)
- title
- description (opcional)
- targetAmount
- currentAmount
- deadline (opcional)
- status (ACTIVE | ACHIEVED | PAUSED | CANCELLED)
- createdAt
- updatedAt

Relacoes:
- N:1 com User

Regras de negocio:
- progresso = currentAmount / targetAmount
- quando currentAmount >= targetAmount, status pode virar ACHIEVED automaticamente

### 3.5 Subscription
Gasto recorrente identificado ou cadastrado.

Atributos sugeridos:
- id (UUID)
- userId (FK User)
- categoryId (FK Category opcional)
- name
- amount
- frequency (MONTHLY | YEARLY | WEEKLY)
- nextChargeDate
- isActive
- detectionSource (MANUAL | AUTO)
- createdAt
- updatedAt

Relacoes:
- N:1 com User
- N:1 opcional com Category

### 3.6 FamilyGroup
Grupo financeiro familiar.

Atributos sugeridos:
- id (UUID)
- name
- ownerUserId (FK User)
- inviteCode (unico)
- createdAt
- updatedAt

Relacoes:
- 1:N com FamilyMember
- 1:N com Transaction (transacoes compartilhadas)
- N:1 com User (dono do grupo)

### 3.7 FamilyMember
Tabela de associacao entre User e FamilyGroup.

Atributos sugeridos:
- id (UUID)
- familyGroupId (FK FamilyGroup)
- userId (FK User)
- role (OWNER | ADMIN | MEMBER | VIEWER)
- joinedAt

Relacoes:
- N:1 com FamilyGroup
- N:1 com User

Restricoes:
- unico (familyGroupId, userId)

## 4. Relacionamentos (Resumo)

- User 1:N Transaction
- User 1:N Goal
- User 1:N Subscription
- User N:N FamilyGroup via FamilyMember
- Transaction N:1 Category
- FamilyGroup 1:N FamilyMember
- FamilyGroup 1:N Transaction (opcional para compartilhamento)

## 5. Regras de Dominio para Funcionalidades Inteligentes

### 5.1 Analytics
- gasto por categoria no periodo
- media diaria de despesa
- tendencia (comparacao periodo atual vs periodo anterior)
- top categorias de consumo

### 5.2 Prediction
- previsao de saldo com base em:
  - saldo atual
  - media diaria de gasto
  - receitas previstas
  - recorrencias (subscriptions)

Formula inicial simples:
saldoPrevisto = saldoAtual + receitasPrevistas - (mediaGastoDiario * diasRestantes) - recorrenciasRestantes

### 5.3 Alertas Inteligentes
- alerta quando gasto da categoria atingir 80% do orcamento
- alerta de anomalia (gasto acima da media historica)
- alerta de saldo negativo previsto

### 5.4 Perfil Financeiro
Classificacao inicial (regra heuristica):
- Conservador
- Equilibrado
- Impulsivo

Com base em:
- taxa de poupanca
- frequencia de gastos nao essenciais
- variabilidade mensal das despesas

### 5.5 Gamificacao
- pontos por registrar transacoes e cumprir metas
- niveis por acumulacao de pontos
- conquistas por marcos (ex: 30 dias sem saldo negativo)

## 6. Decisoes Tecnicas para a Proxima Etapa

- Banco: PostgreSQL (preferencial para analytics e robustez)
- ORM: Prisma
- IDs: UUID em todas as entidades
- Datas: armazenar em UTC
- Valores monetarios: Decimal (evitar float)
- Indices recomendados:
  - Transaction(userId, occurredAt)
  - Transaction(categoryId, occurredAt)
  - Subscription(userId, nextChargeDate)
  - FamilyMember(familyGroupId, userId) unique

## 7. Estrutura de Modulos de Backend (alto nivel)

- auth
- users
- categories
- transactions
- goals
- subscriptions
- family-groups
- analytics
- prediction
- alerts
- gamification

## 8. Critrios de Pronto da Etapa 1

- Entidades definidas
- Relacionamentos definidos
- Regras iniciais de dominio mapeadas
- Decisoes tecnicas para prisma schema prontas

Status da Etapa 1: CONCLUIDA
Proxima etapa: Etapa 2 - Banco de dados com Prisma schema e migration inicial.
