const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { randomUUID } = require('crypto');
require('dotenv').config();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Administrador';

  if (!email || !password) {
    throw new Error('Uso: node scripts/set-admin-user.js <email> <senha> [nome]');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const found = await client.query(
      'SELECT id FROM "User" WHERE email = $1 LIMIT 1',
      [email],
    );

    if (found.rows.length > 0) {
      await client.query(
        'UPDATE "User" SET role = $1, "passwordHash" = $2, "isBlocked" = false, "blockedAt" = NULL, "updatedAt" = NOW() WHERE email = $3',
        ['ADMIN', passwordHash, email],
      );
      console.log('admin_user_updated');
    } else {
      await client.query(
        'INSERT INTO "User" (id, name, email, "passwordHash", role, "isBlocked", currency, timezone, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, false, $6, $7, NOW(), NOW())',
        [randomUUID(), name, email, passwordHash, 'ADMIN', 'BRL', 'America/Sao_Paulo'],
      );
      console.log('admin_user_created');
    }

    const check = await client.query(
      'SELECT email, role, "isBlocked" FROM "User" WHERE email = $1 LIMIT 1',
      [email],
    );

    console.log(JSON.stringify(check.rows[0], null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
