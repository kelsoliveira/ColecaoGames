import { z } from "zod";

// Formato do guia gerado pela IA (validado pela saída estruturada da API e de novo ao ler do banco).
export const GuideSchema = z.object({
  summary_pt: z.string().describe("Visão geral do caminho até a platina/100%, 2 a 4 frases, em português do Brasil"),
  summary_en: z.string().describe("Same overview in English"),
  difficulty: z.number().describe("Dificuldade estimada de 1 (muito fácil) a 10 (extremamente difícil)"),
  estimated_hours: z.number().describe("Tempo estimado para platina/100%, em horas"),
  min_playthroughs: z.number().describe("Número mínimo de jogadas completas necessárias"),
  online_required: z.boolean().describe("Se há troféus/conquistas que exigem jogar online"),
  missable_warning_pt: z.string().describe("Aviso curto sobre perdíveis (ou que não há perdíveis), em português"),
  missable_warning_en: z.string(),
  roadmap: z
    .array(
      z.object({
        title_pt: z.string(),
        title_en: z.string(),
        steps_pt: z.array(z.string()),
        steps_en: z.array(z.string()),
      }),
    )
    .describe("Etapas em ordem (ex.: 1ª jogada, limpeza, dificuldade, online)"),
  trophies: z
    .array(
      z.object({
        ext_id: z.string().nullable().describe("ID exato da lista oficial informada; null só se não houver lista oficial"),
        name_pt: z.string(),
        name_en: z.string(),
        type: z.string().describe("platinum, gold, silver, bronze ou gamerscore"),
        missable: z.boolean().describe("true somente se o troféu puder ser perdido sem volta (exige nova jogada/save)"),
        tip_pt: z.string().describe("Dica curta e prática (1-2 frases); vazio se o troféu for automático da história"),
        tip_en: z.string(),
      }),
    )
    .describe("Um item para cada troféu/conquista"),
  platinum_tip_pt: z.string().describe("Dica final para fechar a platina/100%"),
  platinum_tip_en: z.string(),
  confidence_note_pt: z
    .string()
    .describe("O que não foi possível confirmar nas fontes; vazio se tudo foi confirmado"),
  confidence_note_en: z.string(),
});

export type Guide = z.infer<typeof GuideSchema>;

// Arquivo salvo no repositório em guides/<slug>.json (escrito pelo Claude Code no GitHub Actions ou na sessão).
export const GuideFileSchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  platform: z.string(),
  kind: z.enum(["platina", "100"]),
  generated_at: z.string().describe("Data/hora ISO 8601 em que o guia foi gerado"),
  generator: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  guide: GuideSchema,
});

export type GuideFile = z.infer<typeof GuideFileSchema>;

export type GuideRow = {
  game_id: number;
  kind: "platina" | "100";
  data: string;
  sources: string | null;
  video_id: string | null;
  video_title: string | null;
  model: string | null;
  edited: number;
  created_at: string;
  updated_at: string;
};

export function parseGuide(row: GuideRow | undefined): Guide | null {
  if (!row) return null;
  try {
    return GuideSchema.parse(JSON.parse(row.data));
  } catch {
    return null;
  }
}

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type OfficialLike = { ext_id: string; name: string | null; name_en: string | null };

/**
 * Liga cada troféu oficial ao item correspondente do guia: primeiro pelo ID oficial (ext_id) e,
 * para guias escritos antes da sincronização, pelo nome em inglês ou em português.
 * Devolve um mapa ext_id oficial -> índice em guide.trophies.
 */
export function matchGuideTrophies(trophies: Guide["trophies"], official: OfficialLike[]): Map<string, number> {
  const out = new Map<string, number>();
  const used = new Set<number>();
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  trophies.forEach((t, i) => {
    if (t.ext_id) byId.set(t.ext_id, i);
    for (const n of [norm(t.name_en), norm(t.name_pt)]) if (n && !byName.has(n)) byName.set(n, i);
  });
  for (const a of official) {
    const i = byId.get(a.ext_id);
    if (i != null && !used.has(i)) {
      out.set(a.ext_id, i);
      used.add(i);
    }
  }
  for (const a of official) {
    if (out.has(a.ext_id)) continue;
    for (const n of [norm(a.name_en), norm(a.name)]) {
      const i = n ? byName.get(n) : undefined;
      if (i != null && !used.has(i)) {
        out.set(a.ext_id, i);
        used.add(i);
        break;
      }
    }
  }
  return out;
}
