# Banco local com Prisma Dev (resolucao da limitacao)

A migration inicial foi aplicada com sucesso usando Prisma Dev local.

Conexao utilizada:
- DATABASE_URL: postgres://postgres:postgres@localhost:51217/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0

Passos para repetir no futuro:
1. Iniciar banco local Prisma Dev:
   npx prisma dev --name finmind-local --port 5432
2. Copiar DATABASE_URL exibida no terminal e atualizar backend/.env.
3. Aplicar migrations:
   npx prisma migrate deploy
4. Gerar client:
   npx prisma generate

Observacao:
- Se as portas mudarem ao reiniciar o Prisma Dev, basta atualizar backend/.env com a nova DATABASE_URL exibida.
