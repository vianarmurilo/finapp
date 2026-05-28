const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const email = 'vianarmurilo@gmail.com';
    await client.query('UPDATE "User" SET role = $1 WHERE email = $2', ['ADMIN', email]);
    const { rows } = await client.query('SELECT id, email, role FROM "User" WHERE email = $1 LIMIT 1', [email]);
    console.log(JSON.stringify({ exists: rows.length > 0, email: rows[0]?.email, role_final: rows[0]?.role }, null, 2));
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
