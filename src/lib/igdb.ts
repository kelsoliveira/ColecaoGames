import "server-only";
import { all, run } from "./db";
import { titleSimilarity } from "./format";
import { igdbCredentials } from "./settings";
import type { GameRow } from "./types";

// IDs de plataforma no IGDB
const IGDB_PLATFORM: Record<string, number[]> = {
  PS5: [167],
  PS4: [48],
  PS3: [9],
  "PS Vita": [46],
  "Xbox Series": [169],
  "Xbox One": [49],
  "Xbox 360": [12],
  "Switch 2": [508],
  Switch: [130],
  Nintendo: [4, 21, 37, 41, 130, 508],
  PC: [6],
};

export type IgdbGame = {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  total_rating?: number;
  aggregated_rating?: number;
  cover?: { image_id: string };
  screenshots?: { image_id: string }[];
  genres?: { name: string }[];
  platforms?: { id: number; abbreviation?: string; name: string }[];
  involved_companies?: { developer: boolean; publisher: boolean; company: { name: string } }[];
};

export const igdbImage = (imageId: string, size = "t_cover_big_2x") =>
  `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;

// O token de acesso da Twitch é temporário e fica apenas na memória do servidor.
let cachedToken: { token: string; expires: number } | null = null;

async function token(): Promise<{ clientId: string; token: string }> {
  const creds = igdbCredentials();
  if (!creds) throw new Error("Configure IGDB_CLIENT_ID e IGDB_CLIENT_SECRET nas variáveis de ambiente.");
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return { clientId: creds.clientId, token: cachedToken.token };

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("client_secret", creds.clientSecret);
  url.searchParams.set("grant_type", "client_credentials");
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Falha ao autenticar no IGDB/Twitch (${res.status}). Verifique as credenciais.`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return { clientId: creds.clientId, token: json.access_token };
}

async function query<T>(endpoint: string, body: string): Promise<T> {
  const { clientId, token: t } = await token();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${t}`, Accept: "application/json" },
    body,
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1000));
    return query<T>(endpoint, body);
  }
  if (!res.ok) throw new Error(`IGDB ${endpoint}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const GAME_FIELDS =
  "fields name,slug,summary,first_release_date,total_rating,aggregated_rating,cover.image_id," +
  "screenshots.image_id,genres.name,platforms.id,platforms.abbreviation,platforms.name," +
  "involved_companies.developer,involved_companies.publisher,involved_companies.company.name;";

const escape = (s: string) => s.replace(/"/g, '\\"');

export async function searchIgdb(title: string, platform?: string): Promise<IgdbGame[]> {
  const ids = platform ? IGDB_PLATFORM[platform] : undefined;
  const where = ids ? ` where platforms = (${ids.join(",")});` : "";
  const results = await query<IgdbGame[]>("games", `search "${escape(title)}"; ${GAME_FIELDS}${where} limit 15;`);
  if (results.length === 0 && ids) return searchIgdb(title);
  return results;
}

export async function bestIgdbMatch(title: string, platform?: string): Promise<IgdbGame | null> {
  const clean = title.replace(/[™®©]/g, "").replace(/\s*\(.*?\)\s*/g, " ").trim();
  const results = await searchIgdb(clean, platform);
  let best: IgdbGame | null = null;
  let bestScore = 0;
  for (const r of results) {
    const s = titleSimilarity(clean, r.name);
    if (s > bestScore) {
      best = r;
      bestScore = s;
    }
  }
  return bestScore >= 0.5 ? best : (results[0] ?? null);
}

type TimeToBeat = { game_id: number; hastily?: number; normally?: number; completely?: number };

/** Aplica os metadados de um jogo do IGDB (capa, gêneros, notas, tempo para zerar) a um registro. */
export async function applyIgdb(gameId: number, igdbId: number) {
  const [g] = await query<IgdbGame[]>("games", `${GAME_FIELDS} where id = ${igdbId};`);
  if (!g) throw new Error("Jogo não encontrado no IGDB.");
  let ttb: TimeToBeat | undefined;
  try {
    [ttb] = await query<TimeToBeat[]>(
      "game_time_to_beats",
      `fields game_id,hastily,normally,completely; where game_id = ${igdbId};`,
    );
  } catch {
    ttb = undefined;
  }

  const dev = g.involved_companies?.filter((c) => c.developer).map((c) => c.company.name) ?? [];
  const pub = g.involved_companies?.filter((c) => c.publisher).map((c) => c.company.name) ?? [];

  await run(
      `UPDATE games SET igdb_id=?, igdb_slug=?, cover_url=?, summary=?, genres=?, developer=?, publisher=?,
         release_date=?, igdb_rating=?, critic_rating=?, screenshots=?, ttb_main=?, ttb_extra=?, ttb_complete=?,
         metadata_at=datetime('now'), updated_at=datetime('now')
       WHERE id=?`,
    [
      g.id,
      g.slug ?? null,
      g.cover ? igdbImage(g.cover.image_id) : null,
      g.summary ?? null,
      JSON.stringify(g.genres?.map((x) => x.name) ?? []),
      dev.join(", ") || null,
      pub.join(", ") || null,
      g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
      g.total_rating ?? null,
      g.aggregated_rating ?? null,
      JSON.stringify(g.screenshots?.slice(0, 8).map((s) => igdbImage(s.image_id, "t_screenshot_big")) ?? []),
      ttb?.hastily ?? ttb?.normally ?? null,
      ttb?.normally ?? null,
      ttb?.completely ?? null,
      gameId,
    ],
  );
}

/**
 * Busca metadados para os jogos que ainda não têm (ou para todos, se force=true).
 * Para depois de `budgetMs` para caber no tempo máximo de uma função na Vercel; basta rodar de novo para continuar.
 */
export async function enrichAll(
  force = false,
  budgetMs = 240_000,
): Promise<{ ok: number; failed: string[]; remaining: number }> {
  const started = Date.now();
  const rows = await all<Pick<GameRow, "id" | "title" | "platform">>(
    `SELECT id, title, platform FROM games ${force ? "" : "WHERE metadata_at IS NULL"} ORDER BY id`,
  );
  let ok = 0;
  let done = 0;
  const failed: string[] = [];
  for (const r of rows) {
    if (Date.now() - started > budgetMs) break;
    done++;
    try {
      const m = await bestIgdbMatch(r.title, r.platform);
      if (!m) {
        failed.push(r.title);
        // marca como verificado para não tentar de novo a cada sincronização
        await run("UPDATE games SET metadata_at = datetime('now') WHERE id = ?", [r.id]);
        continue;
      }
      await applyIgdb(r.id, m.id);
      ok++;
      await new Promise((res) => setTimeout(res, 260)); // limite do IGDB: 4 req/s
    } catch (e) {
      failed.push(`${r.title} (${(e as Error).message})`);
      if (/credenciais|Configure/.test((e as Error).message)) break;
    }
  }
  return { ok, failed, remaining: rows.length - done };
}
