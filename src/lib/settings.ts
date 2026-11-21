import "server-only";
import { get, run } from "./db";

/** Apenas informações públicas/não sensíveis. Tokens e chaves NUNCA são gravados. */
export type SettingKey =
  | "seeded"
  | "psn_account_id"
  | "psn_online_id"
  | "psn_avatar"
  | "psn_profile"
  | "psn_last_sync"
  | "xbox_xuid"
  | "xbox_gamertag"
  | "xbox_avatar"
  | "xbox_gamerscore"
  | "xbox_last_sync";

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await get<{ value: string | null }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function getSettings(keys: SettingKey[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = await getSetting(k);
  return out;
}

export async function setSetting(key: SettingKey, value: string | null) {
  if (value == null) await run("DELETE FROM settings WHERE key = ?", [key]);
  else await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
}

/** Credenciais do IGDB ficam só nas variáveis de ambiente (na Vercel: Settings → Environment Variables). */
export function igdbCredentials() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
