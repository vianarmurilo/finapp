# Seguranca do Sistema - FinMind AI+

## Status atual

O sistema possui uma base de seguranca funcional para um projeto academico, com autenticacao JWT, hash de senha, validacao de variaveis de ambiente e protecao de rotas administrativas.

## Controles implementados

- Senhas armazenadas com hash usando bcrypt no backend.
- Tokens JWT assinados com `JWT_SECRET` e prazo configuravel por `JWT_EXPIRES_IN`.
- Validacao de dados de entrada com Zod nas rotas de autenticacao.
- Protecao de rotas administrativas com `authMiddleware` e `requireAdminRole`.
- Restricao adicional para o administrador exclusivo por e-mail configurado em ambiente.
- Armazenamento local seguro do token no app Flutter via `flutter_secure_storage`.
- Validacao obrigatoria das variaveis de ambiente no backend.
- Uso de `helmet` na API para headers basicos de seguranca.

## Pontos de atencao

- O CORS ainda esta aberto por padrao no backend e deve ser restringido para dominios confiaveis em producao.
- O `JWT_SECRET` precisa ser forte e longo; a validacao atual exige no minimo 32 caracteres.
- O acesso de admin usa role JWT mais e-mail exclusivo, o que evita uso indevido do painel administrativo.
- O front-end nao guarda senha localmente; so persiste token e dados de sessao.

## O que mostrar ao professor

Você pode explicar assim: a aplicacao nao esta "sem seguranca"; ela ja protege login, senha e rotas privilegiadas, mas ainda tem ajuste de producao recomendado no CORS e na operacao do ambiente.

## Referencias tecnicas

- Autenticacao e hash de senha: [backend/src/services/auth.service.ts](../../backend/src/services/auth.service.ts)
- Middleware de autenticacao e admin: [backend/src/middlewares/auth.middleware.ts](../../backend/src/middlewares/auth.middleware.ts)
- Validacao de ambiente: [backend/src/config/env.ts](../../backend/src/config/env.ts)
- Headers basicos e middlewares: [backend/src/app.ts](../../backend/src/app.ts)
- Armazenamento seguro no app: [lib/core/network/token_storage.ts](../../lib/core/network/token_storage.ts)