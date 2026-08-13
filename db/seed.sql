INSERT INTO songs (title, artist, genre) VALUES
  ('Redbone', 'Childish Gambino', 'FUNK'),
  ('Sunflower', 'Post Malone', 'POP'),
  ('The Less I Know The Better', 'Tame Impala', 'INDIE'),
  ('HUMBLE.', 'Kendrick Lamar', 'HIP-HOP'),
  ('Kiss Of Life', 'Sade', 'RNB'),
  ('Spring Day', 'BTS', 'KPOP'),
  ('Everlong', 'Foo Fighters', 'ROCK'),
  ('Weightless', 'Marconi Union', 'OTHER')
ON CONFLICT DO NOTHING;
