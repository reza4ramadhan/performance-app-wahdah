import Form from "next/form";
import { Suspense } from "react";
import { getDb, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { labelPeriode } from "@/lib/format";
import { Ikon } from "./ikon";
import { Merek, TabPonsel } from "./navigasi";

export function BilahAtas() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <div className="lg:hidden">
          <Merek ringkas />
        </div>
        <Form action="/pegawai" role="search" className="relative hidden max-w-md flex-1 md:block">
          <Ikon nama="cari" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <label htmlFor="cari-pegawai" className="sr-only">
            Cari pegawai
          </label>
          <input
            id="cari-pegawai"
            name="q"
            type="search"
            placeholder="Cari pegawai, bidang, atau unit…"
            className="w-full rounded-full border border-line bg-surface-2 py-2 pr-4 pl-10 text-sm outline-none transition placeholder:text-muted focus:border-brand-400 focus:bg-surface focus:ring-3 focus:ring-brand-500/15"
          />
        </Form>
        <div className="ml-auto flex items-center gap-3">
          <Suspense fallback={<span className="h-9 w-40 animate-pulse rounded-full bg-surface-2" />}>
            <ChipPeriode />
          </Suspense>
          <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex" title="Belum ada login. Semua perubahan tercatat sebagai pengguna-dev.">
            <span className="grid size-9 place-items-center rounded-full bg-gold-400 text-sm font-bold text-[#1f1b5c]">PD</span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink">Pengguna dev</span>
              <span className="block text-xs text-muted">Belum ada login</span>
            </span>
          </div>
        </div>
      </div>
      <div className="px-4">
        <Suspense>
          <TabPonsel />
        </Suspense>
      </div>
    </header>
  );
}

async function ChipPeriode() {
  const db = await getDb();
  const p = periodeAktif(db);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
      <Ikon nama={periodeTerkunci(p) ? "kunci" : "kalender"} className="size-4 text-brand-600 dark:text-brand-300" />
      <span className="font-semibold text-ink">{labelPeriode(p.id)}</span>
      <span className="hidden text-muted sm:inline">· {p.status}</span>
    </span>
  );
}
