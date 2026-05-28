const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const email = 'vianarmurilo@gmail.com';
    const { rows } = await client.query('SELECT id, email, role FROM "User" WHERE email = $1 LIMIT 1', [email]);
    if (rows.length === 0) {
      console.log(JSON.stringify({ exists: false, email }));
    } else {
      console.log(JSON.stringify({ exists: true, email: rows[0].email, role: rows[0].role }, null, 2));
    }
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
