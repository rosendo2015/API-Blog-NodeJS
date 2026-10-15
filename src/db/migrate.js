import Postgrator from 'postgrator';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile?.();
} catch {
  // Ignora se o arquivo .env no existir
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgres://blog_user:blog_pass@localhost:5433/blog_db';

/**
 * Cria e configura a instncia do Postgrator.
 * @param {pg.Client} client
 * @returns {Postgrator}
 */
export function createPostgrator(client) {
  const migrationPattern = path.resolve(__dirname, '../../migrations/*').replaceAll('\\', '/');
  return new Postgrator({
    migrationPattern,
    driver: 'pg',
    database: client.database,
    schemaTable: 'schemaversion',
    execQuery: (query) => client.query(query),
  });
}

/**
 * Executa as migraes com o Postgrator at a verso desejada (padro 'max').
 * @param {string} [targetVersion='max']
 * @returns {Promise<any[]>}
 */
export async function runMigrations(targetVersion = 'max') {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const postgrator = createPostgrator(client);
    const appliedMigrations = await postgrator.migrate(targetVersion);

    if (appliedMigrations.length === 0) {
      console.log('Nenhuma migrao pendente. O banco de dados j est atualizado.');
    } else {
      console.log(`Sucesso: ${appliedMigrations.length} migrao(es) aplicada(s):`);
      for (const m of appliedMigrations) {
        console.log(` - [${m.action.toUpperCase()}] ${m.filename}`);
      }
    }

    return appliedMigrations;
  } catch (error) {
    console.error('Erro ao executar migraes:', error);
    if (error.appliedMigrations) {
      console.error('Migraes aplicadas antes da falha:', error.appliedMigrations);
    }
    throw error;
  } finally {
    await client.end();
  }
}

// Permite execuo direta via terminal: node src/db/migrate.js [verso]
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const target = process.argv[2] || 'max';
  runMigrations(target)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
