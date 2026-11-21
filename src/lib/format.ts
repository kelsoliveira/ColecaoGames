import type { TrophyCounts } from "./types";

export const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function hours(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const secondsToHours = (s: number | null | undefined) =>
  s ? `${Math.round((s / 3600) * 10) / 10} h` : "—";

export function date(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export const emptyTrophies = (): TrophyCounts => ({ bronze: 0, silver: 0, gold: 0, platinum: 0 });

/** ISO-8601 duration (PT228H56M33S) -> minutos */
export function isoDurationToMinutes(d: string | null | undefined): number {
  if (!d) return 0;
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
  if (!m) return 0;
  const [, days, h, min] = m;
  return Number(days ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(min ?? 0);
}

/** Normaliza um título para comparação entre fontes (PSN, Xbox, IGDB, catálogo). */
export function normalizeTitle(t: string): string {
  const roman: Record<string, string> = {
    i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10",
    xi: "11", xii: "12", xiii: "13", xiv: "14", xv: "15", xvi: "16",
  };
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/δ|delta/g, "delta")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => roman[w] ?? w)
    .filter((w) => !["the", "a", "of", "and", "edition", "ps4", "ps5", "trophies", "trophy"].includes(w))
    .join(" ");
}

/** Similaridade 0..1 entre dois títulos (Jaccard de palavras + bônus de prefixo). */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const sa = new Set(na.split(" "));
  const sb = new Set(nb.split(" "));
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const jaccard = inter / (sa.size + sb.size - inter);
  const prefix = na.startsWith(nb) || nb.startsWith(na) ? 0.15 : 0;
  return Math.min(0.99, jaccard + prefix);
}

export function platformFamily(p: string): "playstation" | "xbox" | "nintendo" | "pc" | "outro" {
  if (/^ps|playstation/i.test(p)) return "playstation";
  if (/xbox/i.test(p)) return "xbox";
  if (/switch|nintendo|wii|3ds|ds|gamecube|n64/i.test(p)) return "nintendo";
  if (/pc|steam/i.test(p)) return "pc";
  return "outro";
}
