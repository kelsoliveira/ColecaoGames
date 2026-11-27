import "server-only";
import { createClient, type Client, type InArgs, type InStatement } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { COLLECTIONS, COLLECTIONS_VERSION, FIXES, FIXES_VERSION, SAGA_BY_TITLE, SAGA_VERSION, SEED_GAMES, SEED_VERSION } from "./seed";

// Em produção (Vercel) usa o Turso: TURSO_DATABASE_URL=libsql://... e TURSO_AUTH_TOKEN.
// Localmente, sem essas variáveis, usa um arquivo SQLite em ./data/colecao.db.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  platform        TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'fisico',
  edition         TEXT,
  status          TEXT NOT NULL DEFAULT 'backlog',
  owned           INTEGER NOT NULL DEFAULT 1,
  user_rating     INTEGER,
  notes           TEXT,
  price_paid      REAL,
  purchase_date   TEXT,
  market_value    REAL,
  target_price    REAL,
  igdb_id         INTEGER,
  igdb_slug       TEXT,
  cover_url       TEXT,
  summary         TEXT,
  genres          TEXT,
  developer       TEXT,
  publisher       TEXT,
  release_date    TEXT,
  igdb_rating     REAL,
  critic_rating   REAL,
  screenshots     TEXT,
  ttb_main        INTEGER,
  ttb_extra       INTEGER,
  ttb_complete    INTEGER,
  metadata_at     TEXT,
  psn_np_id       TEXT,
  psn_service     TEXT,
  psn_title_ids   TEXT,
  psn_icon        TEXT,
  psn_progress    INTEGER,
  psn_earned      TEXT,
  psn_defined     TEXT,
  psn_updated_at  TEXT,
  psn_details_at  TEXT,
  xbox_title_id   TEXT,
  xbox_icon       TEXT,
  xbox_progress   INTEGER,
  xbox_ach_earned INTEGER,
  xbox_ach_total  INTEGER,
  xbox_gs_earned  INTEGER,
  xbox_gs_total   INTEGER,
  xbox_details_at TEXT,
  xbox_details_count INTEGER,
  playtime_minutes INTEGER,
  first_played    TEXT,
  last_played     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS games_psn ON games(psn_np_id) WHERE psn_np_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS games_xbox ON games(xbox_title_id) WHERE xbox_title_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS achievements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  ext_id      TEXT NOT NULL,
  name        TEXT,
  description TEXT,
  icon_url    TEXT,
  type        TEXT,
  points      INTEGER,
  rarity      REAL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  earned      INTEGER NOT NULL DEFAULT 0,
  earned_at   TEXT,
  UNIQUE (game_id, source, ext_id)
);
CREATE INDEX IF NOT EXISTS ach_earned ON achievements(earned, earned_at);

-- Somente dados NÃO sensíveis (nome do perfil, avatar, data da última sincronização).
-- Nenhum token/senha/chave é gravado aqui.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Cópias editadas (perdíveis corrigidos no site) dos guias em guides/*.json. data = JSON validado (src/lib/guide-schema.ts)
CREATE TABLE IF NOT EXISTS guides (
  game_id     INTEGER PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,           -- platina | 100
  data        TEXT NOT NULL,
  sources     TEXT,                    -- JSON [{title,url}]
  video_id    TEXT,
  video_title TEXT,
  model       TEXT,
  edited      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pedidos de guia enviados ao GitHub Actions (para mostrar "em preparação" na página)
CREATE TABLE IF NOT EXISTS guide_requests (
  game_id      INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL,
  requested_at TEXT NOT NULL
);

-- Consoles que você possui (cadastro manual + detecção pela PSN/Xbox)
CREATE TABLE IF NOT EXISTS consoles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  platform      TEXT NOT NULL,         -- mesma lista de plataformas dos jogos (PS5, Xbox Series...)
  model         TEXT,                  -- ex.: Slim, Pro, Series X, edição digital
  purchase_date TEXT,
  price_paid    REAL,
  notes         TEXT,
  detected_by   TEXT,                  -- psn | xbox (detectado na sincronização)
  detected_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip         TEXT PRIMARY KEY,
  failures   INTEGER NOT NULL,
  first_at   INTEGER NOT NULL
);
`;

declare global {
  var __colecaoDb: { client: Client; ready: Promise<void> } | undefined;
}

function connect() {
  let url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    url = `file:${path.join(dir, "colecao.db")}`;
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const ready = (async () => {
    await client.executeMultiple(SCHEMA);
    // Remove credenciais que versões antigas do site guardavam no banco.
    await client.execute(
      "DELETE FROM settings WHERE key IN ('psn_refresh_token','psn_refresh_expires','psn_access_token','psn_access_expires','xbox_api_key','igdb_client_id','igdb_client_secret','igdb_token','igdb_token_expires')",
    );
    // Colunas adicionadas depois da primeira versão (ALTER falha se já existir; ignoramos)
    for (const col of ["name_en TEXT", "description_en TEXT"]) {
      try {
        await client.execute(`ALTER TABLE achievements ADD COLUMN ${col}`);
      } catch {
        /* já existe */
      }
    }
    for (const col of ["saga TEXT", "collection TEXT"]) {
      try {
        await client.execute(`ALTER TABLE games ADD COLUMN ${col}`);
      } catch {
        /* já existe */
      }
    }
    // Força nova busca dos troféus da PSN que ainda não têm o nome em inglês
    await client.execute(
      `UPDATE games SET psn_details_at = NULL WHERE psn_np_id IS NOT NULL AND id IN
         (SELECT DISTINCT game_id FROM achievements WHERE source = 'psn' AND name_en IS NULL)`,
    );
    const seeded = await client.execute("SELECT 1 FROM settings WHERE key = 'seeded'");
    const count = await client.execute("SELECT COUNT(*) AS n FROM games");
    const versionRow = await client.execute("SELECT value FROM settings WHERE key = 'seed_version'");
    const fresh = seeded.rows.length === 0 && Number(count.rows[0].n) === 0;
    const current = fresh ? 0 : Number(versionRow.rows[0]?.value ?? 1);
    if (current < SEED_VERSION) {
      const toAdd = SEED_GAMES.filter((g) => (g.since ?? 1) > current);
      await client.batch(
        [
          // não duplica se o jogo já tiver sido cadastrado manualmente
          ...toAdd.map((g) => ({
            sql: `INSERT INTO games (title, platform, format, edition, status, owned, saga)
                  SELECT ?, ?, 'fisico', ?, 'backlog', 1, ?
                  WHERE NOT EXISTS (SELECT 1 FROM games WHERE lower(title) = lower(?) AND platform = ?)`,
            args: [g.title, g.platform, g.edition ?? null, SAGA_BY_TITLE[g.title] ?? null, g.title, g.platform],
          })),
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')",
          { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_version', ?)", args: [String(SEED_VERSION)] },
        ],
        "write",
      );
    }
    // Consoles iniciais (uma única vez; depois você edita na página Meus consoles)
    const consolesSeeded = await client.execute("SELECT 1 FROM settings WHERE key = 'consoles_seeded'");
    if (consolesSeeded.rows.length === 0) {
      await client.batch(
        [
          ...[
            ["PlayStation 5", "PS5", null],
            ["Xbox Series X", "Xbox Series", "Series X"],
            ["Xbox One", "Xbox One", null],
            ["Xbox 360", "Xbox 360", null],
            ["Nintendo Switch 2", "Switch 2", null],
          ].map(([name, platform, model]) => ({
            sql: "INSERT INTO consoles (name, platform, model) VALUES (?, ?, ?)",
            args: [name, platform, model],
          })),
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('consoles_seeded', '1')",
        ],
        "write",
      );
    }
    // Correções de dados (uma vez por versão)
    const fixesRow = await client.execute("SELECT value FROM settings WHERE key = 'fixes_version'");
    if (Number(fixesRow.rows[0]?.value ?? 0) < FIXES_VERSION) {
      await client.batch(
        [
          ...FIXES,
          { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('fixes_version', ?)", args: [String(FIXES_VERSION)] },
        ],
        "write",
      );
    }
    // Coletâneas: troca a caixa pelos jogos que ela contém (uma vez por versão)
    const collRow = await client.execute("SELECT value FROM settings WHERE key = 'collections_version'");
    if (Number(collRow.rows[0]?.value ?? 0) < COLLECTIONS_VERSION) {
      const stmts: InStatement[] = [];
      for (const [box, parts] of Object.entries(COLLECTIONS)) {
        const rows = await client.execute({ sql: "SELECT * FROM games WHERE lower(title) = lower(?) AND collection IS NULL", args: [box] });
        for (const r of rows.rows) {
          parts.forEach((title, i) => {
            stmts.push({
              sql: `INSERT INTO games (title, platform, format, status, owned, saga, collection, price_paid, purchase_date, market_value, notes)
                    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    WHERE NOT EXISTS (SELECT 1 FROM games WHERE lower(title) = lower(?) AND platform = ? AND collection = ?)`,
              args: [
                title, r.platform, r.format, r.status, r.owned, r.saga ?? SAGA_BY_TITLE[box] ?? null, box,
                // preço, data e anotações da caixa ficam no primeiro jogo da coletânea
                i === 0 ? r.price_paid : null, i === 0 ? r.purchase_date : null, i === 0 ? r.market_value : null, i === 0 ? r.notes : null,
                title, r.platform, box,
              ],
            });
          });
          stmts.push({ sql: "DELETE FROM achievements WHERE game_id = ?", args: [r.id] });
          stmts.push({ sql: "DELETE FROM guides WHERE game_id = ?", args: [r.id] });
          stmts.push({ sql: "DELETE FROM guide_requests WHERE game_id = ?", args: [r.id] });
          stmts.push({ sql: "DELETE FROM games WHERE id = ?", args: [r.id] });
        }
      }
      stmts.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('collections_version', ?)", args: [String(COLLECTIONS_VERSION)] });
      await client.batch(stmts, "write");
    }
    // Sagas dos jogos já cadastrados (só preenche quem ainda não tem saga)
    const sagaRow = await client.execute("SELECT value FROM settings WHERE key = 'saga_version'");
    if (Number(sagaRow.rows[0]?.value ?? 0) < SAGA_VERSION) {
      await client.batch(
        [
          ...Object.entries(SAGA_BY_TITLE).map(([title, saga]) => ({
            sql: "UPDATE games SET saga = ? WHERE saga IS NULL AND lower(title) = lower(?)",
            args: [saga, title],
          })),
          { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('saga_version', ?)", args: [String(SAGA_VERSION)] },
        ],
        "write",
      );
    }
  })();
  ready.catch(() => {
    globalThis.__colecaoDb = undefined; // tenta de novo na próxima requisição
  });
  return { client, ready };
}

async function client(): Promise<Client> {
  globalThis.__colecaoDb ??= connect();
  await globalThis.__colecaoDb.ready;
  return globalThis.__colecaoDb.client;
}

type Args = InArgs | undefined;

function toObject<T>(columns: string[], row: ArrayLike<unknown>): T {
  const o: Record<string, unknown> = {};
  columns.forEach((c, i) => {
    const v = row[i];
    o[c] = typeof v === "bigint" ? Number(v) : v;
  });
  return o as T;
}

export async function all<T>(sql: string, args?: Args): Promise<T[]> {
  const rs = await (await client()).execute({ sql, args: args ?? [] });
  return rs.rows.map((r) => toObject<T>(rs.columns, r));
}

export async function get<T>(sql: string, args?: Args): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args?: Args): Promise<{ id: number; changes: number }> {
  const rs = await (await client()).execute({ sql, args: args ?? [] });
  return { id: Number(rs.lastInsertRowid ?? 0), changes: rs.rowsAffected };
}

/** Executa vários comandos numa única transação. */
export async function batch(statements: InStatement[]): Promise<void> {
  if (statements.length === 0) return;
  await (await client()).batch(statements, "write");
}
