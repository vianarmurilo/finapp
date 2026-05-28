const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '19271710',
    database: 'postgres',
  });

  await client.connect();

  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'finmind_ai'");

  if (exists.rowCount === 0) {
    await client.query('CREATE DATABASE finmind_ai');
    console.log('DB_CREATED');
  } else {
    console.log('DB_EXISTS');
  }

  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
