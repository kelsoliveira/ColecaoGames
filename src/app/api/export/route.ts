import { cookies } from "next/headers";
import { SESSION_COOKIE, passwordRequired, verifySession } from "@/lib/auth";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (passwordRequired() && !(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return new Response("Não autorizado", { status: 401 });
  }
  const games = await all("SELECT * FROM games ORDER BY title");
  const achievements = await all("SELECT * FROM achievements");
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), games, achievements }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="colecao-games-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
