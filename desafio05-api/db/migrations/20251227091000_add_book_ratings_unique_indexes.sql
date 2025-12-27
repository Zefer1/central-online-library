CREATE UNIQUE INDEX IF NOT EXISTS idx_book_ratings_guest_unique_all ON book_ratings (book_id, ip_fingerprint);
