# Projeto: API HTTP de Blog em Node.js

## 🎯 Objetivo

Construir uma API HTTP em Node.js capaz de:

- Receber ideias de posts.
- Usar IA para gerar título e conteúdo em Markdown.
- Persistir rascunhos em PostgreSQL.
- Controlar fluxo de rascunho → aprovação → publicação → rejeição.
- Expor endpoints para criação, listagem, busca e gerenciamento de posts.

---

## 📐 Estrutura e Regras

- Usar **Node.js nativo** (sem Express, Fastify ou NestJS).
- Responder sempre em **JSON** com `Content-Type: application/json`.
- Persistência em **PostgreSQL**.
- Separar responsabilidades: camada HTTP, regras de negócio, persistência, integração com IA.
- Não publicar automaticamente posts recém-criados pela IA.
- Rascunhos não são considerados publicados.
- Posts rejeitados não são considerados publicados.

---

## 🗄️ Modelo de Post

Cada registro na tabela `posts` deve conter:

- `id`: identificador único (`nanoid`).
- `title`: título gerado pela IA.
- `content`: conteúdo em Markdown.
- `created_at`: data de criação.
- `approved_at`: data de aprovação (quando existir).
- `published_at`: data de publicação (quando existir).
- `rejected_at`: data de rejeição (quando existir).

---

## 🤖 Integração com IA

- Serviço responsável por gerar rascunho a partir de uma ideia.
- Deve retornar:
  - `title`
  - `content` (em Markdown, português brasileiro, com introdução, desenvolvimento e conclusão).
- Validar resposta da IA com **zod** antes de persistir.

---

## 🌐 Endpoints Obrigatórios

### `GET /posts`

Lista posts públicos:

- `published_at` definido e <= data atual.
- `approved_at` definido.
- `rejected_at` nulo.

### `GET /posts?include=all`

Lista todos os posts (rascunhos, rejeitados e publicados).

### `GET /posts/:id`

Busca post público pelo ID.

- Retorna 404 se não existir ou não estiver público.

### `POST /posts/draft`

Cria rascunho via IA.

- Body: `{ "idea": "..." }`
- Campos `published_at`, `approved_at`, `rejected_at` iniciam como `null`.

### `PATCH /posts/:id/approve`

Aprova e publica post.

- Define `approved_at` e `published_at` com data atual.
- `rejected_at` volta a `null`.

### `DELETE /posts/:id/reject`

Rejeita post.

- Define `rejected_at` com data atual.
- Remove `approved_at` e `published_at`.

---

## 📑 Documentação

- Disponibilizar **Swagger/OpenAPI** descrevendo endpoints, parâmetros, schemas e respostas.

---

## 🧪 Testes

Cobrir:

- Roteador HTTP.
- Leitura de corpo JSON.
- Operações do repositório de posts.
- Fluxo de criação de rascunho.
- Listagem pública.
- Busca por post inexistente.
- Aprovação e rejeição.
- Disponibilização da documentação da API.

---

## ⚙️ Infraestrutura Local

- PostgreSQL em container (Docker Compose).
- Arquivo `.env.example` com variáveis necessárias.
- Ferramentas sugeridas:
  - `pg` → conexão PostgreSQL.
  - `postgrator` → migrations.
  - `zod` → validação.
  - `nanoid` → IDs únicos.
  - `supertest` → testes end-to-end.

---

## 📜 Diretrizes Técnicas

- Todas as respostas e perguntas devem ser feitas em português brasileiro.
- Não usar frameworks HTTP.
- Usar status HTTP coerentes.
- Não armazenar chaves de serviços externos no repositório.
- Encerrar conexões corretamente.
- Testes devem rodar de forma automatizada.
