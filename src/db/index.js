import pg from 'pg';

// Carrega variveis de ambiente nativamente se o arquivo .env existir
try {
  process.loadEnvFile?.();
} catch {
  // Ignora se o arquivo .env no existir no ambiente (ex: containers ou CI)
}

const connectionString = process.env.DATABASE_URL || 'postgres://blog_user:blog_pass@localhost:5433/blog_db';

/**
 * Pool de conexes com PostgreSQL
 */
export const pool = new pg.Pool({
  connectionString
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente ocioso do PostgreSQL:', err);
});

/**
 * Executa uma consulta SQL no pool de conexes.
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<pg.QueryResult<any>>}
 */
export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Obtm um cliente dedicado do pool (til para transaes).
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Encerra todas as conexes ativas no pool.
 */
export async function closePool() {
  await pool.end();
}

