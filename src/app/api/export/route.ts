import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const games = db().prepare("SELECT * FROM games ORDER BY title").all();
  const achievements = db().prepare("SELECT * FROM achievements").all();
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), games, achievements }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="colecao-games-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
