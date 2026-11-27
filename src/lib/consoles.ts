import "server-only";
import { all, run } from "./db";
import type { GameRow } from "./types";

export type ConsoleRow = {
  id: number;
  name: string;
  platform: string;
  model: string | null;
  purchase_date: string | null;
  price_paid: number | null;
  notes: string | null;
  detected_by: string | null;
  detected_at: string | null;
  created_at: string;
};

// Jogos de outras plataformas que rodam no console (retrocompatibilidade).
const BACKWARD: Record<string, string[]> = {
  PS5: ["PS4"],
  "Xbox Series": ["Xbox One", "Xbox 360", "Xbox"],
  "Xbox One": ["Xbox 360", "Xbox"],
  "Switch 2": ["Switch"],
};

export const listConsoles = () => all<ConsoleRow>("SELECT * FROM consoles ORDER BY id");

export type ConsoleStats = {
  games: number;
  physical: number;
  digital: number;
  playable: number; // inclui retrocompatíveis
  minutes: number;
  completed: number;
  paid: number;
};

export function consoleStats(c: ConsoleRow, games: GameRow[]): ConsoleStats {
  const owned = games.filter((g) => g.status !== "desejado");
  const own = owned.filter((g) => g.platform === c.platform);
  const compatible = owned.filter((g) => (BACKWARD[c.platform] ?? []).includes(g.platform));
  return {
    games: own.length,
    physical: own.filter((g) => g.format === "fisico").length,
    digital: own.filter((g) => g.format === "digital").length,
    playable: own.length + compatible.length,
    minutes: own.reduce((s, g) => s + (g.playtime_minutes ?? 0), 0),
    completed: own.filter((g) => g.status === "zerado" || g.status === "platinado").length,
    paid: own.reduce((s, g) => s + (g.price_paid ?? 0), 0),
  };
}

export const backwardFor = (platform: string) => BACKWARD[platform] ?? [];

/**
 * Marca como detectado um console cadastrado que apareceu na sincronização.
 * Não cria consoles: a lista é a que você mantém na página Meus consoles.
 */
export async function markDetected(platform: string, _name: string, source: "psn" | "xbox") {
  await run("UPDATE consoles SET detected_by = ?, detected_at = datetime('now') WHERE platform = ?", [source, platform]);
}
