import { nanoid } from 'nanoid';
import { query } from '../db/index.js';

/**
 * Cria um rascunho de post gerado por IA no banco de dados.
 * published_at, approved_at e rejected_at iniciam explicitamente como null.
 * @param {{ title: string, content: string }} data
 * @returns {Promise<any>}
 */
export async function createDraft({ title, content }) {
  const id = nanoid();
  const sql = `
    INSERT INTO posts (id, title, content, created_at, approved_at, published_at, rejected_at)
    VALUES ($1, $2, $3, NOW(), NULL, NULL, NULL)
    RETURNING *;
  `;
  const result = await query(sql, [id, title, content]);
  return result.rows[0];
}

/**
 * Lista posts pblicos:
 * - published_at definido e <= data atual
 * - approved_at definido
 * - rejected_at nulo
 * @returns {Promise<any[]>}
 */
export async function findPublicPosts() {
  const sql = `
    SELECT id, title, content, created_at, approved_at, published_at, rejected_at
    FROM posts
    WHERE published_at IS NOT NULL
      AND published_at <= NOW()
      AND approved_at IS NOT NULL
      AND rejected_at IS NULL
    ORDER BY published_at DESC;
  `;
  const result = await query(sql);
  return result.rows;
}

/**
 * Lista todos os posts (rascunhos, rejeitados e publicados).
 * @returns {Promise<any[]>}
 */
export async function findAllPosts() {
  const sql = `
    SELECT id, title, content, created_at, approved_at, published_at, rejected_at
    FROM posts
    ORDER BY created_at DESC;
  `;
  const result = await query(sql);
  return result.rows;
}

/**
 * Busca post pblico pelo ID.
 * Retorna null se no existir ou no for pblico.
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function findPublicPostById(id) {
  const sql = `
    SELECT id, title, content, created_at, approved_at, published_at, rejected_at
    FROM posts
    WHERE id = $1
      AND published_at IS NOT NULL
      AND published_at <= NOW()
      AND approved_at IS NOT NULL
      AND rejected_at IS NULL;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Busca qualquer post pelo ID (independente de status).
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function findPostById(id) {
  const sql = `
    SELECT id, title, content, created_at, approved_at, published_at, rejected_at
    FROM posts
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Aprova e publica um post:
 * - Define approved_at e published_at com a data atual.
 * - rejected_at volta a ser null.
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function approvePost(id) {
  const sql = `
    UPDATE posts
    SET approved_at = NOW(),
        published_at = NOW(),
        rejected_at = NULL
    WHERE id = $1
    RETURNING *;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Rejeita um post:
 * - Define rejected_at com a data atual.
 * - Remove approved_at e published_at (define como null).
 * @param {string} id
 * @returns {Promise<any | null>}
 */
export async function rejectPost(id) {
  const sql = `
    UPDATE posts
    SET rejected_at = NOW(),
        approved_at = NULL,
        published_at = NULL
    WHERE id = $1
    RETURNING *;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

