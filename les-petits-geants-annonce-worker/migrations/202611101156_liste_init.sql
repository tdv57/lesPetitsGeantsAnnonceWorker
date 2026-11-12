CREATE TABLE IF NOT EXISTS user_liste (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_hash    TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS dossier_liste (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES user_liste(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(name) >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, name),   
  UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS image_liste (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  dossier_id INTEGER NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES user_liste(id) ON DELETE CASCADE,
  FOREIGN KEY (dossier_id, user_id) REFERENCES dossier_liste(id, user_id) ON DELETE CASCADE
);

CREATE INDEX  IF NOT EXISTS idx_dossier_liste_user  ON dossier_liste(user_id);
CREATE INDEX  IF NOT EXISTS idx_image_liste_dossier ON image_liste(dossier_id);
CREATE INDEX  IF NOT EXISTS idx_image_liste_user    ON image_liste(user_id);


INSERT INTO user_liste (id, phone_hash) VALUES
  (1, 'ea3ab45b96efad6187b26bc702838d82da88c1264ff7b6eed427af0475017437'), -- 0612345678
  (2, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'); 

INSERT INTO dossier_liste (id, user_id, name) VALUES
  (1, 1, 'Vacances'),
  (2, 1, 'Anniversaire'),
  (3, 2, 'Dossier de l''autre utilisateur');

INSERT INTO image_liste (id, user_id, dossier_id, code) VALUES
  (1, 1, 1, '00000000-0000-4000-8000-000000000001'),
  (2, 1, 1, '00000000-0000-4000-8000-000000000002'),
  (3, 1, 2, '00000000-0000-4000-8000-000000000003'),
  (4, 2, 3, '00000000-0000-4000-8000-000000000004');