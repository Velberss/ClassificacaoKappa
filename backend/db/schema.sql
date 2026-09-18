-- Tabela de Usuários (Avaliadores)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Comentários (300 comentários importados)
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id INTEGER UNIQUE NOT NULL,     -- id_anotacao (1-300)
  youtube_comment_id TEXT,
  youtube_video_id TEXT,
  period TEXT CHECK(period IN ('antes', 'depois')),
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Anotações (Respostas de cada avaliador)
CREATE TABLE IF NOT EXISTS annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  label TEXT CHECK(label IN ('Favorável', 'Contrário', 'Neutro')),
  note TEXT,                                 -- Observação opcional
  is_difficult BOOLEAN DEFAULT 0,            -- Marcar como difícil
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (comment_id) REFERENCES comments(id),
  UNIQUE(user_id, comment_id)               -- Um rótulo por avaliador por comentário
);

-- Tabela de Registro de Ações (Auditoria)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_comment_id ON annotations(comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_period ON comments(period);
CREATE INDEX IF NOT EXISTS idx_comments_annotation_id ON comments(annotation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
