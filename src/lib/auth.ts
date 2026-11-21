// Usado pelo proxy (antes de cada requisição) e pela ação de login.
// Se APP_PASSWORD não estiver definida, o site fica aberto (uso local).
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`colecao-games:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
