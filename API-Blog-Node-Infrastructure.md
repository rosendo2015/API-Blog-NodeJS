# Infraestrutura - API Blog Node.js

## 🐳 Docker e PostgreSQL

- Usar **Docker Compose** para subir o banco PostgreSQL localmente.
- Exemplo de `docker-compose.yml`:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15
    container_name: blog_postgres
    restart: always
    environment:
      POSTGRES_USER: blog_user
      POSTGRES_PASSWORD: blog_pass
      POSTGRES_DB: blog_db
    ports:
      - "5433:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
```
