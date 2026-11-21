import "server-only";
import { db } from "./db";

export type SettingKey =
  | "seeded"
  | "igdb_client_id"
  | "igdb_client_secret"
  | "igdb_token"
  | "igdb_token_expires"
  | "psn_refresh_token"
  | "psn_refresh_expires"
  | "psn_access_token"
  | "psn_access_expires"
  | "psn_account_id"
  | "psn_online_id"
  | "psn_avatar"
  | "psn_profile"
  | "psn_last_sync"
  | "xbox_api_key"
  | "xbox_xuid"
  | "xbox_gamertag"
  | "xbox_avatar"
  | "xbox_gamerscore"
  | "xbox_last_sync";

export function getSetting(key: SettingKey): string | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: SettingKey, value: string | null) {
  if (value == null) db().prepare("DELETE FROM settings WHERE key = ?").run(key);
  else db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function clearSettings(prefix: "psn_" | "xbox_" | "igdb_") {
  db().prepare("DELETE FROM settings WHERE key LIKE ?").run(`${prefix}%`);
}

/** Credenciais do IGDB: variáveis de ambiente têm prioridade sobre o que foi salvo na tela de Contas. */
export function igdbCredentials() {
  const clientId = process.env.IGDB_CLIENT_ID || getSetting("igdb_client_id");
  const clientSecret = process.env.IGDB_CLIENT_SECRET || getSetting("igdb_client_secret");
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
