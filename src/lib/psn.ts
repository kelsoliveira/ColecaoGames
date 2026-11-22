import "server-only";
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getProfileFromAccountId,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  type AuthorizationPayload,
  type TrophyTitle,
} from "psn-api";
import { all, batch, get, run } from "./db";
import { isoDurationToMinutes, platformFamily, titleSimilarity } from "./format";
import { setSetting } from "./settings";
import type { GameRow } from "./types";

// Modo "sem armazenamento": o NPSSO é usado apenas durante a sincronização.
// O token de acesso fica só na memória desta requisição e é descartado ao final.

const LANG = { headerOverrides: { "Accept-Language": "pt-BR" } };

async function authenticate(npsso: string): Promise<AuthorizationPayload> {
  // aceita só o código ou o JSON inteiro da página ({"npsso":"..."})
  const clean = npsso.match(/"npsso"\s*:\s*"([^"]+)"/)?.[1] ?? npsso.trim();
  const code = await exchangeNpssoForAccessCode(clean);
  const tokens = await exchangeAccessCodeForAuthTokens(code);
  return { accessToken: tokens.accessToken };
}

function platformFromPsn(p: string): string {
  if (p.includes("PS5")) return "PS5";
  if (p.includes("PS4")) return "PS4";
  if (p.includes("PS3")) return "PS3";
  if (p.includes("PSVITA")) return "PS Vita";
  return "PS5";
}

function findMatch(name: string, platforms: string, candidates: GameRow[]): GameRow | null {
  let best: GameRow | null = null;
  let bestScore = 0;
  for (const g of candidates) {
    let s = titleSimilarity(name, g.title);
    if (s < 0.75) continue;
    if (platforms.toUpperCase().includes(g.platform.replace(" ", "").toUpperCase())) s += 0.05;
    if (s > bestScore) {
      best = g;
      bestScore = s;
    }
  }
  return best;
}

async function paginate<T>(fetchPage: (offset: number) => Promise<{ items: T[]; total: number }>): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    items.push(...page.items);
    offset += page.items.length;
    if (page.items.length === 0 || offset >= page.total) break;
  }
  return items;
}

export type SyncReport = {
  titles: number;
  matched: number;
  created: number;
  details: number;
  remaining: number;
  errors: string[];
};

export async function syncPsn(npsso: string, budgetMs = 240_000): Promise<SyncReport> {
  const started = Date.now();
  const a = await authenticate(npsso);
  const report: SyncReport = { titles: 0, matched: 0, created: 0, details: 0, remaining: 0, errors: [] };

  // Perfil (somente dados públicos)
  const summary = await getUserTrophyProfileSummary(a, "me");
  await setSetting("psn_account_id", summary.accountId);
  await setSetting("psn_profile", JSON.stringify(summary));
  try {
    const profile = await getProfileFromAccountId(a, "me");
    await setSetting("psn_online_id", profile.onlineId);
    const avatar = profile.avatars?.find((x) => x.size === "l") ?? profile.avatars?.at(-1);
    await setSetting("psn_avatar", avatar?.url ?? null);
  } catch {
    /* opcional */
  }

  // 1) Listas de troféus
  const titles = await paginate<TrophyTitle>(async (offset) => {
    const r = await getUserTitles(a, "me", { limit: 800, offset, ...LANG });
    return { items: r.trophyTitles, total: r.totalItemCount };
  });
  report.titles = titles.length;

  const games = await all<GameRow>("SELECT * FROM games");
  const byNp = new Map(games.filter((g) => g.psn_np_id).map((g) => [g.psn_np_id!, g]));
  const free = games.filter((g) => !g.psn_np_id && platformFamily(g.platform) === "playstation");

  for (const t of titles) {
    try {
      let game = byNp.get(t.npCommunicationId);
      if (!game) {
        const match = findMatch(t.trophyTitleName, t.trophyTitlePlatform, free);
        if (match) {
          game = match;
          free.splice(free.indexOf(match), 1);
          report.matched++;
        } else {
          const { id } = await run(
            "INSERT INTO games (title, platform, format, status, owned) VALUES (?, ?, 'digital', 'backlog', 1)",
            [t.trophyTitleName.replace(/[™®]/g, ""), platformFromPsn(t.trophyTitlePlatform)],
          );
          game = (await get<GameRow>("SELECT * FROM games WHERE id = ?", [id]))!;
          report.created++;
        }
        byNp.set(t.npCommunicationId, game);
      }
      const platinum = t.earnedTrophies.platinum ? 1 : 0;
      await run(
        `UPDATE games SET psn_np_id=:np, psn_service=:svc, psn_icon=:icon, psn_progress=:progress,
           psn_earned=:earned, psn_defined=:defined, psn_updated_at=:updated,
           status = CASE
             WHEN :platinum = 1 AND status IN ('backlog','jogando','zerado') THEN 'platinado'
             WHEN :progress > 0 AND status = 'backlog' THEN 'jogando'
             ELSE status END,
           updated_at=datetime('now')
         WHERE id=:id`,
        {
          id: game.id,
          np: t.npCommunicationId,
          svc: t.npServiceName,
          icon: t.trophyTitleIconUrl,
          progress: t.progress,
          earned: JSON.stringify(t.earnedTrophies),
          defined: JSON.stringify(t.definedTrophies),
          updated: t.lastUpdatedDateTime,
          platinum,
        },
      );
    } catch (e) {
      report.errors.push(`${t.trophyTitleName}: ${(e as Error).message}`);
    }
  }

  // 2) Tempo de jogo (PS4/PS5)
  try {
    const played = await paginate(async (offset) => {
      const r = await getUserPlayedGames(a, "me", { limit: 200, offset });
      return { items: r.titles, total: r.totalItemCount };
    });
    const psGames = (await all<GameRow>("SELECT * FROM games")).filter((g) => platformFamily(g.platform) === "playstation");
    const acc = new Map<number, { minutes: number; first: string; last: string; ids: Set<string>; image: string }>();
    for (const p of played) {
      const byId = psGames.find((g) => (g.psn_title_ids ?? "").includes(`"${p.titleId}"`));
      const game = byId ?? findMatch(p.localizedName || p.name, p.category, psGames);
      if (!game) continue;
      const cur = acc.get(game.id) ?? {
        minutes: 0,
        first: p.firstPlayedDateTime,
        last: p.lastPlayedDateTime,
        ids: new Set<string>(),
        image: p.imageUrl,
      };
      cur.minutes += isoDurationToMinutes(p.playDuration);
      if (p.firstPlayedDateTime < cur.first) cur.first = p.firstPlayedDateTime;
      if (p.lastPlayedDateTime > cur.last) cur.last = p.lastPlayedDateTime;
      cur.ids.add(p.titleId);
      acc.set(game.id, cur);
    }
    await batch(
      [...acc].map(([id, v]) => ({
        sql: `UPDATE games SET playtime_minutes=?, first_played=?, last_played=?, psn_title_ids=?,
                cover_url = COALESCE(cover_url, ?), updated_at=datetime('now') WHERE id=?`,
        args: [v.minutes, v.first, v.last, JSON.stringify([...v.ids]), v.image ?? null, id],
      })),
    );
  } catch (e) {
    report.errors.push(`Tempo de jogo: ${(e as Error).message}`);
  }

  // 3) Troféus detalhados, só das listas que mudaram, dentro do tempo disponível
  const stale = await all<GameRow>(
    `SELECT * FROM games WHERE psn_np_id IS NOT NULL AND (psn_details_at IS NULL OR psn_details_at <> psn_updated_at)
     ORDER BY psn_updated_at DESC`,
  );
  for (const g of stale) {
    if (Date.now() - started > budgetMs) break;
    try {
      await syncTrophies(g, a);
      report.details++;
    } catch (e) {
      report.errors.push(`Troféus de ${g.title}: ${(e as Error).message}`);
    }
  }
  report.remaining = stale.length - report.details - report.errors.filter((e) => e.startsWith("Troféus de")).length;

  await setSetting("psn_last_sync", new Date().toISOString());
  return report;
}

async function syncTrophies(g: GameRow, a: AuthorizationPayload) {
  const npServiceName = (g.psn_service as "trophy" | "trophy2") ?? "trophy2";
  const [defs, defsEn, earned] = await Promise.all([
    getTitleTrophies(a, g.psn_np_id!, "all", { npServiceName, ...LANG }),
    getTitleTrophies(a, g.psn_np_id!, "all", { npServiceName, headerOverrides: { "Accept-Language": "en-US" } }),
    getUserTrophiesEarnedForTitle(a, "me", g.psn_np_id!, "all", { npServiceName, ...LANG }),
  ]);
  const earnedMap = new Map(earned.trophies.map((t) => [t.trophyId, t]));
  const enMap = new Map(defsEn.trophies.map((t) => [t.trophyId, t]));
  await batch([
    ...defs.trophies.map((d) => {
      const e = earnedMap.get(d.trophyId);
      return {
        sql: `INSERT INTO achievements (game_id, source, ext_id, name, description, name_en, description_en, icon_url, type, points, rarity, hidden, earned, earned_at)
              VALUES (?, 'psn', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
              ON CONFLICT (game_id, source, ext_id) DO UPDATE SET name=excluded.name, description=excluded.description,
                name_en=excluded.name_en, description_en=excluded.description_en,
                icon_url=excluded.icon_url, type=excluded.type, rarity=excluded.rarity, hidden=excluded.hidden,
                earned=excluded.earned, earned_at=excluded.earned_at`,
        args: [
          g.id,
          String(d.trophyId),
          d.trophyName ?? null,
          d.trophyDetail ?? null,
          enMap.get(d.trophyId)?.trophyName ?? null,
          enMap.get(d.trophyId)?.trophyDetail ?? null,
          d.trophyIconUrl ?? null,
          d.trophyType,
          e?.trophyEarnedRate ? Number(e.trophyEarnedRate) : null,
          d.trophyHidden ? 1 : 0,
          e?.earned ? 1 : 0,
          e?.earnedDateTime ?? null,
        ],
      };
    }),
    { sql: "UPDATE games SET psn_details_at = psn_updated_at WHERE id = ?", args: [g.id] },
  ]);
}
