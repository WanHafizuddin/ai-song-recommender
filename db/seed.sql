-- Starter + expanded catalog (5 per genre). Idempotent: only inserts
-- (title, artist) pairs not already present, so re-running never duplicates
-- rows. `npm run enrich` fills energy + mood tags for newly added songs.
INSERT INTO songs (title, artist, genre)
SELECT v.title, v.artist, v.genre
FROM (VALUES
  -- FUNK
  ('Redbone', 'Childish Gambino', 'FUNK'),
  ('Get Lucky', 'Daft Punk', 'FUNK'),
  ('Uptown Funk', 'Mark Ronson', 'FUNK'),
  ('September', 'Earth, Wind & Fire', 'FUNK'),
  ('Superstition', 'Stevie Wonder', 'FUNK'),
  -- POP
  ('Sunflower', 'Post Malone', 'POP'),
  ('Blinding Lights', 'The Weeknd', 'POP'),
  ('Levitating', 'Dua Lipa', 'POP'),
  ('As It Was', 'Harry Styles', 'POP'),
  ('Shake It Off', 'Taylor Swift', 'POP'),
  -- INDIE
  ('The Less I Know The Better', 'Tame Impala', 'INDIE'),
  ('Do I Wanna Know?', 'Arctic Monkeys', 'INDIE'),
  ('Electric Feel', 'MGMT', 'INDIE'),
  ('Midnight City', 'M83', 'INDIE'),
  ('Skinny Love', 'Bon Iver', 'INDIE'),
  -- HIP-HOP
  ('HUMBLE.', 'Kendrick Lamar', 'HIP-HOP'),
  ('Sicko Mode', 'Travis Scott', 'HIP-HOP'),
  ('Money Trees', 'Kendrick Lamar', 'HIP-HOP'),
  ('Passionfruit', 'Drake', 'HIP-HOP'),
  ('Mask Off', 'Future', 'HIP-HOP'),
  -- RNB
  ('Kiss Of Life', 'Sade', 'RNB'),
  ('Adorn', 'Miguel', 'RNB'),
  ('Best Part', 'Daniel Caesar', 'RNB'),
  ('Cranes in the Sky', 'Solange', 'RNB'),
  ('Nights', 'Frank Ocean', 'RNB'),
  -- KPOP
  ('Spring Day', 'BTS', 'KPOP'),
  ('Dynamite', 'BTS', 'KPOP'),
  ('How You Like That', 'BLACKPINK', 'KPOP'),
  ('God''s Menu', 'Stray Kids', 'KPOP'),
  ('Next Level', 'aespa', 'KPOP'),
  -- ROCK
  ('Everlong', 'Foo Fighters', 'ROCK'),
  ('Bohemian Rhapsody', 'Queen', 'ROCK'),
  ('Mr. Brightside', 'The Killers', 'ROCK'),
  ('Seven Nation Army', 'The White Stripes', 'ROCK'),
  ('Smells Like Teen Spirit', 'Nirvana', 'ROCK'),
  -- OTHER (ambient / electronic / classical)
  ('Weightless', 'Marconi Union', 'OTHER'),
  ('Clair de Lune', 'Claude Debussy', 'OTHER'),
  ('Strobe', 'deadmau5', 'OTHER'),
  ('Teardrop', 'Massive Attack', 'OTHER'),
  ('Intro', 'The xx', 'OTHER')
) AS v(title, artist, genre)
WHERE NOT EXISTS (
  SELECT 1 FROM songs s WHERE s.title = v.title AND s.artist = v.artist
);
