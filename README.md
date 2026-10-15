# 📝 API Blog Node.js

<p align="center">
  <img src="./assets/banner.png" alt="Banner API Blog Node.js com IA" width="100%">
</p>

API HTTP desenvolvida em **Node.js puro (sem frameworks como Express, Fastify ou NestJS)**, com persistência em **PostgreSQL**, controle de migrações via **Postgrator**, geração de conteúdo com **IA**, validação de esquemas com **Zod**, identificadores com **Nanoid** e suíte completa de testes end-to-end com **Supertest**.

---

## 🎯 Objetivo e Funcionalidades

- **Servidor HTTP Nativo:** Utiliza exclusivamente o módulo nativo `node:http`.
- **Parser Nativo de JSON:** Leitura e parsing de stream no corpo das requisições com proteção de tamanho de payload (1MB) e validação de sintaxe (`400 Bad Request`).
- **Geração de Posts com IA:** Recebe ideias de tópicos e gera título e conteúdo estruturado em Markdown (com seções de introdução, desenvolvimento e conclusão).
- **Validação com Zod:** Validação estrita tanto da entrada da requisição quanto do retorno da IA antes da persistência.
- **Ciclo de Vida de Posts:**
  - `Rascunho`: criado via IA; não é público (`published_at`, `approved_at` e `rejected_at` iniciam como `null`).
  - `Aprovação & Publicação`: define `approved_at` e `published_at` com a data atual e torna o post acessível publicamente.
  - `Rejeição`: define `rejected_at` com a data atual e remove status de publicação.
  - `Re-aprovação`: permite re-aprovar posts previamente rejeitados, limpando `rejected_at` de volta para `null`.
- **Persistência Relacional:** Banco de dados PostgreSQL com pool de conexões resiliente (`pg`) e encerramento gracioso (*graceful shutdown*).
- **Migrações Automatizadas:** Versionamento do schema do banco com `postgrator` (suporte a *migrate* e *rollback*).
- **Testes End-to-End:** 100% dos fluxos e regras de negócio cobertos por testes automatizados com `supertest` e o test runner nativo `node:test`.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime:** [Node.js](https://nodejs.org/) (v20+)
- **Módulo HTTP:** Nativo (`node:http`)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) (v15)
- **Driver PostgreSQL:** [`pg`](https://www.npmjs.com/package/pg)
- **Gerenciador de Migrações:** [`postgrator`](https://www.npmjs.com/package/postgrator)
- **Geração de IDs:** [`nanoid`](https://www.npmjs.com/package/nanoid)
- **Validação de Dados:** [`zod`](https://zod.dev/)
- **Testes Automatizados:** [`supertest`](https://www.npmjs.com/package/supertest) e `node:test`
- **Ambiente em Containers:** [Docker](https://www.docker.com/) & Docker Compose

---

## 📂 Estrutura de Diretórios

```plaintext
API-Blog-NodeJS/
├── assets/
│   └── banner.png               # Banner ilustrativo do projeto
├── docker-compose.yml           # Definição do container PostgreSQL
├── migrations/                  # Arquivos de migração SQL (do/undo)
│   ├── 001.do.create-posts-table.sql
│   └── 001.undo.create-posts-table.sql
├── src/
│   ├── db/
│   │   ├── index.js             # Pool de conexões do PostgreSQL (pg)
│   │   └── migrate.js           # Executor programático de migrações (postgrator)
│   ├── repositories/
│   │   └── postsRepository.js   # Operações de banco de dados para posts
│   ├── routes/
│   │   └── postsRoutes.js       # Rotas e controladores do módulo de posts
│   ├── services/
│   │   └── aiService.js         # Integração com IA e validação com Zod
│   ├── utils/
│   │   └── httpHelper.js        # Utilitário para envio de respostas JSON
│   └── server.js                # Servidor HTTP nativo e inicialização
├── tests/
│   └── posts.e2e.test.js        # Testes end-to-end com Supertest
├── .env.example                 # Exemplo de variáveis de ambiente
├── .gitignore                   # Arquivos ignorados pelo Git
├── package.json                 # Dependências e scripts do projeto
└── README.md                    # Documentação do projeto
```

---

## ⚙️ Pré-requisitos

- **Node.js** v20 ou superior instalado.
- **Docker** e **Docker Compose** instalados e em execução.

---

## 🚀 Como Executar o Projeto

### 1. Clonar o Repositório e Instalar Dependências

```bash
git clone <URL_DO_REPOSITORIO>
cd API-Blog-NodeJS
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Configuração padrão no `.env`:

```env
PORT=3000
DATABASE_URL=postgres://blog_user:blog_pass@localhost:5433/blog_db
IA_API_KEY=coloque_sua_chave_aqui
```

> **Nota:** A porta externa padrão mapeada no `docker-compose.yml` é `5433` (mapeada para `5432` no container) para evitar conflitos com outros serviços locais de banco de dados.

### 3. Iniciar o Banco de Dados

Suba o container do PostgreSQL em segundo plano:

```bash
docker compose up -d
```

### 4. Executar as Migrações do Banco

Execute as migrações com o Postgrator para criar as tabelas e índices necessários:

```bash
npm run migrate
```

*(Opcional: para reverter a última migração, execute `npm run migrate:undo`)*.

### 5. Iniciar o Servidor

Modo de desenvolvimento (recarregamento automático com `--watch` nativo do Node):

```bash
npm run dev
```

Modo de produção:

```bash
npm start
```

O servidor estará disponível em: `http://localhost:3000`.

---

## 🔄 Fluxo e Ciclo de Vida do Post

```
               [ Ideia ]
                   │
                   ▼ POST /posts/draft
            ┌──────────────┐
            │   RASCUNHO   │ ◄─── (approved_at: null, published_at: null, rejected_at: null)
            └──────┬───────┘      • Oculto na listagem pública
                   │              • Visível em GET /posts?include=all
                   │              • GET /posts/:id retorna 404
                   │
                   ├── (DELETE /posts/:id/reject) ──┐
                   │                                │
                   ▼ PATCH /posts/:id/approve       │
       ┌────────────────────────┐                   │
       │  APROVADO & PUBLICADO  │                   │
       └───────────┬────────────┘                   │
                   │ • approved_at & published_at   │
                   │ • rejected_at: null            │
                   │ • Listado em GET /posts        │
                   │ • GET /posts/:id retorna 200   │
                   │                                │
                   ▼ DELETE /posts/:id/reject       │
            ┌──────────────┐                        │
            │  REJEITADO   │ ◄──────────────────────┘
            └──────┬───────┘
                   │ • rejected_at preenchido
                   │ • approved_at: null & published_at: null
                   │ • Oculto na listagem pública
                   │ • Visível em GET /posts?include=all
                   │
                   ▼ PATCH /posts/:id/approve
             [ RE-APROVADO ] ──► Volta a ser público
```

---

## 🌐 Documentação dos Endpoints

Todas as respostas da API utilizam `Content-Type: application/json; charset=utf-8`.

### 1. `GET /`
Verifica a disponibilidade da API (*healthcheck*).

- **Resposta (200 OK):**
```json
{
  "status": "ok",
  "message": "API Blog Node.js online"
}
```

---

### 2. `POST /posts/draft`
Gera um rascunho de post utilizando IA a partir de uma ideia.

- **Corpo da Requisição (JSON):**
```json
{
  "idea": "Arquitetura Limpa e microsserviços em Node.js"
}
```

- **Exemplo com cURL:**
```bash
curl -X POST http://localhost:3000/posts/draft \
  -H "Content-Type: application/json" \
  -d '{"idea": "Arquitetura Limpa e microsserviços em Node.js"}'
```

- **Resposta de Sucesso (201 Created):**
```json
{
  "message": "Rascunho criado com sucesso.",
  "post": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "title": "Arquitetura Limpa e microsserviços em Node.js: O Guia Completo e Definitivo",
    "content": "## Introdução\n\nNo cenário atual de tecnologia...",
    "created_at": "2026-10-15T22:30:00.000Z",
    "approved_at": null,
    "published_at": null,
    "rejected_at": null
  }
}
```

- **Resposta de Erro (400 Bad Request):**
```json
{
  "error": "Bad Request",
  "message": "Dados inválidos na requisição.",
  "details": {
    "idea": [
      "A ideia deve ter pelo menos 3 caracteres."
    ]
  }
}
```

---

### 3. `GET /posts`
Lista apenas posts que estão **aprovados e publicados** (`published_at <= NOW()`, `approved_at` preenchido e `rejected_at` nulo).

- **Exemplo com cURL:**
```bash
curl http://localhost:3000/posts
```

- **Resposta (200 OK):**
```json
{
  "posts": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "title": "Arquitetura Limpa e microsserviços em Node.js",
      "content": "## Introdução\n...",
      "created_at": "2026-10-15T22:30:00.000Z",
      "approved_at": "2026-10-15T22:35:00.000Z",
      "published_at": "2026-10-15T22:35:00.000Z",
      "rejected_at": null
    }
  ]
}
```

---

### 4. `GET /posts?include=all`
Lista **todos os posts** registrados no banco de dados, independentemente do status (rascunhos, aprovados e rejeitados).

- **Exemplo com cURL:**
```bash
curl "http://localhost:3000/posts?include=all"
```

- **Resposta (200 OK):** Retorna o array completo com todos os posts.

---

### 5. `GET /posts/:id`
Busca um post pelo identificador único. Apenas posts **públicos** são retornados.

- **Exemplo com cURL:**
```bash
curl http://localhost:3000/posts/V1StGXR8_Z5jdHi6B-myT
```

- **Resposta de Sucesso (200 OK):**
```json
{
  "post": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "title": "Arquitetura Limpa e microsserviços em Node.js",
    "content": "## Introdução\n...",
    "created_at": "2026-10-15T22:30:00.000Z",
    "approved_at": "2026-10-15T22:35:00.000Z",
    "published_at": "2026-10-15T22:35:00.000Z",
    "rejected_at": null
  }
}
```

- **Resposta se o post for rascunho, rejeitado ou não existir (404 Not Found):**
```json
{
  "error": "Not Found",
  "message": "Post não encontrado ou não está público."
}
```

---

### 6. `PATCH /posts/:id/approve`
Aprova e publica o post. Define `approved_at` e `published_at` com a data atual e redefine `rejected_at` para `null`.

- **Exemplo com cURL:**
```bash
curl -X PATCH http://localhost:3000/posts/V1StGXR8_Z5jdHi6B-myT/approve
```

- **Resposta (200 OK):**
```json
{
  "message": "Post aprovado e publicado com sucesso.",
  "post": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "title": "Arquitetura Limpa e microsserviços em Node.js",
    "content": "...",
    "created_at": "2026-10-15T22:30:00.000Z",
    "approved_at": "2026-10-15T22:35:00.000Z",
    "published_at": "2026-10-15T22:35:00.000Z",
    "rejected_at": null
  }
}
```

---

### 7. `DELETE /posts/:id/reject`
Rejeita o post. Define `rejected_at` com a data atual e anula os campos `approved_at` e `published_at`.

- **Exemplo com cURL:**
```bash
curl -X DELETE http://localhost:3000/posts/V1StGXR8_Z5jdHi6B-myT/reject
```

- **Resposta (200 OK):**
```json
{
  "message": "Post rejeitado com sucesso.",
  "post": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "title": "Arquitetura Limpa e microsserviços em Node.js",
    "content": "...",
    "created_at": "2026-10-15T22:30:00.000Z",
    "approved_at": null,
    "published_at": null,
    "rejected_at": "2026-10-15T22:40:00.000Z"
  }
}
```

---

## 🧪 Testes Automatizados

A aplicação conta com uma suíte de testes ponta a ponta (*E2E*) utilizando **Supertest** e o test runner nativo do Node.js (`node:test`).

Para executar toda a suíte de testes:

```bash
npm test
```

### Cobertura dos Testes:
- **Roteador HTTP nativo:** Verificação de rotas, códigos de status e respostas JSON.
- **Parsing de Corpo JSON:** Validação de entradas válidas, tratamento de JSON corrompido (`400`) e rotas não encontradas (`404`).
- **Geração de Rascunhos:** Criação com IA, estrutura de Markdown e verificação dos campos nulos.
- **Ciclo de Vida do Post:**
  - Ocultamento de rascunhos em buscas públicas.
  - Exibição de rascunhos na listagem geral (`?include=all`).
  - Aprovação e publicação com liberação do acesso público.
  - Rejeição e imediata exclusão das consultas públicas.
  - Re-aprovação de posts rejeitados.
  - Rejeição direta de rascunhos.
  - Respostas `404` para tentativas de aprovação/rejeição em IDs inexistentes.
- **Encerramento de Conexões:** Liberação e encerramento seguro do pool PostgreSQL ao término dos testes.

---

## 📜 Licença

Este projeto está sob a licença [ISC](LICENSE).

