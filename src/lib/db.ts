import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SEED_GAMES } from "./seed";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "colecao.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  platform        TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'fisico',   -- fisico | digital
  edition         TEXT,
  status          TEXT NOT NULL DEFAULT 'backlog',  -- backlog | jogando | zerado | platinado | abandonado | desejado
  owned           INTEGER NOT NULL DEFAULT 1,       -- 0 = apenas jogado (ex.: PS Plus/Game Pass) ou lista de desejos
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
  genres          TEXT,   -- JSON array
  developer       TEXT,
  publisher       TEXT,
  release_date    TEXT,
  igdb_rating     REAL,
  critic_rating   REAL,
  screenshots     TEXT,   -- JSON array de URLs
  ttb_main        INTEGER, -- segundos (IGDB time to beat)
  ttb_extra       INTEGER,
  ttb_complete    INTEGER,
  metadata_at     TEXT,

  psn_np_id       TEXT,
  psn_service     TEXT,
  psn_title_ids   TEXT,   -- JSON array (CUSA/PPSA)
  psn_icon        TEXT,
  psn_progress    INTEGER,
  psn_earned      TEXT,   -- JSON {bronze,silver,gold,platinum}
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
  source      TEXT NOT NULL,          -- psn | xbox
  ext_id      TEXT NOT NULL,
  name        TEXT,
  description TEXT,
  icon_url    TEXT,
  type        TEXT,                   -- bronze | silver | gold | platinum | gamerscore
  points      INTEGER,
  rarity      REAL,                   -- % de jogadores que obtiveram
  hidden      INTEGER NOT NULL DEFAULT 0,
  earned      INTEGER NOT NULL DEFAULT 0,
  earned_at   TEXT,
  UNIQUE (game_id, source, ext_id)
);
CREATE INDEX IF NOT EXISTS ach_earned ON achievements(earned, earned_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

declare global {
  var __colecaoDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  const { n } = db.prepare("SELECT COUNT(*) AS n FROM games").get() as { n: number };
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'seeded'").get();
  if (n === 0 && !seeded) {
    const insert = db.prepare(
      "INSERT INTO games (title, platform, format, edition, status, owned) VALUES (?, ?, 'fisico', ?, 'backlog', 1)",
    );
    db.transaction(() => {
      for (const g of SEED_GAMES) insert.run(g.title, g.platform, g.edition ?? null);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')").run();
    })();
  }
  return db;
}

export function db(): Database.Database {
  if (!globalThis.__colecaoDb) globalThis.__colecaoDb = open();
  return globalThis.__colecaoDb;
}
