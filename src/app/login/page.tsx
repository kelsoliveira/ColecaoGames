import { login } from "@/app/actions";

const ERRORS: Record<string, string> = {
  senha: "Senha incorreta.",
  bloqueado: "Muitas tentativas. Aguarde 15 minutos e tente de novo.",
  config: "Defina a variável de ambiente APP_PASSWORD (na Vercel: Settings → Environment Variables) e faça um novo deploy.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? (ERRORS[sp.erro] ?? ERRORS.senha) : null;
  return (
    <div className="mx-auto mt-16 max-w-sm md:mt-24">
      <form action={login} className="card space-y-4 p-6">
        <h1 className="text-xl font-bold">Entrar</h1>
        {erro ? <p className="text-sm text-red-300">{erro}</p> : null}
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" autoFocus required />
        </div>
        <button className="btn-primary w-full" type="submit">Entrar</button>
      </form>
    </div>
  );
}
