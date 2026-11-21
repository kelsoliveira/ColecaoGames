import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <div className="mx-auto mt-24 max-w-sm">
      <form action={login} className="card space-y-4 p-6">
        <h1 className="text-xl font-bold">Entrar</h1>
        {sp.erro ? <p className="text-sm text-red-300">Senha incorreta.</p> : null}
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" className="input" autoFocus required />
        </div>
        <button className="btn-primary w-full" type="submit">Entrar</button>
      </form>
    </div>
  );
}
