import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, passwordRequired, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (!passwordRequired()) return NextResponse.next(); // uso local sem senha
  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
