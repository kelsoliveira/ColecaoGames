import "server-only";
import { markDetected } from "./consoles";
import { all, batch, get, run } from "./db";
import { platformFamily, titleSimilarity } from "./format";
import { setSetting } from "./settings";
import type { GameRow } from "./types";

// Integração via OpenXBL (https://xbl.io). Modo "sem armazenamento": a chave de API é
// informada a cada sincronização e não é gravada. Plano gratuito: ~150 requisições/hora.
const BASE = "https://xbl.io/api/v2";

async function call<T>(key: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Authorization": key, Accept: "application/json", "Accept-Language": "pt-BR" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("Chave da OpenXBL inválida.");
  if (res.status === 429) throw new Error("Limite de requisições da OpenXBL atingido. Tente novamente mais tarde.");
  if (!res.ok) throw new Error(`OpenXBL ${path}: ${res.status}`);
  return (await res.json()) as T;
}

type AccountResponse = { profileUsers: { id: string; settings: { id: string; value: string }[] }[] };

type TitleHistory = {
  xuid: string;
  titles: {
    titleId: string;
    name: string;
    type: string;
    devices: string[];
    displayImage?: string;
    achievement?: {
      currentAchievements: number;
      totalAchievements: number;
      currentGamerscore: number;
      totalGamerscore: number;
      progressPercentage: number;
    };
    titleHistory?: { lastTimePlayed?: string };
  }[];
};

type AchievementsResponse = {
  achievements: {
    id: string;
    name: string;
    description?: string;
    lockedDescription?: string;
    isSecret?: boolean;
    progressState: string;
    progression?: { timeUnlocked?: string };
    mediaAssets?: { url: string }[];
    rewards?: { value: string; type: string }[];
    rarity?: { currentPercentage?: number };
  }[];
};

function platformFromDevices(devices: string[]): string {
  if (devices.includes("XboxSeries")) return "Xbox Series";
  if (devices.includes("XboxOne")) return "Xbox One";
  if (devices.includes("Xbox360")) return "Xbox 360";
  if (devices.includes("PC") || devices.includes("Win32")) return "PC";
  return "Xbox One";
}

export type XboxSyncReport = {
  titles: number;
  matched: number;
  created: number;
  details: number;
  remaining: number;
  errors: string[];
};

export async function syncXbox(apiKey: string, maxDetails = 60, budgetMs = 240_000): Promise<XboxSyncReport> {
  const started = Date.now();
  const key = apiKey.trim();
  const report: XboxSyncReport = { titles: 0, matched: 0, created: 0, details: 0, remaining: 0, errors: [] };

  const acc = await call<AccountResponse>(key, "/account");
  const user = acc.profileUsers?.[0];
  if (!user) throw new Error("Não foi possível ler o perfil Xbox com essa chave.");
  const setting = (id: string) => user.settings.find((s) => s.id === id)?.value ?? null;
  await setSetting("xbox_xuid", user.id);
  await setSetting("xbox_gamertag", setting("Gamertag") ?? setting("ModernGamertag"));
  await setSetting("xbox_avatar", setting("GameDisplayPicRaw"));
  await setSetting("xbox_gamerscore", setting("Gamerscore"));

  const history = await call<TitleHistory>(key, "/player/titleHistory");
  const titles = history.titles.filter(
    (t) => t.type === "Game" && t.devices.some((d) => d.startsWith("Xbox") || d === "PC"),
  );
  report.titles = titles.length;

  // Consoles em que você jogou (o Xbox não lista os aparelhos da conta; usamos o histórico)
  const devicesUsed = new Set(titles.flatMap((t) => t.devices));
  if (devicesUsed.has("XboxSeries")) await markDetected("Xbox Series", "Xbox Series X|S", "xbox");
  if (devicesUsed.has("XboxOne")) await markDetected("Xbox One", "Xbox One", "xbox");

  const games = await all<GameRow>("SELECT * FROM games");
  const byTitle = new Map(games.filter((g) => g.xbox_title_id).map((g) => [g.xbox_title_id!, g]));
  const free = games.filter((g) => !g.xbox_title_id && (platformFamily(g.platform) === "xbox" || g.platform === "PC"));

  for (const t of titles) {
    try {
      let game = byTitle.get(t.titleId);
      if (!game) {
        let best: GameRow | null = null;
        let bestScore = 0;
        for (const g of free) {
          if (g.platform === "PC" && !t.devices.includes("PC")) continue;
          const s = titleSimilarity(t.name, g.title);
          if (s >= 0.75 && s > bestScore) {
            best = g;
            bestScore = s;
          }
        }
        if (best) {
          game = best;
          free.splice(free.indexOf(best), 1);
          report.matched++;
        } else {
          const { id } = await run(
            "INSERT INTO games (title, platform, format, status, owned) VALUES (?, ?, 'digital', 'backlog', 1)",
            [t.name, platformFromDevices(t.devices)],
          );
          game = (await get<GameRow>("SELECT * FROM games WHERE id = ?", [id]))!;
          report.created++;
        }
        byTitle.set(t.titleId, game);
      }
      const a = t.achievement;
      await run(
        `UPDATE games SET xbox_title_id=:tid, xbox_icon=:icon, xbox_progress=:progress, xbox_ach_earned=:earned,
           xbox_ach_total=:total, xbox_gs_earned=:gs, xbox_gs_total=:gst,
           last_played = CASE WHEN :last IS NOT NULL AND (last_played IS NULL OR last_played < :last) THEN :last ELSE last_played END,
           cover_url = COALESCE(cover_url, :icon),
           status = CASE
             WHEN :total > 0 AND :earned = :total AND status IN ('backlog','jogando','zerado') THEN 'platinado'
             WHEN :earned > 0 AND status = 'backlog' THEN 'jogando'
             ELSE status END,
           updated_at=datetime('now')
         WHERE id=:id`,
        {
          id: game.id,
          tid: t.titleId,
          icon: t.displayImage ?? null,
          progress: a?.progressPercentage ?? 0,
          earned: a?.currentAchievements ?? 0,
          total: a?.totalAchievements ?? 0,
          gs: a?.currentGamerscore ?? 0,
          gst: a?.totalGamerscore ?? 0,
          last: t.titleHistory?.lastTimePlayed ?? null,
        },
      );
    } catch (e) {
      report.errors.push(`${t.name}: ${(e as Error).message}`);
    }
  }

  // Conquistas detalhadas só dos títulos que mudaram (limite da OpenXBL e do tempo da função)
  const stale = await all<GameRow>(
    `SELECT * FROM games WHERE xbox_title_id IS NOT NULL AND xbox_ach_total > 0 AND platform <> 'Xbox 360'
       AND (xbox_details_count IS NULL OR xbox_details_count <> xbox_ach_earned)
     ORDER BY last_played DESC`,
  );
  for (const g of stale.slice(0, maxDetails)) {
    if (Date.now() - started > budgetMs) break;
    try {
      await syncAchievements(key, user.id, g);
      report.details++;
    } catch (e) {
      report.errors.push(`Conquistas de ${g.title}: ${(e as Error).message}`);
      if (/Limite/.test((e as Error).message)) break;
    }
  }
  report.remaining = Math.max(0, stale.length - report.details);

  await setSetting("xbox_last_sync", new Date().toISOString());
  return report;
}

async function syncAchievements(key: string, xuid: string, g: GameRow) {
  const data = await call<AchievementsResponse>(key, `/achievements/player/${xuid}/${g.xbox_title_id}`);
  const list = data.achievements ?? [];
  const earnedCount = list.filter((a) => a.progressState === "Achieved").length;
  await batch([
    ...list.map((a) => {
      const earned = a.progressState === "Achieved";
      const unlocked = a.progression?.timeUnlocked;
      return {
        sql: `INSERT INTO achievements (game_id, source, ext_id, name, description, icon_url, type, points, rarity, hidden, earned, earned_at)
              VALUES (?, 'xbox', ?, ?, ?, ?, 'gamerscore', ?, ?, ?, ?, ?)
              ON CONFLICT (game_id, source, ext_id) DO UPDATE SET name=excluded.name, description=excluded.description,
                icon_url=excluded.icon_url, points=excluded.points, rarity=excluded.rarity, hidden=excluded.hidden,
                earned=excluded.earned, earned_at=excluded.earned_at`,
        args: [
          g.id,
          a.id,
          a.name,
          (earned ? a.description : a.lockedDescription || a.description) ?? null,
          a.mediaAssets?.[0]?.url ?? null,
          Number(a.rewards?.find((r) => r.type === "Gamerscore")?.value ?? 0),
          a.rarity?.currentPercentage ?? null,
          a.isSecret ? 1 : 0,
          earned ? 1 : 0,
          earned && unlocked && !unlocked.startsWith("0001") ? unlocked : null,
        ],
      };
    }),
    {
      sql: "UPDATE games SET xbox_details_at=datetime('now'), xbox_details_count=? WHERE id=?",
      args: [earnedCount, g.id],
    },
  ]);
}
