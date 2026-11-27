import "server-only";
import fs from "node:fs";
import path from "node:path";
import { all, get, run } from "./db";
import { GuideFileSchema, parseGuide, type Guide, type GuideFile, type GuideRow } from "./guide-schema";
import type { AchievementRow, GameRow } from "./types";

// Guias de platina/100% são escritos pelo Claude Code (no GitHub Actions, acionado pelo botão do site,
// ou numa sessão do Claude Code) e salvos no repositório em guides/<slug>.json. O site lê esses arquivos.
// Não há chamada direta à API da Anthropic: o uso entra no plano do Claude configurado no GitHub.

const GUIDES_DIR = path.join(process.cwd(), "guides");

/** Só plataformas com troféus (PS3 em diante, Vita) ou conquistas (Xbox 360 em diante). */
export const guideKind = (platform: string): "platina" | "100" | null => {
  if (["PS5", "PS4", "PS3", "PS Vita"].includes(platform)) return "platina";
  if (["Xbox Series", "Xbox One", "Xbox 360"].includes(platform)) return "100";
  return null;
};

export type Source = { title: string; url: string };

/** Identificador estável do guia (não depende do ID do banco, que é diferente em cada instalação). */
export function guideSlug(game: Pick<GameRow, "title" | "platform">): string {
  const s = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[™®©]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${s(game.platform)}--${s(game.title)}`;
}

export function readGuideFile(slug: string): GuideFile | null {
  try {
    const raw = fs.readFileSync(path.join(GUIDES_DIR, `${slug}.json`), "utf8");
    return GuideFileSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Guia do jogo; se for parte de uma coletânea sem guia próprio, usa o guia da coletânea. */
function guideFileFor(game: Pick<GameRow, "title" | "platform" | "collection">): GuideFile | null {
  return (
    readGuideFile(guideSlug(game)) ??
    (game.collection ? readGuideFile(guideSlug({ title: game.collection, platform: game.platform })) : null)
  );
}

export type LoadedGuide = {
  guide: Guide;
  sources: Source[];
  updatedAt: string;
  edited: boolean;
  origin: "arquivo" | "banco";
};

/**
 * O guia vem do arquivo do repositório. Se você corrigiu marcações de perdível no site, a cópia editada
 * fica no banco e tem prioridade, até que um guia mais novo seja gerado.
 */
export async function loadGuide(game: GameRow): Promise<LoadedGuide | null> {
  const file = guideFileFor(game);
  const row = await get<GuideRow>("SELECT * FROM guides WHERE game_id = ?", [game.id]);
  const dbGuide = parseGuide(row);
  const fileTime = file ? new Date(file.generated_at).getTime() : 0;
  const rowTime = row ? new Date(`${row.updated_at.replace(" ", "T")}Z`).getTime() : 0;
  if (dbGuide && row && (!file || rowTime >= fileTime)) {
    return {
      guide: dbGuide,
      sources: row.sources ? (JSON.parse(row.sources) as Source[]) : (file?.sources ?? []),
      updatedAt: row.updated_at,
      edited: !!row.edited,
      origin: "banco",
    };
  }
  if (file) return { guide: file.guide, sources: file.sources, updatedAt: file.generated_at, edited: false, origin: "arquivo" };
  return null;
}

/** Para a lista de guias: quais jogos têm guia (arquivo ou cópia editada no banco). */
export async function guidesForGames(games: GameRow[]): Promise<Map<number, Guide>> {
  const rows = await all<GuideRow>("SELECT * FROM guides");
  const byId = new Map(rows.map((r) => [r.game_id, parseGuide(r)]));
  const out = new Map<number, Guide>();
  for (const g of games) {
    const db = byId.get(g.id);
    const file = guideFileFor(g);
    const chosen = db ?? file?.guide ?? null;
    if (chosen) out.set(g.id, chosen);
  }
  return out;
}

/** Corrige manualmente a marcação de perdível. A primeira correção copia o guia do arquivo para o banco. */
export async function toggleMissable(game: GameRow, index: number) {
  const loaded = await loadGuide(game);
  if (!loaded) return;
  const data = structuredClone(loaded.guide);
  const t = data.trophies[index];
  if (!t) return;
  t.missable = !t.missable;
  await run(
    `INSERT INTO guides (game_id, kind, data, sources, model, edited) VALUES (?, ?, ?, ?, 'claude-code', 1)
     ON CONFLICT (game_id) DO UPDATE SET data = excluded.data, sources = excluded.sources, edited = 1, updated_at = datetime('now')`,
    [game.id, guideKind(game.platform) ?? "platina", JSON.stringify(data), JSON.stringify(loaded.sources)],
  );
}

// ---------------- Acionamento pelo botão (GitHub Actions + Claude Code) ----------------

const WORKFLOW = "guia.yml";

function githubConfig() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO; // ex.: usuario/ColecaoGames
  const branch = process.env.GITHUB_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "main";
  return token && repo ? { token, repo, branch } : null;
}

export const guideAutomationAvailable = () => !!githubConfig();

async function github(pathname: string, init?: RequestInit) {
  const cfg = githubConfig()!;
  return fetch(`https://api.github.com/repos/${cfg.repo}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
}

function trophyTable(achievements: AchievementRow[]): string {
  return achievements
    .map((a) =>
      [
        `id=${a.ext_id}`,
        a.type === "gamerscore" ? `${a.points ?? 0}G` : a.type,
        `pt="${a.name ?? ""}"`,
        a.name_en ? `en="${a.name_en}"` : "",
        `desc="${a.description_en ?? a.description ?? ""}"`,
        a.rarity != null ? `raridade=${a.rarity}%` : "",
        a.hidden ? "oculto" : "",
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

export async function requestGuide(gameId: number) {
  const cfg = githubConfig();
  if (!cfg) throw new Error("Automação não configurada: defina GITHUB_DISPATCH_TOKEN e GITHUB_REPO na Vercel.");
  const game = await get<GameRow>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) throw new Error("Jogo não encontrado.");
  const kind = guideKind(game.platform);
  if (!kind) throw new Error("Guias estão disponíveis para jogos de PlayStation e Xbox.");

  const achievements = await all<AchievementRow>(
    "SELECT * FROM achievements WHERE game_id = ? AND source = ? ORDER BY CAST(ext_id AS INTEGER), ext_id",
    [gameId, kind === "platina" ? "psn" : "xbox"],
  );
  const slug = guideSlug(game);
  // Limite do GitHub para os dados enviados a uma execução manual: ~65 mil caracteres no total.
  const trophies = trophyTable(achievements).slice(0, 55_000);

  const res = await github(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: cfg.branch, inputs: { title: game.title, platform: game.platform, kind, slug, trophies } }),
  });
  if (res.status !== 204 && res.status !== 200) {
    throw new Error(`O GitHub recusou o pedido (${res.status}). Confira o token e o nome do repositório.`);
  }
  await run(
    `INSERT INTO guide_requests (game_id, slug, requested_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT (game_id) DO UPDATE SET slug = excluded.slug, requested_at = excluded.requested_at`,
    [gameId, slug],
  );
}

export type GuideRequestStatus =
  | { state: "nenhum" }
  | { state: "fila" | "rodando" | "publicando" | "falhou"; since: string; url: string | null };

/** Situação do último pedido de guia deste jogo (consulta o GitHub Actions). */
export async function guideRequestStatus(game: GameRow, loaded: LoadedGuide | null): Promise<GuideRequestStatus> {
  const req = await get<{ slug: string; requested_at: string }>(
    "SELECT slug, requested_at FROM guide_requests WHERE game_id = ?",
    [game.id],
  );
  if (!req) return { state: "nenhum" };
  const requestedAt = new Date(`${req.requested_at.replace(" ", "T")}Z`);
  if (loaded && new Date(loaded.updatedAt).getTime() >= requestedAt.getTime()) return { state: "nenhum" };
  if (Date.now() - requestedAt.getTime() > 2 * 3600_000) return { state: "nenhum" }; // pedido antigo: libera o botão

  const since = req.requested_at;
  if (!githubConfig()) return { state: "fila", since, url: null };
  try {
    const res = await github(`/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=20`);
    if (!res.ok) return { state: "fila", since, url: null };
    const json = (await res.json()) as {
      workflow_runs: { display_title: string; status: string; conclusion: string | null; html_url: string; created_at: string }[];
    };
    const runItem = json.workflow_runs.find(
      (r) => r.display_title.includes(`[${req.slug}]`) && new Date(r.created_at).getTime() >= requestedAt.getTime() - 120_000,
    );
    if (!runItem) return { state: "fila", since, url: null };
    if (runItem.status !== "completed") return { state: runItem.status === "in_progress" ? "rodando" : "fila", since, url: runItem.html_url };
    if (runItem.conclusion === "success") return { state: "publicando", since, url: runItem.html_url };
    return { state: "falhou", since, url: runItem.html_url };
  } catch {
    return { state: "fila", since, url: null };
  }
}
