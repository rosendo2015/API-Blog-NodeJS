/**
 * Envia uma resposta HTTP padronizada em formato JSON.
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} data
 */
export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(data));
}

