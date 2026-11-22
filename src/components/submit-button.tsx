"use client";

import { useFormStatus } from "react-dom";

/** Botão de envio que mostra um aviso enquanto a ação do servidor está rodando. */
export function SubmitButton({
  children,
  pending,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pending: string;
  className?: string;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
          {pending}
        </>
      ) : (
        children
      )}
    </button>
  );
}
