-- pgvector + tsvector setup for CorpMind. Idempotent. Run after `prisma db push`.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED;

CREATE INDEX IF NOT EXISTS dc_embedding_ivfflat
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS dc_tsv_gin ON "DocumentChunk" USING gin (tsv);
CREATE INDEX IF NOT EXISTS dc_tenant_doc ON "DocumentChunk" ("tenantId", "documentId");

ALTER TABLE "PersonaChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS pc_embedding_ivfflat
  ON "PersonaChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS pc_tenant_persona ON "PersonaChunk" ("tenantId", "personaId");
