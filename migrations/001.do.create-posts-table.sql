CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(36) PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ
);

-- Índice parcial para otimizar busca de posts públicos
CREATE INDEX IF NOT EXISTS idx_posts_public 
ON posts (published_at, approved_at, rejected_at)
WHERE published_at IS NOT NULL AND approved_at IS NOT NULL AND rejected_at IS NULL;

