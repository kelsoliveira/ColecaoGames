import Link from "next/link";
import { Cover, PlatformBadge } from "@/components/ui";
import { brl } from "@/lib/format";
import { listGames } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function DesejosPage() {
  const games = listGames({ status: "desejado", sort: "lancamento" });
  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lista de desejos</h1>
          <p className="text-sm text-ink-2">Defina um preço-alvo em cada jogo e acompanhe as ofertas pelos links da página.</p>
        </div>
        <Link href="/adicionar?status=desejado" className="btn-primary">+ Adicionar desejo</Link>
      </header>
      {games.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link href={`/jogo/${g.id}`} className="card flex gap-4 p-3 hover:border-accent">
                <div className="w-16 shrink-0"><Cover game={g} /></div>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{g.title}</p>
                  <PlatformBadge platform={g.platform} />
                  <p className="text-sm text-ink-2">Preço-alvo: {brl(g.target_price)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-ink-2">Sua lista de desejos está vazia.</p>
      )}
    </div>
  );
}
