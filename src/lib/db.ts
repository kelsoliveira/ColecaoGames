import "server-only";
import { createClient, type Client, type InArgs, type InStatement } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { SEED_GAMES, SEED_VERSION } from "./seed";

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
            sql: `INSERT INTO games (title, platform, format, edition, status, owned)
                  SELECT ?, ?, 'fisico', ?, 'backlog', 1
                  WHERE NOT EXISTS (SELECT 1 FROM games WHERE lower(title) = lower(?) AND platform = ?)`,
            args: [g.title, g.platform, g.edition ?? null, g.title, g.platform],
          })),
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')",
          { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_version', ?)", args: [String(SEED_VERSION)] },
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
