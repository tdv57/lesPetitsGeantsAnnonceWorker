CREATE TABLE annonces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  commentaire TEXT NOT NULL DEFAULT '',
  redirection_link TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO annonces (code, url, media_type, commentaire, redirection_link) 
        VALUES (
            'catalogue_petits_geants.png',
            'https://pub-9b12e0dc1c364dcb9166888391912649.r2.dev/catalogue_petits_geants.png',
            'IMAGE',
            'Les Petits Géants vous propose de voir ses articles en boutique en cliquant sur le catalogue ci-dessous',
            'https://www.calameo.com/read/0057501980d61bdd316e2'
        );