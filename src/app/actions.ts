"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { applyIgdb, bestIgdbMatch, enrichAll } from "@/lib/igdb";
import { authToken } from "@/lib/auth";
import { connectPsn, disconnectPsn, syncPsn, syncPsnTrophies } from "@/lib/psn";
import { setSetting, clearSettings, igdbCredentials } from "@/lib/settings";
import { STATUSES, type GameRow } from "@/lib/types";
import { connectXbox, disconnectXbox, syncXbox, syncXboxAchievements } from "@/lib/xbox";

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

// ---------- Jogos ----------

export async function createGame(form: FormData) {
  const title = str(form, "title");
  const platform = str(form, "platform") ?? "PS5";
  if (!title) redirect(msg("/adicionar", "erro", "Informe o título."));
  const status = str(form, "status") ?? "backlog";
  const id = db()
    .prepare("INSERT INTO games (title, platform, format, edition, status, price_paid) VALUES (?, ?, ?, ?, ?, ?)")
    .run(title, platform, str(form, "format") ?? "fisico", str(form, "edition"), status, num(form, "price_paid"))
    .lastInsertRowid as number;

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
  const status = str(form, "status");
  db()
    .prepare(
      `UPDATE games SET title=?, platform=?, format=?, edition=?, status=?, user_rating=?, notes=?, price_paid=?,
         purchase_date=?, market_value=?, target_price=?, playtime_minutes=COALESCE(?, playtime_minutes),
         updated_at=datetime('now') WHERE id=?`,
    )
    .run(
      str(form, "title"),
      str(form, "platform"),
      str(form, "format") ?? "fisico",
      str(form, "edition"),
      status && (STATUSES as readonly string[]).includes(status) ? status : "backlog",
      num(form, "user_rating"),
      str(form, "notes"),
      num(form, "price_paid"),
      str(form, "purchase_date"),
      num(form, "market_value"),
      num(form, "target_price"),
      num(form, "playtime_hours") != null ? Math.round(num(form, "playtime_hours")! * 60) : null,
      id,
    );
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${id}`, "ok", "Alterações salvas."));
}

export async function setStatus(id: number, status: string) {
  if (!(STATUSES as readonly string[]).includes(status)) return;
  db().prepare("UPDATE games SET status=?, updated_at=datetime('now') WHERE id=?").run(status, id);
  revalidatePath("/", "layout");
}

export async function deleteGame(id: number) {
  db().prepare("DELETE FROM games WHERE id=?").run(id);
  revalidatePath("/", "layout");
  redirect(msg("/colecao", "ok", "Jogo removido."));
}

/** Une dois registros (ex.: o jogo físico da estante + o título que veio da PSN/Xbox). */
export async function mergeGames(keepId: number, form: FormData) {
  const otherId = num(form, "other_id");
  if (!otherId || otherId === keepId) redirect(msg(`/jogo/${keepId}`, "erro", "Escolha outro jogo."));
  const database = db();
  const other = database.prepare("SELECT * FROM games WHERE id=?").get(otherId) as GameRow | undefined;
  if (!other) redirect(msg(`/jogo/${keepId}`, "erro", "Jogo não encontrado."));
  database.transaction(() => {
    database.prepare("UPDATE OR IGNORE achievements SET game_id=? WHERE game_id=?").run(keepId, otherId);
    database.prepare("DELETE FROM games WHERE id=?").run(otherId);
    const cols = [
      "psn_np_id", "psn_service", "psn_title_ids", "psn_icon", "psn_progress", "psn_earned", "psn_defined",
      "psn_updated_at", "psn_details_at", "xbox_title_id", "xbox_icon", "xbox_progress", "xbox_ach_earned",
      "xbox_ach_total", "xbox_gs_earned", "xbox_gs_total", "xbox_details_at", "xbox_details_count",
      "first_played", "last_played", "cover_url", "igdb_id", "summary", "genres", "developer", "publisher",
      "release_date", "igdb_rating", "critic_rating", "screenshots", "ttb_main", "ttb_extra", "ttb_complete",
      "metadata_at", "price_paid", "notes",
    ] as const;
    const sets = cols.map((c) => `${c} = COALESCE(${c}, @${c})`).join(", ");
    const params: Record<string, unknown> = { id: keepId };
    for (const c of cols) params[c] = other![c];
    params.pt = other!.playtime_minutes ?? 0;
    params.other_status = other!.status;
    database
      .prepare(
        `UPDATE games SET ${sets}, playtime_minutes = COALESCE(playtime_minutes, 0) + @pt,
           status = CASE WHEN status = 'backlog' THEN @other_status ELSE status END,
           updated_at = datetime('now') WHERE id = @id`,
      )
      .run(params);
  })();
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${keepId}`, "ok", `“${other!.title}” foi unido a este jogo.`));
}

export async function refreshMetadata(id: number, form: FormData) {
  const igdbId = num(form, "igdb_id");
  const game = db().prepare("SELECT * FROM games WHERE id=?").get(id) as GameRow;
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

export async function refreshAchievements(id: number) {
  const game = db().prepare("SELECT * FROM games WHERE id=?").get(id) as GameRow;
  try {
    if (game.psn_np_id) await syncPsnTrophies(game);
    if (game.xbox_title_id) await syncXboxAchievements(game);
  } catch (e) {
    redirect(msg(`/jogo/${id}`, "erro", (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(msg(`/jogo/${id}`, "ok", "Troféus/conquistas atualizados."));
}

// ---------- Contas e sincronização ----------

export async function saveIgdb(form: FormData) {
  const id = str(form, "client_id");
  const secret = str(form, "client_secret");
  if (!id || !secret) redirect(msg("/contas", "erro", "Informe Client ID e Client Secret."));
  clearSettings("igdb_");
  setSetting("igdb_client_id", id);
  setSetting("igdb_client_secret", secret);
  redirect(msg("/contas", "ok", "Credenciais do IGDB salvas."));
}

export async function enrichAction(form: FormData) {
  const force = form.get("force") === "1";
  let text: string;
  try {
    const r = await enrichAll(force);
    text = `Metadados atualizados para ${r.ok} jogo(s).` + (r.failed.length ? ` Sem correspondência: ${r.failed.slice(0, 10).join("; ")}` : "");
  } catch (e) {
    redirect(msg("/contas", "erro", (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

/** Depois de sincronizar, busca capa/gêneros/tempos dos jogos novos (se o IGDB estiver configurado). */
async function enrichNew() {
  if (!igdbCredentials()) return;
  try {
    await enrichAll(false);
  } catch {
    /* não impede a sincronização */
  }
}

export async function connectPsnAction(form: FormData) {
  const npsso = str(form, "npsso");
  if (!npsso) redirect(msg("/contas", "erro", "Cole o código NPSSO."));
  try {
    await connectPsn(npsso!);
  } catch (e) {
    redirect(msg("/contas", "erro", `Não foi possível conectar à PSN: ${(e as Error).message}`));
  }
  redirect(msg("/contas", "ok", "PSN conectada! Agora clique em Sincronizar."));
}

export async function disconnectPsnAction() {
  disconnectPsn();
  redirect(msg("/contas", "ok", "PSN desconectada."));
}

export async function syncPsnAction() {
  let text: string;
  try {
    const r = await syncPsn();
    await enrichNew();
    text = `PSN: ${r.titles} listas de troféus, ${r.matched} vinculadas à coleção, ${r.created} novos jogos digitais, ${r.details} atualizadas.`;
    if (r.errors.length) text += ` Avisos: ${r.errors.slice(0, 3).join(" | ")}`;
  } catch (e) {
    redirect(msg("/contas", "erro", `Falha na sincronização da PSN: ${(e as Error).message}`));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

export async function connectXboxAction(form: FormData) {
  const key = str(form, "api_key");
  if (!key) redirect(msg("/contas", "erro", "Cole a chave de API da OpenXBL."));
  try {
    await connectXbox(key!);
  } catch (e) {
    redirect(msg("/contas", "erro", `Não foi possível conectar ao Xbox: ${(e as Error).message}`));
  }
  redirect(msg("/contas", "ok", "Xbox conectado! Agora clique em Sincronizar."));
}

export async function disconnectXboxAction() {
  disconnectXbox();
  redirect(msg("/contas", "ok", "Xbox desconectado."));
}

export async function syncXboxAction() {
  let text: string;
  try {
    const r = await syncXbox();
    await enrichNew();
    text = `Xbox: ${r.titles} jogos, ${r.matched} vinculados à coleção, ${r.created} novos jogos digitais, ${r.details} com conquistas detalhadas.`;
    if (r.errors.length) text += ` Avisos: ${r.errors.slice(0, 3).join(" | ")}`;
  } catch (e) {
    redirect(msg("/contas", "erro", `Falha na sincronização do Xbox: ${(e as Error).message}`));
  }
  revalidatePath("/", "layout");
  redirect(msg("/contas", "ok", text));
}

// ---------- Senha de acesso (opcional, via APP_PASSWORD) ----------

export async function login(form: FormData) {
  const password = str(form, "password") ?? "";
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) redirect("/login?erro=1");
  (await cookies()).set("cg_auth", await authToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete("cg_auth");
  redirect("/login");
}
