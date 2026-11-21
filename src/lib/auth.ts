// Sessão assinada (HMAC-SHA256) com data de expiração. Usado pelo proxy e pela ação de login.
// A chave de assinatura deriva de SESSION_SECRET (se definida) + APP_PASSWORD: trocar a senha invalida todas as sessões.

export const SESSION_COOKIE = "cg_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = `${process.env.SESSION_SECRET ?? ""}:${process.env.APP_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  return `${exp}.${await hmac(`session:${exp}`)}`;
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  return safeEqual(sig, await hmac(`session:${exp}`));
}

/** Compara a senha digitada com APP_PASSWORD em tempo constante. */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}

/** Site publicado sem senha é bloqueado: ele mostra dados pessoais e permite sincronizar contas. */
export const passwordRequired = () => !!process.env.APP_PASSWORD || !!process.env.VERCEL;
