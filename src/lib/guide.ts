import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { all, get, run } from "./db";
import { platformFamily } from "./format";
import { GuideSchema, type Guide, type GuideRow } from "./guide-schema";
import type { AchievementRow, GameRow } from "./types";

// Guias gerados com a API da Anthropic, em duas etapas:
//  1) pesquisa com busca na web (fontes de troféus/conquistas) -> notas em texto + links das fontes
//  2) montagem do guia em JSON estruturado (PT-BR + EN) a partir da lista oficial de troféus e das notas.
// As etapas são separadas porque citações da busca não podem ser combinadas com saída estruturada.

const MODEL = "claude-opus-5-5";
// Se a IA recusar um pedido, a própria API tenta de novo com outro modelo adequado.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export const guideAvailable = () => !!process.env.ANTHROPIC_API_KEY;

export const guideKind = (platform: string): "platina" | "100" | null => {
  const fam = platformFamily(platform);
  return fam === "playstation" ? "platina" : fam === "xbox" ? "100" : null;
};

export type Source = { title: string; url: string };

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

async function research(client: Anthropic, game: GameRow, kind: "platina" | "100", list: string) {
  const goal = kind === "platina" ? `a platina de "${game.title}" no ${game.platform}` : `100% das conquistas (1000G) de "${game.title}" no ${game.platform}`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content:
        `Pesquise na web como conseguir ${goal}. Consulte várias fontes especializadas ` +
        `(ex.: PSNProfiles, PowerPyx, PlayStationTrophies, TrueAchievements, TrueTrophies, Exophase, fóruns) e compare-as.\n\n` +
        `Anote, em tópicos e com suas próprias palavras (não copie trechos longos):\n` +
        `- dificuldade, tempo estimado, número mínimo de jogadas, se exige online e se há troféus bugados;\n` +
        `- TODOS os troféus/conquistas perdíveis, com o momento exato em que podem ser perdidos;\n` +
        `- o roteiro recomendado (ordem das jogadas, seleção de capítulos, dificuldade);\n` +
        `- dicas para os troféus mais difíceis ou raros.\n` +
        `Diga claramente quando as fontes discordarem ou quando algo não estiver confirmado.\n\n` +
        (list ? `Lista oficial de troféus/conquistas (para referência):\n${list}` : "Não há lista oficial disponível; identifique os troféus pelas fontes."),
    },
  ];
  const sources = new Map<string, string>();
  let notes = "";
  for (let i = 0; i < 4; i++) {
    const response = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 16000,
        ...FALLBACK,
        output_config: { effort: "medium" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
        messages,
      })
      .finalMessage();
    if (response.stop_reason === "refusal") throw new Error("A IA não pôde pesquisar este jogo.");
    for (const block of response.content) {
      if (block.type === "text") notes += block.text;
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
      }
    }
    // A busca roda num loop no servidor; se ele pausar, reenviamos para continuar de onde parou.
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return { notes, sources: [...sources].map(([url, title]) => ({ url, title })) };
}

async function compose(client: Anthropic, game: GameRow, kind: "platina" | "100", list: string, notes: string): Promise<Guide> {
  const response = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(GuideSchema) },
      system:
        "Você escreve guias de troféus e conquistas para um site brasileiro. Escreva em português do Brasil natural e, " +
        "em paralelo, a versão em inglês de cada campo. Seja prático e direto. Marque um troféu como perdível somente " +
        "quando as notas de pesquisa indicarem isso; na dúvida, não marque e registre a dúvida em confidence_note.",
      messages: [
        {
          role: "user",
          content:
            `Monte o guia de ${kind === "platina" ? "platina" : "100% das conquistas"} de "${game.title}" (${game.platform}).\n\n` +
            (list
              ? `Lista oficial (use exatamente estes ids em ext_id, um item por troféu, na mesma ordem):\n${list}\n\n`
              : "Não há lista oficial: use os troféus citados nas notas, com ext_id = null.\n\n") +
            `Notas de pesquisa:\n${notes}`,
        },
      ],
    })
    .finalMessage();
  if (response.stop_reason === "refusal") throw new Error("A IA não pôde montar este guia.");
  if (response.stop_reason === "max_tokens") throw new Error("O guia ficou grande demais. Tente novamente.");
  if (!response.parsed_output) throw new Error("A resposta da IA veio em formato inesperado. Tente novamente.");
  return response.parsed_output;
}

/** Busca um vídeo de guia no YouTube (opcional: só com YOUTUBE_API_KEY). */
async function findVideo(game: GameRow, kind: "platina" | "100") {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const q = `${game.title} ${kind === "platina" ? "platinum trophy guide" : "achievement guide 1000G"}`;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({ part: "snippet", type: "video", maxResults: "1", q, key }).toString();
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string } }[] };
    const item = json.items?.[0];
    return item ? { id: item.id.videoId, title: item.snippet.title } : null;
  } catch {
    return null;
  }
}

export async function generateGuide(gameId: number) {
  if (!guideAvailable()) throw new Error("Configure ANTHROPIC_API_KEY nas variáveis de ambiente para gerar guias.");
  const game = await get<GameRow>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) throw new Error("Jogo não encontrado.");
  const kind = guideKind(game.platform);
  if (!kind) throw new Error("Guias estão disponíveis para jogos de PlayStation e Xbox.");

  const source = kind === "platina" ? "psn" : "xbox";
  const achievements = await all<AchievementRow>(
    "SELECT * FROM achievements WHERE game_id = ? AND source = ? ORDER BY CAST(ext_id AS INTEGER), ext_id",
    [gameId, source],
  );
  const list = trophyTable(achievements);

  const client = new Anthropic();
  const { notes, sources } = await research(client, game, kind, list);
  const guide = await compose(client, game, kind, list, notes);
  const video = await findVideo(game, kind);

  await run(
    `INSERT INTO guides (game_id, kind, data, sources, video_id, video_title, model, edited)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT (game_id) DO UPDATE SET kind=excluded.kind, data=excluded.data, sources=excluded.sources,
       video_id=excluded.video_id, video_title=excluded.video_title, model=excluded.model, edited=0,
       updated_at=datetime('now')`,
    [gameId, kind, JSON.stringify(guide), JSON.stringify(sources.slice(0, 15)), video?.id ?? null, video?.title ?? null, MODEL],
  );
}

export const getGuideRow = (gameId: number) => get<GuideRow>("SELECT * FROM guides WHERE game_id = ?", [gameId]);

export const allGuideRows = () => all<GuideRow>("SELECT * FROM guides");

/** Corrige manualmente a marcação de perdível de um troféu do guia. */
export async function toggleMissable(gameId: number, index: number) {
  const row = await getGuideRow(gameId);
  if (!row) return;
  const data = JSON.parse(row.data) as Guide;
  const t = data.trophies[index];
  if (!t) return;
  t.missable = !t.missable;
  await run("UPDATE guides SET data = ?, edited = 1, updated_at = datetime('now') WHERE game_id = ?", [JSON.stringify(data), gameId]);
}
