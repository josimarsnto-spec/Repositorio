// Aplica o schema (db/schema.sql) e o seed de administrador (seeds/seed-admin.sql)
// no banco apontado por DATABASE_URL. Roda como preDeployCommand no Railway,
// antes de cada deploy — por isso é idempotente: só recria o schema se ainda
// não existir (checagem via to_regclass), e o seed já é idempotente por si
// (ON CONFLICT ...).
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query("SELECT to_regclass('identity.tenants') AS exists");
    if (rows[0].exists) {
      console.log('[migrate] Schema já aplicado — pulando db/schema.sql.');
    } else {
      const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
      await client.query(schemaSql);
      console.log('[migrate] Schema aplicado com sucesso.');
    }

    const seedSql = fs.readFileSync(path.join(__dirname, '../seeds/seed-admin.sql'), 'utf8');
    await client.query(seedSql);
    console.log('[migrate] Seed de administrador aplicado com sucesso.');
  } finally {
    await client.end();
  }
}

run()
  .then(() => {
    console.log('[migrate] Concluído.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[migrate] Falhou:', err.message);
    process.exit(1);
  });
