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
