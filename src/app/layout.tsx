import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coleção Games",
  description: "Catálogo da coleção, troféus, conquistas, tempo de jogo e preços — PSN e Xbox em um só lugar.",
  appleWebApp: { capable: true, title: "Coleção", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/colecao", label: "Coleção" },
  { href: "/conquistas", label: "Troféus e conquistas" },
  { href: "/desejos", label: "Lista de desejos" },
  { href: "/adicionar", label: "Adicionar jogo" },
  { href: "/contas", label: "Contas e sincronização" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col md:flex-row">
          <aside className="border-b border-line p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
            <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">CG</span>
              Coleção Games
            </Link>
            <nav className="flex gap-1 overflow-x-auto md:flex-col">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-panel-2 hover:text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
