import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { server } from '../src/server.js';
import { closePool } from '../src/db/index.js';

describe('Testes E2E com Supertest - API Blog Node.js', () => {
  after(async () => {
    // Encerra corretamente o pool de conexes com o banco de dados
    await closePool();
  });

  describe('1. Roteador HTTP e Leitura de Corpo JSON', () => {
    it('deve responder 200 na rota raz GET /', async () => {
      const response = await request(server)
        .get('/')
        .expect('Content-Type', /application\/json/)
        .expect(200);

      assert.equal(response.body.status, 'ok');
      assert.equal(response.body.message, 'API Blog Node.js online');
    });

    it('deve realizar a leitura correta de JSON no POST /echo', async () => {
      const payload = { testKey: 'valorDeTeste', number: 42 };

      const response = await request(server)
        .post('/echo')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect('Content-Type', /application\/json/)
        .expect(200);

      assert.deepEqual(response.body.received, payload);
    });

    it('deve retornar 400 Bad Request ao enviar JSON invlido', async () => {
      const response = await request(server)
        .post('/echo')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": ')
        .expect('Content-Type', /application\/json/)
        .expect(400);

      assert.equal(response.body.error, 'Bad Request');
      assert.match(response.body.message, /JSON invlido/i);
    });

    it('deve retornar 404 Not Found para rotas no mapeadas', async () => {
      const response = await request(server)
        .get('/rota-inexistente')
        .expect('Content-Type', /application\/json/)
        .expect(404);

      assert.equal(response.body.error, 'Not Found');
    });
  });

  describe('2. POST /posts/draft - Criao de Rascunho com IA', () => {
    it('deve retornar 400 se a ideia no for enviada ou for muito curta', async () => {
      const response = await request(server)
        .post('/posts/draft')
        .send({ idea: 'a' })
        .expect('Content-Type', /application\/json/)
        .expect(400);

      assert.equal(response.body.error, 'Bad Request');
      assert.ok(response.body.details?.idea);
    });

    it('deve criar um rascunho com IA e persistir no PostgreSQL com campos no publicados', async () => {
      const response = await request(server)
        .post('/posts/draft')
        .send({ idea: 'Design Patterns e Arquitetura Limpa em JavaScript' })
        .expect('Content-Type', /application\/json/)
        .expect(201);

      const post = response.body.post;
      assert.ok(post.id, 'O post deve possuir um id');
      assert.ok(post.title, 'O post deve possuir ttulo gerado');
      assert.ok(post.content, 'O post deve possuir contedo em Markdown');
      assert.match(post.content, /Introdu[çc][ãa]o/i);
      assert.match(post.content, /Desenvolvimento/i);
      assert.match(post.content, /Conclus[ãa]o/i);

      // Regra de negcio: rascunhos no podem nascer publicados ou rejeitados
      assert.equal(post.approved_at, null);
      assert.equal(post.published_at, null);
      assert.equal(post.rejected_at, null);
    });
  });

  describe('3. Fluxo Completo: Rascunho -> Aprovao -> Publicao -> Rejeio', () => {
    let postId;

    // ETAPA 1: RASCUNHO
    it('ETAPA 1 (RASCUNHO): deve criar um rascunho com status no publicado e no aprovado', async () => {
      const response = await request(server)
        .post('/posts/draft')
        .send({ idea: 'Ciclo de vida de posts e automao de publicao' })
        .expect(201);

      const post = response.body.post;
      postId = post.id;
      assert.ok(postId);
      assert.ok(post.created_at, 'created_at deve estar preenchido');
      assert.equal(post.approved_at, null, 'approved_at deve ser null em rascunho');
      assert.equal(post.published_at, null, 'published_at deve ser null em rascunho');
      assert.equal(post.rejected_at, null, 'rejected_at deve ser null em rascunho');
    });

    it('ETAPA 1 (RASCUNHO): rascunho no deve ser visvel na listagem pblica GET /posts', async () => {
      const response = await request(server).get('/posts').expect(200);
      const isVisible = response.body.posts.some((p) => p.id === postId);
      assert.equal(isVisible, false, 'Rascunho no deve aparecer em GET /posts');
    });

    it('ETAPA 1 (RASCUNHO): rascunho deve ser retornado em GET /posts?include=all', async () => {
      const response = await request(server).get('/posts?include=all').expect(200);
      const found = response.body.posts.find((p) => p.id === postId);
      assert.ok(found, 'Rascunho deve estar na listagem geral include=all');
      assert.equal(found.approved_at, null);
      assert.equal(found.published_at, null);
      assert.equal(found.rejected_at, null);
    });

    it('ETAPA 1 (RASCUNHO): rascunho no pode ser acessado via GET /posts/:id (retorna 404)', async () => {
      const response = await request(server).get(`/posts/${postId}`).expect(404);
      assert.equal(response.body.error, 'Not Found');
    });

    // ETAPA 2: APROVAO E PUBLICAO
    it('ETAPA 2 (APROVAO E PUBLICAO): deve aprovar e publicar o post com PATCH /posts/:id/approve', async () => {
      const response = await request(server)
        .patch(`/posts/${postId}/approve`)
        .expect(200);

      const post = response.body.post;
      assert.equal(post.id, postId);
      assert.ok(post.approved_at, 'approved_at deve ser definido com data atual');
      assert.ok(post.published_at, 'published_at deve ser definido com data atual');
      assert.equal(post.rejected_at, null, 'rejected_at deve ser null');
    });

    it('ETAPA 2 (APROVAO E PUBLICAO): post publicado agora deve aparecer na listagem pblica GET /posts', async () => {
      const response = await request(server).get('/posts').expect(200);
      const post = response.body.posts.find((p) => p.id === postId);
      assert.ok(post, 'Post publicado deve aparecer na listagem pblica');
      assert.ok(post.approved_at);
      assert.ok(post.published_at);
      assert.equal(post.rejected_at, null);
    });

    it('ETAPA 2 (APROVAO E PUBLICAO): post publicado agora responde com sucesso 200 em GET /posts/:id', async () => {
      const response = await request(server).get(`/posts/${postId}`).expect(200);
      assert.equal(response.body.post.id, postId);
      assert.ok(response.body.post.title);
      assert.ok(response.body.post.content);
    });

    // ETAPA 3: REJEIO
    it('ETAPA 3 (REJEIO): deve rejeitar o post publicado com DELETE /posts/:id/reject', async () => {
      const response = await request(server)
        .delete(`/posts/${postId}/reject`)
        .expect(200);

      const post = response.body.post;
      assert.equal(post.id, postId);
      assert.ok(post.rejected_at, 'rejected_at deve ser definido com data atual');
      assert.equal(post.approved_at, null, 'approved_at deve voltar a ser null');
      assert.equal(post.published_at, null, 'published_at deve voltar a ser null');
    });

    it('ETAPA 3 (REJEIO): post rejeitado no deve mais constar na listagem pblica GET /posts', async () => {
      const response = await request(server).get('/posts').expect(200);
      const isVisible = response.body.posts.some((p) => p.id === postId);
      assert.equal(isVisible, false, 'Post rejeitado no pode aparecer na listagem pblica');
    });

    it('ETAPA 3 (REJEIO): post rejeitado deve retornar 404 em GET /posts/:id', async () => {
      const response = await request(server).get(`/posts/${postId}`).expect(404);
      assert.equal(response.body.error, 'Not Found');
    });

    it('ETAPA 3 (REJEIO): post rejeitado deve continuar listado em GET /posts?include=all', async () => {
      const response = await request(server).get('/posts?include=all').expect(200);
      const found = response.body.posts.find((p) => p.id === postId);
      assert.ok(found, 'Post rejeitado deve constar em include=all');
      assert.ok(found.rejected_at);
      assert.equal(found.approved_at, null);
      assert.equal(found.published_at, null);
    });

    // ETAPA 4: TRANSIES COMPLEMENTARES
    it('ETAPA 4 (RE-APROVAO): deve permitir re-aprovar um post previamente rejeitado', async () => {
      const response = await request(server)
        .patch(`/posts/${postId}/approve`)
        .expect(200);

      const post = response.body.post;
      assert.ok(post.approved_at, 'approved_at deve ser redefinido');
      assert.ok(post.published_at, 'published_at deve ser redefinido');
      assert.equal(post.rejected_at, null, 'rejected_at deve voltar a null');

      // Verifica que voltou a ser pblico
      const publicCheck = await request(server).get(`/posts/${postId}`).expect(200);
      assert.equal(publicCheck.body.post.id, postId);
    });

    it('ETAPA 4 (REJEIO DIRETA): deve permitir rejeitar diretamente um rascunho', async () => {
      // Cria novo rascunho
      const draftRes = await request(server)
        .post('/posts/draft')
        .send({ idea: 'Rascunho que ser rejeitado imediatamente' })
        .expect(201);

      const draftId = draftRes.body.post.id;

      // Rejeita direto
      const rejectRes = await request(server)
        .delete(`/posts/${draftId}/reject`)
        .expect(200);

      assert.ok(rejectRes.body.post.rejected_at);
      assert.equal(rejectRes.body.post.approved_at, null);
      assert.equal(rejectRes.body.post.published_at, null);

      // Garante que no  pblico
      await request(server).get(`/posts/${draftId}`).expect(404);
    });

    it('ETAPA 4 (TRATAMENTO DE ERROS): deve retornar 404 para ID inexistente em approve e reject', async () => {
      await request(server)
        .patch('/posts/id_inexistente_123/approve')
        .expect(404);

      await request(server)
        .delete('/posts/id_inexistente_123/reject')
        .expect(404);
    });
  });
});
