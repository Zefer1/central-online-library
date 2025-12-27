CREATE TABLE IF NOT EXISTS book_ratings (
  id BIGSERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES livros(id) ON DELETE CASCADE,
  user_id INTEGER,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  ip_fingerprint TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_ratings_book ON book_ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_ratings_status ON book_ratings(moderation_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_ratings_user_unique ON book_ratings(book_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_ratings_guest_unique ON book_ratings(book_id, ip_fingerprint) WHERE ip_fingerprint IS NOT NULL;
