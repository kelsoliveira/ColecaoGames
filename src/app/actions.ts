"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, checkPassword, createSession, passwordRequired, verifySession } from "@/lib/auth";
import { batch, get, run } from "@/lib/db";
import { requestGuide, toggleMissable } from "@/lib/guide";
import { applyIgdb, bestIgdbMatch, enrichAll } from "@/lib/igdb";
import { syncPsn } from "@/lib/psn";
import { igdbCredentials } from "@/lib/settings";
import { STATUSES, type GameRow } from "@/lib/types";
import { syncXbox } from "@/lib/xbox";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  // aceita "1.234,56" (pt-BR), "249,90" e "42.5"
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const msg = (path: string, kind: "ok" | "erro", text: string) =>
  `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(text)}`;

/**
 * Server Actions podem ser chamadas a partir de qualquer rota (inclusive /login, que o proxy libera),
 * então cada ação confere a sessão por conta própria.
 */
async function requireAuth() {
  if (!passwordRequired()) return;
  const ok = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/login");
}

// ---------- Jogos ----------

export async function createGame(form: FormData) {
  await requireAuth();
  const title = str(form, "title");
  const platform = str(form, "platform") ?? "PS5";
  if (!title) redirect(msg("/adicionar", "erro", "Informe o título."));
  const status = str(form, "status") ?? "backlog";
  const { id } = await run(
    "INSERT INTO games (title, platform, format, edition, status, price_paid) VALUES (?, ?, ?, ?, ?, ?)",
    [
      title,
      platform,
      str(form, "format") ?? "fisico",
      str(form, "edition"),
      (STATUSES as readonly string[]).includes(status) ? status : "backlog",
      num(form, "price_paid"),
    ],
  );

  // Saga: se o título começa com o nome de uma saga já existente (ex.: "Final Fantasy IX"), usa essa saga.
  await run(
    `UPDATE games SET saga = (
       SELECT s.saga FROM (SELECT DISTINCT saga FROM games WHERE saga IS NOT NULL AND saga <> '') s
       WHERE lower(?) LIKE lower(s.saga) || '%' ORDER BY length(s.saga) DESC LIMIT 1)
     WHERE id = ? AND saga IS NULL`,
    [title, id],
  );

  const igdbId = num(form, "igdb_id");
  try {
    if (igdbId) await applyIgdb(id, igdbId);
    else {
      const m = await bestIgdbMatch(title!, platform);
      if (m) await applyIgdb(id, m.id);
    }
  } catch {
    /* metadados são opcionais: o jogo é salvo mesmo sem IGDB configurado */
  }
  revalidatePath("/", "layout");
  redirect(`/jogo/${id}`);
}

export async function updateGame(id: number, form: FormData) {
  await requireAuth();
  const status = str(form, "status");
  const hours = num(form, "playtime_hours");
  await run(
    `UPDATE games SET title=?, platform=?, format=?, edition=?, saga=?, status=?, user_rating=?, notes=?, price_paid=?,
       purchase_date=?, market_value=?, target_price=?, playtime_minutes=COALESCE(?, playtime_minutes),
       updated_at=datetime('now') WHERE id=?`,
    [
      str(form, "title"),
      str(form, "platform"),
      str(form, "format") ?? "fisico",
      str(form, "edition"),
      str(form, "saga"),
      status && (STATUSES as readonly string[]).includes(status) ? status : "backlog",
      num(form, "user_rating"),
      str(form, "notes"),
      num(form, "price_paid"),
      str(form, "purchase_date"),
      num(form, "market_value"),
      num(form, "target_price"),
      hours != null ? Math.round(hours * 60) : null,
      id,
    ],
  );
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${id}`, "ok", "Alterações salvas."));
}

export async function setStatus(id: number, status: string) {
  await requireAuth();
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await run("UPDATE games SET status=?, updated_at=datetime('now') WHERE id=?", [status, id]);
  revalidatePath("/", "layout");
}

export async function deleteGame(id: number) {
  await requireAuth();
  await batch([
    { sql: "DELETE FROM achievements WHERE game_id=?", args: [id] },
    { sql: "DELETE FROM guides WHERE game_id=?", args: [id] },
    { sql: "DELETE FROM guide_requests WHERE game_id=?", args: [id] },
    { sql: "DELETE FROM games WHERE id=?", args: [id] },
  ]);
  revalidatePath("/", "layout");
  redirect(msg("/colecao", "ok", "Jogo removido."));
}

const MERGE_COLS = [
  "psn_np_id", "psn_service", "psn_title_ids", "psn_icon", "psn_progress", "psn_earned", "psn_defined",
  "psn_updated_at", "psn_details_at", "xbox_title_id", "xbox_icon", "xbox_progress", "xbox_ach_earned",
  "xbox_ach_total", "xbox_gs_earned", "xbox_gs_total", "xbox_details_at", "xbox_details_count",
  "first_played", "last_played", "cover_url", "igdb_id", "igdb_slug", "summary", "genres", "developer", "publisher",
  "release_date", "igdb_rating", "critic_rating", "screenshots", "ttb_main", "ttb_extra", "ttb_complete",
  "metadata_at", "price_paid", "notes",
] as const;

/** Une dois registros (ex.: o jogo físico da estante + o título que veio da PSN/Xbox). */
export async function mergeGames(keepId: number, form: FormData) {
  await requireAuth();
  const otherId = num(form, "other_id");
  if (!otherId || otherId === keepId) redirect(msg(`/jogo/${keepId}`, "erro", "Escolha outro jogo."));
  const other = await get<GameRow>("SELECT * FROM games WHERE id=?", [otherId]);
  if (!other) redirect(msg(`/jogo/${keepId}`, "erro", "Jogo não encontrado."));

  const args: Record<string, string | number | null> = { id: keepId, pt: other.playtime_minutes ?? 0, other_status: other.status };
  for (const c of MERGE_COLS) args[c] = other[c] as string | number | null;
  const sets = MERGE_COLS.map((c) => `${c} = COALESCE(${c}, :${c})`).join(", ");
  await batch([
    { sql: "UPDATE OR IGNORE achievements SET game_id=? WHERE game_id=?", args: [keepId, otherId] },
    { sql: "DELETE FROM achievements WHERE game_id=?", args: [otherId] },
    { sql: "DELETE FROM guides WHERE game_id=?", args: [otherId] },
    { sql: "DELETE FROM games WHERE id=?", args: [otherId] },
    {
      sql: `UPDATE games SET ${sets}, playtime_minutes = COALESCE(playtime_minutes, 0) + :pt,
              status = CASE WHEN status = 'backlog' THEN :other_status ELSE status END,
              updated_at = datetime('now') WHERE id = :id`,
      args,
    },
  ]);
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${keepId}`, "ok", `“${other.title}” foi unido a este jogo.`));
}

export async function refreshMetadata(id: number, form: FormData) {
  await requireAuth();
  const igdbId = num(form, "igdb_id");
  const game = await get<GameRow>("SELECT * FROM games WHERE id=?", [id]);
  if (!game) redirect("/colecao");
  try {
    if (igdbId) await applyIgdb(id, igdbId);
    else {
      const m = await bestIgdbMatch(game.title, game.platform);
      if (!m) throw new Error("Nenhum resultado no IGDB. Tente informar o ID manualmente.");
      await applyIgdb(id, m.id);
    }
  } catch (e) {
    redirect(msg(`/jogo/${id}`, "erro", (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${id}`, "ok", "Metadados atualizados."));
}

// ---------- Guias de platina / 100% ----------

export async function requestGuideAction(gameId: number) {
  await requireAuth();
  try {
    await requestGuide(gameId);
  } catch (e) {
    redirect(msg(`/guias/${gameId}`, "erro", `Não foi possível pedir o guia: ${(e as Error).message}`));
  }
  revalidatePath(`/guias/${gameId}`);
  redirect(msg(`/guias/${gameId}`, "ok", "Pedido enviado! O Claude Code está preparando o guia; ele aparece aqui em cerca de 5 a 10 minutos."));
}

export async function toggleMissableAction(gameId: number, index: number, query: string) {
  await requireAuth();
  const game = await get<GameRow>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (game) await toggleMissable(game, index);
  revalidatePath(`/guias/${gameId}`);
  redirect(`/guias/${gameId}${query}`);
}

// ---------- Sincronização (credenciais usadas só durante a requisição; nada é gravado) ----------

export async function enrichAction(form: FormData) {
  await requireAuth();
  const force = form.get("force") === "1";
  let text: string;
  try {
    const r = await enrichAll(force);
    text = `Metadados atualizados para ${r.ok} jogo(s).`;
    if (r.remaining) text += ` Faltam ${r.remaining}: clique de novo para continuar.`;
    if (r.failed.length) text += ` Sem correspondência: ${r.failed.slice(0, 8).join("; ")}`;
  } catch (e) {
    redirect(msg("/contas", "erro", (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

/** Depois de sincronizar, busca capa/gêneros/tempos dos jogos novos com o tempo que sobrar. */
async function enrichNew(budgetMs: number) {
  if (!igdbCredentials() || budgetMs < 5_000) return;
  try {
    await enrichAll(false, budgetMs);
  } catch {
    /* não impede a sincronização */
  }
}

const TOTAL_BUDGET = 270_000; // a página Contas define maxDuration = 300 s

export async function syncPsnAction(form: FormData) {
  await requireAuth();
  const npsso = str(form, "npsso");
  if (!npsso) redirect(msg("/contas", "erro", "Cole o código NPSSO."));
  const started = Date.now();
  let text: string;
  try {
    const r = await syncPsn(npsso!, 220_000);
    await enrichNew(TOTAL_BUDGET - (Date.now() - started));
    text = `PSN: ${r.titles} listas de troféus, ${r.matched} vinculadas à coleção, ${r.created} jogos digitais novos, ${r.details} atualizadas.`;
    if (r.remaining > 0) text += ` Ainda faltam ${r.remaining} listas: sincronize de novo para continuar.`;
    if (r.errors.length) text += ` Avisos: ${r.errors.slice(0, 3).join(" | ")}`;
  } catch (e) {
    redirect(msg("/contas", "erro", `Falha na sincronização da PSN: ${(e as Error).message}`));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

export async function syncXboxAction(form: FormData) {
  await requireAuth();
  const key = str(form, "api_key");
  if (!key) redirect(msg("/contas", "erro", "Cole a chave de API da OpenXBL."));
  const started = Date.now();
  let text: string;
  try {
    const r = await syncXbox(key!, 60, 220_000);
    await enrichNew(TOTAL_BUDGET - (Date.now() - started));
    text = `Xbox: ${r.titles} jogos, ${r.matched} vinculados à coleção, ${r.created} jogos digitais novos, ${r.details} com conquistas detalhadas.`;
    if (r.remaining > 0) text += ` Ainda faltam ${r.remaining} jogos com conquistas: sincronize de novo mais tarde (limite da OpenXBL).`;
    if (r.errors.length) text += ` Avisos: ${r.errors.slice(0, 3).join(" | ")}`;
  } catch (e) {
    redirect(msg("/contas", "erro", `Falha na sincronização do Xbox: ${(e as Error).message}`));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

// ---------- Login ----------

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function login(form: FormData) {
  if (!process.env.APP_PASSWORD) redirect("/login?erro=config");
  const ip = await clientIp();
  const now = Date.now();
  const attempt = await get<{ failures: number; first_at: number }>(
    "SELECT failures, first_at FROM login_attempts WHERE ip = ?",
    [ip],
  );
  const recent = attempt && now - attempt.first_at < WINDOW_MS;
  if (recent && attempt.failures >= MAX_FAILURES) redirect("/login?erro=bloqueado");

  if (!(await checkPassword(str(form, "password") ?? ""))) {
    await run(
      `INSERT INTO login_attempts (ip, failures, first_at) VALUES (?, 1, ?)
       ON CONFLICT (ip) DO UPDATE SET failures = CASE WHEN ? - first_at < ? THEN failures + 1 ELSE 1 END,
         first_at = CASE WHEN ? - first_at < ? THEN first_at ELSE excluded.first_at END`,
      [ip, now, now, WINDOW_MS, now, WINDOW_MS],
    );
    redirect("/login?erro=senha");
  }

  await run("DELETE FROM login_attempts WHERE ip = ?", [ip]);
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 86_400,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
