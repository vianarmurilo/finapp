# Deploy e Producao - FinMind AI+

## Objetivo

Guia para publicar backend e app com configuracao minima de producao.

## Backend (Node + Prisma)

### Variaveis obrigatorias

Configurar no ambiente de producao:

- NODE_ENV=production
- PORT=3333
- DATABASE_URL=<url postgres de producao>
- JWT_SECRET=<segredo forte, minimo 32 caracteres>
- JWT_EXPIRES_IN=1d

### Build e start

No servidor (ou pipeline):

```bash
cd backend
npm ci
npm run prisma:generate
npm run build
npm run start
```

### Migracoes

Aplicar migracoes antes de subir a API:

```bash
cd backend
npm run prisma:migrate
```

## Banco de dados

- Usar PostgreSQL gerenciado para producao.
- Habilitar backup automatico diario.
- Restringir acesso por IP/rede privada.
- Exigir SSL na conexao quando suportado.

## Seguranca

- Nunca usar JWT_SECRET padrao.
- Nao expor arquivos .env em repositório.
- Habilitar CORS apenas para dominios confiaveis em producao.
- Manter dependencias atualizadas e revisar vulnerabilidades periodicamente.

## Observabilidade minima

- Registrar logs de erro da API (stdout/stderr + centralizacao).
- Monitorar uptime da rota /api/health.
- Monitorar uso de CPU/memoria e tempo de resposta.

## Flutter App

### Android

```bash
flutter build apk --release
```

ou

```bash
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

Publicacao via Xcode/App Store Connect.

## Checklist de Go-live

- Banco com migracoes aplicadas.
- Variaveis de ambiente de producao configuradas.
- Backend respondendo /api/health.
- Login e cadastro funcionando no app release.
- Fluxos criticos validados:
  - criar/editar/excluir transacao
  - criar/editar/excluir meta
  - criar/entrar em grupo familiar
  - dashboard e alertas principais
- Plano de rollback definido (versao anterior da API e app).
