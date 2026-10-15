-- ============================================================
--  MIGRAÇÃO 0001 — estrutura do banco (Cloudflare D1 / SQLite)
--  Cria as tabelas de produtos e de configurações da loja.
-- ============================================================

CREATE TABLE IF NOT EXISTS produtos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL,
  descricao     TEXT    NOT NULL DEFAULT '',
  preco         REAL    NOT NULL DEFAULT 0,
  categoria     TEXT    NOT NULL DEFAULT 'Geral',
  imagem        TEXT,                        -- endereço da foto (ex.: /imagens/produtos/foto.jpg)
  ativo         INTEGER NOT NULL DEFAULT 1,  -- 1 = aparece no catálogo, 0 = oculto
  demo          INTEGER NOT NULL DEFAULT 0,  -- 1 = produto de demonstração (exemplo editável)
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_nome      ON produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo     ON produtos (ativo);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT ''
);

-- Configurações iniciais da loja.
-- Estes valores são apenas de exemplo e devem ser trocados
-- no painel administrativo (aba "Configurações da loja").
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES
  ('nome_loja',       'Minha Loja'),
  ('whatsapp',        ''),
  ('moeda',           'BRL'),
  ('mensagem_padrao', 'Olá! Tenho interesse neste produto: {produto} — {preco}. Poderia me dar mais informações?');
