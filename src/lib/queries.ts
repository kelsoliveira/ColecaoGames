import "server-only";
import { all, get } from "./db";
import { emptyTrophies, parseJson } from "./format";
import type { AchievementRow, GameRow, TrophyCounts } from "./types";

export type GameFilters = {
  q?: string;
  platform?: string;
  format?: string;
  status?: string;
  genre?: string;
  saga?: string;
  sort?: string;
};

const SORTS: Record<string, string> = {
  titulo: "title COLLATE NOCASE ASC",
  recentes: "COALESCE(last_played, '') DESC, title COLLATE NOCASE",
  progresso: "COALESCE(psn_progress, xbox_progress, -1) DESC, title COLLATE NOCASE",
  horas: "COALESCE(playtime_minutes, 0) DESC, title COLLATE NOCASE",
  nota: "COALESCE(critic_rating, igdb_rating, 0) DESC, title COLLATE NOCASE",
  lancamento: "COALESCE(release_date, '') DESC, title COLLATE NOCASE",
  duracao: "COALESCE(ttb_main, 999999999) ASC, title COLLATE NOCASE",
  adicionados: "created_at DESC, id DESC",
};

export async function listGames(f: GameFilters): Promise<GameRow[]> {
  const where: string[] = [];
  const params: Record<string, string> = {};
  if (f.q) {
    where.push("(title LIKE @q OR developer LIKE @q OR publisher LIKE @q)");
    params.q = `%${f.q}%`;
  }
  if (f.platform) {
    where.push("platform = @platform");
    params.platform = f.platform;
  }
  if (f.format) {
    where.push("format = @format");
    params.format = f.format;
  }
  if (f.status) {
    where.push("status = @status");
    params.status = f.status;
  } else {
    where.push("status <> 'desejado'");
  }
  if (f.saga) {
    where.push("saga = @saga");
    params.saga = f.saga;
  }
  if (f.genre) {
    where.push("genres LIKE @genre");
    params.genre = `%"${f.genre}"%`;
  }
  const sql = `SELECT * FROM games ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${
    SORTS[f.sort ?? ""] ?? SORTS.titulo
  }`;
  return all<GameRow>(sql, params);
}

export async function allGenres(): Promise<string[]> {
  const rows = await all<{ genres: string }>("SELECT genres FROM games WHERE genres IS NOT NULL");
  const set = new Set<string>();
  for (const r of rows) for (const g of parseJson<string[]>(r.genres, [])) set.add(g);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function allSagas(): Promise<string[]> {
  return (
    await all<{ saga: string }>("SELECT DISTINCT saga FROM games WHERE saga IS NOT NULL AND saga <> '' ORDER BY saga COLLATE NOCASE")
  ).map((r) => r.saga);
}

export async function usedPlatforms(): Promise<string[]> {
  return (await all<{ platform: string }>("SELECT DISTINCT platform FROM games ORDER BY platform")).map((r) => r.platform);
}

export const getGame = (id: number) => get<GameRow>("SELECT * FROM games WHERE id = ?", [id]);

export const getAchievements = (gameId: number) =>
  all<AchievementRow>(
      `SELECT * FROM achievements WHERE game_id = ?
       ORDER BY earned DESC, CASE type WHEN 'platinum' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END,
                COALESCE(earned_at, '') DESC, CAST(ext_id AS INTEGER)`,
    [gameId],
  );

export type RecentAchievement = AchievementRow & { game_title: string; game_platform: string };

export function recentAchievements(limit = 20): Promise<RecentAchievement[]> {
  return all<RecentAchievement>(
      `SELECT a.*, g.title AS game_title, g.platform AS game_platform FROM achievements a
       JOIN games g ON g.id = a.game_id WHERE a.earned = 1 AND a.earned_at IS NOT NULL
       ORDER BY a.earned_at DESC LIMIT ?`,
    [limit],
  );
}

export function rarestAchievements(limit = 10): Promise<RecentAchievement[]> {
  return all<RecentAchievement>(
      `SELECT a.*, g.title AS game_title, g.platform AS game_platform FROM achievements a
       JOIN games g ON g.id = a.game_id WHERE a.earned = 1 AND a.rarity IS NOT NULL
       ORDER BY a.rarity ASC LIMIT ?`,
    [limit],
  );
}

/** Jogos que estão perto dos 100% (bons candidatos para platinar). */
export function nearCompletion(limit = 8): Promise<GameRow[]> {
  return all<GameRow>(
      `SELECT * FROM games WHERE COALESCE(psn_progress, xbox_progress) BETWEEN 50 AND 99
       ORDER BY COALESCE(psn_progress, xbox_progress) DESC LIMIT ?`,
    [limit],
  );
}

export async function getStats() {
  const games = await all<GameRow>("SELECT * FROM games");
  const owned = games.filter((g) => g.status !== "desejado");
  const trophies: TrophyCounts = emptyTrophies();
  let gamerscore = 0;
  let achievementsXbox = 0;
  const byPlatform = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byGenre = new Map<string, number>();
  const bySaga = new Map<string, number>();
  let minutes = 0;
  let paid = 0;
  let value = 0;
  let backlogHours = 0;

  for (const g of owned) {
    byPlatform.set(g.platform, (byPlatform.get(g.platform) ?? 0) + 1);
    byStatus.set(g.status, (byStatus.get(g.status) ?? 0) + 1);
    if (g.saga) bySaga.set(g.saga, (bySaga.get(g.saga) ?? 0) + 1);
    for (const genre of parseJson<string[]>(g.genres, [])) byGenre.set(genre, (byGenre.get(genre) ?? 0) + 1);
    const e = parseJson<TrophyCounts>(g.psn_earned, emptyTrophies());
    trophies.bronze += e.bronze;
    trophies.silver += e.silver;
    trophies.gold += e.gold;
    trophies.platinum += e.platinum;
    gamerscore += g.xbox_gs_earned ?? 0;
    achievementsXbox += g.xbox_ach_earned ?? 0;
    minutes += g.playtime_minutes ?? 0;
    paid += g.price_paid ?? 0;
    value += g.market_value ?? g.price_paid ?? 0;
    if (g.status === "backlog" && g.ttb_main) backlogHours += g.ttb_main / 3600;
  }

  const progressValues = owned
    .map((g) => g.psn_progress ?? g.xbox_progress)
    .filter((v): v is number => v != null);
  const completion = progressValues.length
    ? Math.round(progressValues.reduce((s, v) => s + v, 0) / progressValues.length)
    : null;

  const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);

  return {
    total: owned.length,
    physical: owned.filter((g) => g.format === "fisico").length,
    digital: owned.filter((g) => g.format === "digital").length,
    wishlist: games.length - owned.length,
    trophies,
    gamerscore,
    achievementsXbox,
    minutes,
    paid,
    value,
    completion,
    backlogHours: Math.round(backlogHours),
    byPlatform: sortDesc(byPlatform),
    byStatus: sortDesc(byStatus),
    byGenre: sortDesc(byGenre).slice(0, 8),
    bySaga: sortDesc(bySaga).slice(0, 8),
    mostPlayed: [...owned]
      .filter((g) => g.playtime_minutes)
      .sort((a, b) => (b.playtime_minutes ?? 0) - (a.playtime_minutes ?? 0))
      .slice(0, 8),
    recentlyPlayed: [...owned]
      .filter((g) => g.last_played)
      .sort((a, b) => (b.last_played ?? "").localeCompare(a.last_played ?? ""))
      .slice(0, 6),
  };
}

export function gamesForMerge(game: GameRow): Promise<GameRow[]> {
  return all<GameRow>("SELECT * FROM games WHERE id <> ? ORDER BY title COLLATE NOCASE", [game.id]);
}

export function platinumGames(): Promise<(GameRow & { plat_at: string | null })[]> {
  return all(
    `SELECT g.*, (SELECT earned_at FROM achievements a WHERE a.game_id = g.id AND a.type = 'platinum' AND a.earned = 1) AS plat_at
     FROM games g WHERE json_extract(g.psn_earned, '$.platinum') = 1
        OR (g.xbox_ach_total > 0 AND g.xbox_ach_earned = g.xbox_ach_total)
     ORDER BY plat_at DESC`,
  );
}

export function inProgressGames(): Promise<GameRow[]> {
  return all<GameRow>(
    `SELECT * FROM games WHERE COALESCE(psn_progress, xbox_progress) BETWEEN 1 AND 99
     ORDER BY COALESCE(psn_progress, xbox_progress) DESC`,
  );
}
