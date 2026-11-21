import "server-only";
import { db } from "./db";
import { platformFamily, titleSimilarity } from "./format";
import { clearSettings, getSetting, setSetting } from "./settings";
import type { GameRow } from "./types";

// Integração via OpenXBL (https://xbl.io): o usuário entra com a conta Microsoft/Xbox
// no site da OpenXBL e copia a chave de API pessoal. Plano gratuito: ~150 requisições/hora.
const BASE = "https://xbl.io/api/v2";

async function call<T>(path: string, key = getSetting("xbox_api_key")): Promise<T> {
  if (!key) throw new Error("Conta Xbox não conectada. Informe a chave da OpenXBL em Contas.");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Authorization": key, Accept: "application/json", "Accept-Language": "pt-BR" },
  });
  if (res.status === 429) throw new Error("Limite de requisições da OpenXBL atingido. Tente novamente mais tarde.");
  if (!res.ok) throw new Error(`OpenXBL ${path}: ${res.status}`);
  return (await res.json()) as T;
}

type AccountResponse = {
  profileUsers: { id: string; settings: { id: string; value: string }[] }[];
};

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

export async function connectXbox(apiKey: string) {
  const key = apiKey.trim();
  const acc = await call<AccountResponse>("/account", key);
  const user = acc.profileUsers?.[0];
  if (!user) throw new Error("Não foi possível ler o perfil Xbox com essa chave.");
  const get = (id: string) => user.settings.find((s) => s.id === id)?.value ?? null;
  setSetting("xbox_api_key", key);
  setSetting("xbox_xuid", user.id);
  setSetting("xbox_gamertag", get("Gamertag") ?? get("ModernGamertag"));
  setSetting("xbox_avatar", get("GameDisplayPicRaw"));
  setSetting("xbox_gamerscore", get("Gamerscore"));
}

export function disconnectXbox() {
  clearSettings("xbox_");
}

export const xboxConnected = () => !!getSetting("xbox_api_key");

function platformFromDevices(devices: string[]): string {
  if (devices.includes("XboxSeries")) return "Xbox Series";
  if (devices.includes("XboxOne")) return "Xbox One";
  if (devices.includes("Xbox360")) return "Xbox 360";
  if (devices.includes("PC") || devices.includes("Win32")) return "PC";
  return "Xbox One";
}

export type XboxSyncReport = { titles: number; matched: number; created: number; details: number; errors: string[] };

export async function syncXbox(maxDetails = 60): Promise<XboxSyncReport> {
  const report: XboxSyncReport = { titles: 0, matched: 0, created: 0, details: 0, errors: [] };
  const database = db();

  try {
    const acc = await call<AccountResponse>("/account");
    const gs = acc.profileUsers?.[0]?.settings.find((s) => s.id === "Gamerscore")?.value;
    if (gs) setSetting("xbox_gamerscore", gs);
  } catch {
    /* opcional */
  }

  const history = await call<TitleHistory>("/player/titleHistory");
  const games = history.titles.filter(
    (t) => t.type === "Game" && t.devices.some((d) => d.startsWith("Xbox") || d === "PC"),
  );
  report.titles = games.length;

  const upd = database.prepare(
    `UPDATE games SET xbox_title_id=@tid, xbox_icon=@icon, xbox_progress=@progress, xbox_ach_earned=@earned,
       xbox_ach_total=@total, xbox_gs_earned=@gs, xbox_gs_total=@gst,
       last_played = CASE WHEN last_played IS NULL OR last_played < @last THEN @last ELSE last_played END,
       cover_url = COALESCE(cover_url, @icon),
       status = CASE
         WHEN @total > 0 AND @earned = @total AND status IN ('backlog','jogando','zerado') THEN 'platinado'
         WHEN @earned > 0 AND status = 'backlog' THEN 'jogando'
         ELSE status END,
       updated_at=datetime('now')
     WHERE id=@id`,
  );

  for (const t of games) {
    try {
      let game = database.prepare("SELECT * FROM games WHERE xbox_title_id = ?").get(t.titleId) as GameRow | undefined;
      if (!game) {
        const candidates = (database.prepare("SELECT * FROM games WHERE xbox_title_id IS NULL").all() as GameRow[]).filter(
          (g) => platformFamily(g.platform) === "xbox" || (g.platform === "PC" && t.devices.includes("PC")),
        );
        let best: GameRow | null = null;
        let bestScore = 0;
        for (const g of candidates) {
          const s = titleSimilarity(t.name, g.title);
          if (s >= 0.75 && s > bestScore) {
            best = g;
            bestScore = s;
          }
        }
        if (best) {
          game = best;
          report.matched++;
        } else {
          const id = database
            .prepare("INSERT INTO games (title, platform, format, status, owned) VALUES (?, ?, 'digital', 'backlog', 1)")
            .run(t.name, platformFromDevices(t.devices)).lastInsertRowid as number;
          game = database.prepare("SELECT * FROM games WHERE id = ?").get(id) as GameRow;
          report.created++;
        }
      }
      const a = t.achievement;
      upd.run({
        id: game.id,
        tid: t.titleId,
        icon: t.displayImage ?? null,
        progress: a?.progressPercentage ?? 0,
        earned: a?.currentAchievements ?? 0,
        total: a?.totalAchievements ?? 0,
        gs: a?.currentGamerscore ?? 0,
        gst: a?.totalGamerscore ?? 0,
        last: t.titleHistory?.lastTimePlayed ?? null,
      });
    } catch (e) {
      report.errors.push(`${t.name}: ${(e as Error).message}`);
    }
  }

  // Detalhes de conquistas só para títulos que mudaram (respeitando o limite da OpenXBL)
  const stale = database
    .prepare(
      `SELECT * FROM games WHERE xbox_title_id IS NOT NULL AND xbox_ach_total > 0 AND platform <> 'Xbox 360'
         AND (xbox_details_count IS NULL OR xbox_details_count <> xbox_ach_earned)
       ORDER BY last_played DESC LIMIT ?`,
    )
    .all(maxDetails) as GameRow[];
  for (const g of stale) {
    try {
      await syncXboxAchievements(g);
      report.details++;
    } catch (e) {
      report.errors.push(`Conquistas de ${g.title}: ${(e as Error).message}`);
      if (/Limite/.test((e as Error).message)) break;
    }
  }

  setSetting("xbox_last_sync", new Date().toISOString());
  return report;
}

export async function syncXboxAchievements(g: GameRow) {
  const xuid = getSetting("xbox_xuid");
  if (!g.xbox_title_id || !xuid) return;
  const data = await call<AchievementsResponse>(`/achievements/player/${xuid}/${g.xbox_title_id}`);
  const database = db();
  const upsert = database.prepare(
    `INSERT INTO achievements (game_id, source, ext_id, name, description, icon_url, type, points, rarity, hidden, earned, earned_at)
     VALUES (@game_id, 'xbox', @ext_id, @name, @description, @icon_url, 'gamerscore', @points, @rarity, @hidden, @earned, @earned_at)
     ON CONFLICT (game_id, source, ext_id) DO UPDATE SET name=excluded.name, description=excluded.description,
       icon_url=excluded.icon_url, points=excluded.points, rarity=excluded.rarity, hidden=excluded.hidden,
       earned=excluded.earned, earned_at=excluded.earned_at`,
  );
  let earnedCount = 0;
  database.transaction(() => {
    for (const a of data.achievements ?? []) {
      const earned = a.progressState === "Achieved";
      if (earned) earnedCount++;
      const unlocked = a.progression?.timeUnlocked;
      upsert.run({
        game_id: g.id,
        ext_id: a.id,
        name: a.name,
        description: (earned ? a.description : a.lockedDescription || a.description) ?? null,
        icon_url: a.mediaAssets?.[0]?.url ?? null,
        points: Number(a.rewards?.find((r) => r.type === "Gamerscore")?.value ?? 0),
        rarity: a.rarity?.currentPercentage ?? null,
        hidden: a.isSecret ? 1 : 0,
        earned: earned ? 1 : 0,
        earned_at: earned && unlocked && !unlocked.startsWith("0001") ? unlocked : null,
      });
    }
    database.prepare("UPDATE games SET xbox_details_at=datetime('now'), xbox_details_count=? WHERE id=?").run(earnedCount, g.id);
  })();
}
