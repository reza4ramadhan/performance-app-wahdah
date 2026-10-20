"use client";

import { useActionState } from "react";
import type { HasilAksi } from "../actions";
import { Ikon } from "./ikon";
import { kelasTombol } from "./ui";

type Props = {
  action: (prev: HasilAksi, fd: FormData) => Promise<HasilAksi>;
  tombol: string;
  children?: React.ReactNode;
  /** Pertanyaan konfirmasi sebelum mengirim (untuk langkah yang tidak bisa dibatalkan). */
  konfirmasi?: string;
  nonaktif?: boolean;
};

export function AksiForm({ action, tombol, children, konfirmasi, nonaktif }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault();
      }}
    >
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || nonaktif} className={kelasTombol}>
          {pending ? "Memproses…" : tombol}
        </button>
        {state && (
          <p role="status" className={`inline-flex items-center gap-1.5 text-sm font-medium ${state.ok ? "text-mint-700 dark:text-mint-300" : "text-flame-700 dark:text-flame-300"}`}>
            <Ikon nama={state.ok ? "centang" : "awas"} className="size-4" />
            {state.pesan}
          </p>
        )}
      </div>
      {!!state?.galat?.length && (
        <ul className="mt-3 list-disc space-y-0.5 rounded-xl bg-flame-500/8 py-3 pr-4 pl-8 text-sm text-flame-700 dark:text-flame-300">
          {state.galat.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
