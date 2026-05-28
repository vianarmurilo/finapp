const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const exclusiveEmail = (process.argv[2] || 'murilo@gmail.com').toLowerCase();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(
      'UPDATE "User" SET role = $1, "updatedAt" = NOW() WHERE role = $2 AND lower(email) <> $3',
      ['USER', 'ADMIN', exclusiveEmail],
    );

    const { rows } = await client.query(
      'SELECT email, role FROM "User" ORDER BY email',
    );

    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
