"use client";

import { useActionState } from "react";
import type { HasilAksi } from "../actions";

type Props = {
  action: (prev: HasilAksi, fd: FormData) => Promise<HasilAksi>;
  tombol: string;
  children?: React.ReactNode;
  className?: string;
  konfirmasi?: string;
};

export function AksiForm({ action, tombol, children, className, konfirmasi }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault();
      }}
    >
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wi-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-wi-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wi-500 disabled:opacity-50"
        >
          {pending ? "Memproses…" : tombol}
        </button>
        {state && (
          <p role="status" className={`text-sm font-medium ${state.ok ? "text-menara-700 dark:text-menara-100" : "text-api-700 dark:text-api-100"}`}>
            {state.pesan}
          </p>
        )}
      </div>
      {state?.galat && state.galat.length > 0 && (
        <ul className="mt-3 list-disc rounded-lg bg-api-100/60 py-2 pl-8 pr-3 text-sm text-api-700 dark:bg-api-700/20 dark:text-api-100">
          {state.galat.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
