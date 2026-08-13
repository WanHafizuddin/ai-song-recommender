CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS songs (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  genre       TEXT,
  energy      SMALLINT CHECK (energy BETWEEN 1 AND 5),
  tags        TEXT[] NOT NULL DEFAULT '{}',
  enriched_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS songs_tags_gin ON songs USING GIN (tags);

CREATE TABLE IF NOT EXISTS mood_queries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  extracted  JSONB,
  results    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mood_queries_user_idx ON mood_queries (user_id, created_at DESC);
