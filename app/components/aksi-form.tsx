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
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Memproses…" : tombol}
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {state.pesan}
          </p>
        )}
      </div>
      {state?.galat && state.galat.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-red-700 dark:text-red-400">
          {state.galat.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
