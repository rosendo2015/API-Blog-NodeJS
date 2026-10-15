import http from 'node:http';
import path from 'node:path';
import { sendJson } from './utils/httpHelper.js';
import { handlePostsRoutes } from './routes/postsRoutes.js';
import { closePool } from './db/index.js';

try {
  process.loadEnvFile?.();
} catch {
  // Ignora se .env no estiver presente
}

/**
 * L e converte o corpo da requisio para JSON.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
export async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawData = '';

    req.on('data', chunk => {
      rawData += chunk;

      // Limite de segurana: 1MB para evitar consumo excessivo de memria
      if (rawData.length > 1e6) {
        req.destroy();
        const err = new Error('Corpo da requisio excede o limite mximo permitido (1MB).');
        err.statusCode = 413;
        reject(err);
      }
    });

    req.on('end', () => {
      if (!rawData.trim()) {
        return resolve({});
      }

      try {
        const parsed = JSON.parse(rawData);
        resolve(parsed);
      } catch {
        const err = new Error('JSON invlido no corpo da requisio.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

export { sendJson };

/**
 * Cria e configura a instncia do servidor HTTP nativo.
 * @returns {import('node:http').Server}
 */
export function createServer() {
  return http.createServer(async (req, res) => {
    // Configura a leitura de JSON no corpo da requisio
    const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const contentType = req.headers['content-type'] || '';

    if (methodsWithBody.includes(req.method || '') || contentType.includes('application/json')) {
      try {
        req.body = await parseJsonBody(req);
      } catch (err) {
        const statusCode = err.statusCode || 500;
        return sendJson(res, statusCode, {
          error: statusCode === 400 ? 'Bad Request' : statusCode === 413 ? 'Payload Too Large' : 'Internal Server Error',
          message: err.message || 'Erro ao processar corpo da requisio.'
        });
      }
    } else {
      req.body = {};
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const { pathname } = parsedUrl;

    // Rota de status/healthcheck
    if (pathname === '/' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        message: 'API Blog Node.js online'
      });
    }

    // Rota para testar a leitura do corpo JSON
    if (pathname === '/echo' && req.method === 'POST') {
      return sendJson(res, 200, {
        message: 'JSON recebido com sucesso',
        received: req.body
      });
    }

    // Delegao para as rotas do mdulo de posts
    const handled = await handlePostsRoutes(req, res, parsedUrl);
    if (handled) return;

    // Rota padro 404
    return sendJson(res, 404, {
      error: 'Not Found',
      message: 'Rota no encontrada.'
    });
  });
}

export const server = createServer();

const PORT = Number(process.env.PORT) || 3000;

// Inicia o servidor se executado diretamente via terminal
const isDirectExecution = process.argv[1] && (
  path.resolve(process.argv[1]) === import.meta.filename
);

if (isDirectExecution) {
  server.listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
  });

  // Encerramento correto das conexes (HTTP e PostgreSQL)
  const gracefulShutdown = async (signal) => {
    console.log(`\nRecebido ${signal}. Encerrando servidor e conexes...`);
    server.close(async () => {
      try {
        await closePool();
        console.log('Pool de conexes do PostgreSQL encerrado com sucesso.');
      } catch (poolErr) {
        console.error('Erro ao encerrar pool do PostgreSQL:', poolErr);
      }
      console.log('Servidor encerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
