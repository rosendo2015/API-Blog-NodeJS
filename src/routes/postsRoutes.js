import { sendJson } from '../utils/httpHelper.js';
import { generateDraftFromIdea, ideaInputSchema } from '../services/aiService.js';
import * as postsRepository from '../repositories/postsRepository.js';

/**
 * Trata as rotas do mdulo de posts.
 * Retorna true se a rota foi atendida, ou false caso no seja uma rota de posts.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @returns {Promise<boolean>}
 */
export async function handlePostsRoutes(req, res, url) {
  const method = req.method || 'GET';
  const pathname = url.pathname;

  // 1. POST /posts/draft - Cria rascunho via IA
  if (method === 'POST' && pathname === '/posts/draft') {
    try {
      const parsedBody = ideaInputSchema.safeParse(req.body);
      if (!parsedBody.success) {
        sendJson(res, 400, {
          error: 'Bad Request',
          message: 'Dados invlidos na requisio.',
          details: parsedBody.error.flatten().fieldErrors
        });
        return true;
      }

      const { idea } = parsedBody.data;
      const generatedPost = await generateDraftFromIdea(idea);
      const post = await postsRepository.createDraft(generatedPost);

      sendJson(res, 201, {
        message: 'Rascunho criado com sucesso.',
        post
      });
      return true;
    } catch (err) {
      console.error('Erro ao gerar rascunho:', err);
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Falha ao gerar rascunho com IA.'
      });
      return true;
    }
  }

  // 2. GET /posts (e GET /posts?include=all)
  if (method === 'GET' && pathname === '/posts') {
    try {
      const includeAll = url.searchParams.get('include') === 'all';
      const posts = includeAll
        ? await postsRepository.findAllPosts()
        : await postsRepository.findPublicPosts();

      sendJson(res, 200, { posts });
      return true;
    } catch (err) {
      console.error('Erro ao listar posts:', err);
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Falha ao buscar posts no banco de dados.'
      });
      return true;
    }
  }

  // 3. PATCH /posts/:id/approve - Aprova e publica post
  const approveMatch = pathname.match(/^\/posts\/([^/]+)\/approve$/);
  if (method === 'PATCH' && approveMatch) {
    try {
      const id = approveMatch[1];
      const updatedPost = await postsRepository.approvePost(id);

      if (!updatedPost) {
        sendJson(res, 404, {
          error: 'Not Found',
          message: 'Post no encontrado para aprovao.'
        });
        return true;
      }

      sendJson(res, 200, {
        message: 'Post aprovado e publicado com sucesso.',
        post: updatedPost
      });
      return true;
    } catch (err) {
      console.error('Erro ao aprovar post:', err);
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Falha ao aprovar post.'
      });
      return true;
    }
  }

  // 4. DELETE /posts/:id/reject - Rejeita post
  const rejectMatch = pathname.match(/^\/posts\/([^/]+)\/reject$/);
  if (method === 'DELETE' && rejectMatch) {
    try {
      const id = rejectMatch[1];
      const updatedPost = await postsRepository.rejectPost(id);

      if (!updatedPost) {
        sendJson(res, 404, {
          error: 'Not Found',
          message: 'Post no encontrado para rejeio.'
        });
        return true;
      }

      sendJson(res, 200, {
        message: 'Post rejeitado com sucesso.',
        post: updatedPost
      });
      return true;
    } catch (err) {
      console.error('Erro ao rejeitar post:', err);
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Falha ao rejeitar post.'
      });
      return true;
    }
  }

  // 5. GET /posts/:id - Busca post pblico pelo ID
  const getByIdMatch = pathname.match(/^\/posts\/([^/]+)$/);
  if (method === 'GET' && getByIdMatch) {
    const id = getByIdMatch[1];

    // Ignora se for a palavra reservada 'draft'
    if (id === 'draft') return false;

    try {
      const post = await postsRepository.findPublicPostById(id);

      if (!post) {
        sendJson(res, 404, {
          error: 'Not Found',
          message: 'Post no encontrado ou no est pblico.'
        });
        return true;
      }

      sendJson(res, 200, { post });
      return true;
    } catch (err) {
      console.error('Erro ao buscar post por ID:', err);
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Falha ao buscar post por ID.'
      });
      return true;
    }
  }

  return false;
}

