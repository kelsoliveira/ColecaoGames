import Link from "next/link";
import { deleteConsole, saveConsole } from "@/app/actions";
import { Flash, PlatformBadge } from "@/components/ui";
import { backwardFor, consoleStats, listConsoles, type ConsoleRow } from "@/lib/consoles";
import { all } from "@/lib/db";
import { brl, date, hours } from "@/lib/format";
import { PLATFORMS, type GameRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function ConsoleForm({ c }: { c?: ConsoleRow }) {
  const id = c?.id ?? null;
  const p = (k: string) => `${k}-${id ?? "novo"}`;
  return (
    <form action={saveConsole.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor={p("name")}>Nome</label>
        <input id={p("name")} name="name" defaultValue={c?.name ?? ""} placeholder="Ex.: PlayStation 5" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor={p("platform")}>Plataforma</label>
        <select id={p("platform")} name="platform" defaultValue={c?.platform ?? "PS5"} className="input">
          {PLATFORMS.map((pl) => <option key={pl}>{pl}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={p("model")}>Modelo / edição</label>
        <input id={p("model")} name="model" defaultValue={c?.model ?? ""} placeholder="Ex.: Slim, Pro, Series X, Digital" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={p("purchase_date")}>Data da compra</label>
        <input id={p("purchase_date")} name="purchase_date" type="date" defaultValue={c?.purchase_date ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={p("price_paid")}>Preço pago (R$)</label>
        <input id={p("price_paid")} name="price_paid" inputMode="decimal" defaultValue={c?.price_paid ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={p("notes")}>Anotações</label>
        <input id={p("notes")} name="notes" defaultValue={c?.notes ?? ""} placeholder="Ex.: armazenamento, acessórios" className="input" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary" type="submit">{c ? "Salvar" : "Adicionar console"}</button>
      </div>
    </form>
  );
}

export default async function ConsolesPage({ searchParams }: PageProps<"/consoles">) {
  const sp = await searchParams;
  const [consoles, games] = await Promise.all([listConsoles(), all<GameRow>("SELECT * FROM games")]);
  const totalPaid = consoles.reduce((s, c) => s + (c.price_paid ?? 0), 0);

  return (
    <div className="space-y-6">
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} erro={typeof sp.erro === "string" ? sp.erro : undefined} />
      <header>
        <h1 className="text-2xl font-bold">Meus consoles</h1>
        <p className="text-sm text-ink-2">
          {consoles.length} console(s){totalPaid ? ` · ${brl(totalPaid)} investidos` : ""}. Ao sincronizar, os consoles cadastrados
          são marcados como detectados (PlayStation pela PSN; Xbox One/Series pelo histórico do Xbox).
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {consoles.map((c) => {
          const s = consoleStats(c, games);
          const retro = backwardFor(c.platform);
          return (
            <section key={c.id} className="card space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PlatformBadge platform={c.platform} />
                    {c.model ? <span className="text-xs text-ink-2">{c.model}</span> : null}
                    {c.detected_by ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-200">
                        ✓ detectado na {c.detected_by === "psn" ? "PSN" : "conta Xbox"} em {date(c.detected_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link href={`/colecao?platform=${encodeURIComponent(c.platform)}`} className="btn-ghost text-xs">
                  Ver jogos
                </Link>
              </div>

              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-3">Jogos</dt>
                  <dd className="text-xl font-semibold tabular-nums">{s.games}</dd>
                  <dd className="text-[11px] text-ink-3">{s.physical} físicos · {s.digital} digitais</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Jogáveis</dt>
                  <dd className="text-xl font-semibold tabular-nums">{s.playable}</dd>
                  <dd className="text-[11px] text-ink-3">{retro.length ? `inclui ${retro.join(", ")}` : "só da plataforma"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Zerados</dt>
                  <dd className="text-xl font-semibold tabular-nums">{s.completed}</dd>
                  <dd className="text-[11px] text-ink-3">zerados ou platinados</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Horas jogadas</dt>
                  <dd className="font-semibold">{hours(s.minutes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Gasto em jogos</dt>
                  <dd className="font-semibold">{brl(s.paid || null)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Console</dt>
                  <dd className="font-semibold">{brl(c.price_paid)}</dd>
                  {c.purchase_date ? <dd className="text-[11px] text-ink-3">{date(c.purchase_date)}</dd> : null}
                </div>
              </dl>
              {c.notes ? <p className="text-sm text-ink-2">{c.notes}</p> : null}

              <details>
                <summary className="cursor-pointer text-sm text-accent">Editar</summary>
                <div className="mt-3 space-y-3">
                  <ConsoleForm c={c} />
                  <form action={deleteConsole.bind(null, c.id)}>
                    <button className="btn-danger text-xs" type="submit">Remover console</button>
                  </form>
                </div>
              </details>
            </section>
          );
        })}
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Adicionar console</h2>
        <ConsoleForm />
      </section>
    </div>
  );
}
