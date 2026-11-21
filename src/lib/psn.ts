import "server-only";
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromAccountId,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  type AuthTokensResponse,
  type AuthorizationPayload,
  type TrophyTitle,
} from "psn-api";
import { db } from "./db";
import { isoDurationToMinutes, platformFamily, titleSimilarity } from "./format";
import { clearSettings, getSetting, setSetting } from "./settings";
import type { GameRow } from "./types";

const LANG = { headerOverrides: { "Accept-Language": "pt-BR" } };

function saveTokens(t: AuthTokensResponse) {
  setSetting("psn_access_token", t.accessToken);
  setSetting("psn_access_expires", String(Date.now() + t.expiresIn * 1000));
  setSetting("psn_refresh_token", t.refreshToken);
  setSetting("psn_refresh_expires", String(Date.now() + t.refreshTokenExpiresIn * 1000));
}

/** Troca o NPSSO (64 caracteres) por tokens. O NPSSO em si NÃO é armazenado. */
export async function connectPsn(npsso: string) {
  const code = await exchangeNpssoForAccessCode(npsso.trim());
  const tokens = await exchangeAccessCodeForAuthTokens(code);
  saveTokens(tokens);
  const auth = { accessToken: tokens.accessToken };
  const profile = await getProfileFromAccountId(auth, "me");
  setSetting("psn_online_id", profile.onlineId);
  const avatar = profile.avatars?.find((a) => a.size === "l") ?? profile.avatars?.at(-1);
  setSetting("psn_avatar", avatar?.url ?? null);
}

export function disconnectPsn() {
  clearSettings("psn_");
}

export function psnConnected() {
  const exp = Number(getSetting("psn_refresh_expires") ?? 0);
  return !!getSetting("psn_refresh_token") && exp > Date.now();
}

async function auth(): Promise<AuthorizationPayload> {
  const access = getSetting("psn_access_token");
  if (access && Number(getSetting("psn_access_expires") ?? 0) > Date.now() + 60_000) return { accessToken: access };
  const refresh = getSetting("psn_refresh_token");
  if (!refresh || !psnConnected()) throw new Error("Conta PSN não conectada ou sessão expirada. Conecte novamente em Contas.");
  const tokens = await exchangeRefreshTokenForAuthTokens(refresh);
  saveTokens(tokens);
  return { accessToken: tokens.accessToken };
}

function platformFromPsn(p: string): string {
  if (p.includes("PS5")) return "PS5";
  if (p.includes("PS4")) return "PS4";
  if (p.includes("PS3")) return "PS3";
  if (p.includes("PSVITA")) return "PS Vita";
  return "PS5";
}

/** Encontra o jogo do catálogo que corresponde a um título da PSN. */
function findMatch(name: string, platforms: string, candidates: GameRow[]): GameRow | null {
  let best: GameRow | null = null;
  let bestScore = 0;
  for (const g of candidates) {
    let s = titleSimilarity(name, g.title);
    if (s < 0.75) continue;
    if (platforms.includes(g.platform.replace(" ", "").toUpperCase())) s += 0.05;
    if (s > bestScore) {
      best = g;
      bestScore = s;
    }
  }
  return best;
}

async function paginate<T>(fetchPage: (offset: number) => Promise<{ items: T[]; total: number }>): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const { items, total } = await fetchPage(offset);
    all.push(...items);
    offset += items.length;
    if (items.length === 0 || offset >= total) break;
  }
  return all;
}

export type SyncReport = { titles: number; matched: number; created: number; details: number; errors: string[] };

export async function syncPsn(): Promise<SyncReport> {
  const a = await auth();
  const report: SyncReport = { titles: 0, matched: 0, created: 0, details: 0, errors: [] };
  const database = db();

  // Perfil e nível de troféus
  const summary = await getUserTrophyProfileSummary(a, "me");
  setSetting("psn_account_id", summary.accountId);
  setSetting("psn_profile", JSON.stringify(summary));
  try {
    const profile = await getProfileFromAccountId(a, "me");
    setSetting("psn_online_id", profile.onlineId);
    setSetting("psn_avatar", (profile.avatars?.find((x) => x.size === "l") ?? profile.avatars?.at(-1))?.url ?? null);
  } catch {
    /* perfil é opcional */
  }

  // 1) Listas de troféus
  const titles = await paginate<TrophyTitle>(async (offset) => {
    const r = await getUserTitles(a, "me", { limit: 800, offset, ...LANG });
    return { items: r.trophyTitles, total: r.totalItemCount };
  });
  report.titles = titles.length;

  const candidates = () =>
    (database.prepare("SELECT * FROM games WHERE psn_np_id IS NULL").all() as GameRow[]).filter(
      (g) => platformFamily(g.platform) === "playstation",
    );

  const updatePsn = database.prepare(
    `UPDATE games SET psn_np_id=@np, psn_service=@svc, psn_icon=@icon, psn_progress=@progress,
       psn_earned=@earned, psn_defined=@defined, psn_updated_at=@updated,
       status = CASE
         WHEN @platinum = 1 AND status IN ('backlog','jogando','zerado') THEN 'platinado'
         WHEN @progress > 0 AND status = 'backlog' THEN 'jogando'
         ELSE status END,
       updated_at=datetime('now')
     WHERE id=@id`,
  );
  const insertDigital = database.prepare(
    `INSERT INTO games (title, platform, format, status, owned) VALUES (?, ?, 'digital', 'backlog', 1)`,
  );

  for (const t of titles) {
    try {
      let game = database.prepare("SELECT * FROM games WHERE psn_np_id = ?").get(t.npCommunicationId) as
        | GameRow
        | undefined;
      if (!game) {
        const match = findMatch(t.trophyTitleName, t.trophyTitlePlatform, candidates());
        if (match) {
          game = match;
          report.matched++;
        } else {
          const id = insertDigital.run(t.trophyTitleName.replace(/[™®]/g, ""), platformFromPsn(t.trophyTitlePlatform))
            .lastInsertRowid as number;
          game = database.prepare("SELECT * FROM games WHERE id = ?").get(id) as GameRow;
          report.created++;
        }
      }
      updatePsn.run({
        id: game.id,
        np: t.npCommunicationId,
        svc: t.npServiceName,
        icon: t.trophyTitleIconUrl,
        progress: t.progress,
        earned: JSON.stringify(t.earnedTrophies),
        defined: JSON.stringify(t.definedTrophies),
        updated: t.lastUpdatedDateTime,
        platinum: t.earnedTrophies.platinum ? 1 : 0,
      });
    } catch (e) {
      report.errors.push(`${t.trophyTitleName}: ${(e as Error).message}`);
    }
  }

  // 2) Tempo de jogo (apenas PS4/PS5)
  try {
    const played = await paginate(async (offset) => {
      const r = await getUserPlayedGames(a, "me", { limit: 200, offset });
      return { items: r.titles, total: r.totalItemCount };
    });
    const psGames = (database.prepare("SELECT * FROM games").all() as GameRow[]).filter(
      (g) => platformFamily(g.platform) === "playstation",
    );
    const acc = new Map<number, { minutes: number; first: string; last: string; ids: Set<string> }>();
    for (const p of played) {
      const byId = psGames.find((g) => (g.psn_title_ids ?? "").includes(`"${p.titleId}"`));
      const game = byId ?? findMatch(p.localizedName || p.name, p.category.toUpperCase(), psGames);
      if (!game) continue;
      const cur = acc.get(game.id) ?? { minutes: 0, first: p.firstPlayedDateTime, last: p.lastPlayedDateTime, ids: new Set() };
      cur.minutes += isoDurationToMinutes(p.playDuration);
      if (p.firstPlayedDateTime < cur.first) cur.first = p.firstPlayedDateTime;
      if (p.lastPlayedDateTime > cur.last) cur.last = p.lastPlayedDateTime;
      cur.ids.add(p.titleId);
      acc.set(game.id, cur);
    }
    const upd = database.prepare(
      `UPDATE games SET playtime_minutes=?, first_played=?, last_played=?, psn_title_ids=?,
         cover_url = COALESCE(cover_url, ?), updated_at=datetime('now') WHERE id=?`,
    );
    for (const [id, v] of acc) {
      const p = played.find((x) => v.ids.has(x.titleId));
      upd.run(v.minutes, v.first, v.last, JSON.stringify([...v.ids]), p?.imageUrl ?? null, id);
    }
  } catch (e) {
    report.errors.push(`Tempo de jogo: ${(e as Error).message}`);
  }

  // 3) Detalhes de troféus (somente listas alteradas desde a última sincronização)
  const stale = database
    .prepare(
      "SELECT * FROM games WHERE psn_np_id IS NOT NULL AND (psn_details_at IS NULL OR psn_details_at <> psn_updated_at)",
    )
    .all() as GameRow[];
  for (const g of stale) {
    try {
      await syncPsnTrophies(g, a);
      report.details++;
    } catch (e) {
      report.errors.push(`Troféus de ${g.title}: ${(e as Error).message}`);
    }
  }

  setSetting("psn_last_sync", new Date().toISOString());
  return report;
}

export async function syncPsnTrophies(g: GameRow, a?: AuthorizationPayload) {
  if (!g.psn_np_id) return;
  a ??= await auth();
  const npServiceName = (g.psn_service as "trophy" | "trophy2") ?? "trophy2";
  const [defs, earned] = await Promise.all([
    getTitleTrophies(a, g.psn_np_id, "all", { npServiceName, ...LANG }),
    getUserTrophiesEarnedForTitle(a, "me", g.psn_np_id, "all", { npServiceName, ...LANG }),
  ]);
  const earnedMap = new Map(earned.trophies.map((t) => [t.trophyId, t]));
  const database = db();
  const upsert = database.prepare(
    `INSERT INTO achievements (game_id, source, ext_id, name, description, icon_url, type, points, rarity, hidden, earned, earned_at)
     VALUES (@game_id, 'psn', @ext_id, @name, @description, @icon_url, @type, NULL, @rarity, @hidden, @earned, @earned_at)
     ON CONFLICT (game_id, source, ext_id) DO UPDATE SET name=excluded.name, description=excluded.description,
       icon_url=excluded.icon_url, type=excluded.type, rarity=excluded.rarity, hidden=excluded.hidden,
       earned=excluded.earned, earned_at=excluded.earned_at`,
  );
  database.transaction(() => {
    for (const d of defs.trophies) {
      const e = earnedMap.get(d.trophyId);
      upsert.run({
        game_id: g.id,
        ext_id: String(d.trophyId),
        name: d.trophyName ?? null,
        description: d.trophyDetail ?? null,
        icon_url: d.trophyIconUrl ?? null,
        type: d.trophyType,
        rarity: e?.trophyEarnedRate ? Number(e.trophyEarnedRate) : null,
        hidden: d.trophyHidden ? 1 : 0,
        earned: e?.earned ? 1 : 0,
        earned_at: e?.earnedDateTime ?? null,
      });
    }
    database.prepare("UPDATE games SET psn_details_at = psn_updated_at WHERE id = ?").run(g.id);
  })();
}
