import type { Predikat } from "@/lib/kpi/types";

export function Kartu({ judul, children, className = "" }: { judul?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {judul && <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{judul}</h2>}
      {children}
    </section>
  );
}

const WARNA_PREDIKAT: Record<Predikat, string> = {
  "Sangat Baik": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  Baik: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  Cukup: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Perlu Perbaikan": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  Kurang: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export function LencanaPredikat({ predikat }: { predikat: Predikat | null }) {
  if (!predikat) return <span className="text-zinc-400">—</span>;
  return <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${WARNA_PREDIKAT[predikat]}`}>{predikat}</span>;
}

export function Lencana({ children, nada = "abu" }: { children: React.ReactNode; nada?: "abu" | "kuning" | "merah" | "hijau" }) {
  const w = {
    abu: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    kuning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    merah: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    hijau: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  }[nada];
  return <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${w}`}>{children}</span>;
}

export function Memuat() {
  return <p className="py-8 text-sm text-zinc-500">Memuat data…</p>;
}

export function JudulHalaman({ judul, sub }: { judul: string; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{judul}</h1>
      {sub && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const labelPeriode = (id: string) => {
  const [y, m] = id.split("-");
  return `${BULAN[Number(m) - 1]} ${y}`;
};

export const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
export const td = "px-3 py-2 align-top";
export const tdAngka = "px-3 py-2 text-right tabular-nums align-top";
export const input =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";
