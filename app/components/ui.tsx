import Link from "next/link";
import type { Predikat } from "@/lib/kpi/types";
import { Ikon, type NamaIkon } from "./ikon";

export function Kartu({
  judul,
  aksi,
  children,
  className = "",
}: {
  judul?: React.ReactNode;
  aksi?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-wi-100/70 bg-white p-5 shadow-sm shadow-wi-900/5 dark:border-wi-900 dark:bg-wi-950 ${className}`}>
      {(judul || aksi) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {judul && <h2 className="text-base font-semibold text-tinta dark:text-white">{judul}</h2>}
          {aksi}
        </div>
      )}
      {children}
    </section>
  );
}

export function TautanAksi({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-wi-600 hover:text-wi-800 dark:text-wi-300">
      {children} <Ikon nama="panah" className="h-4 w-4" />
    </Link>
  );
}

const NADA_IKON = {
  wi: "bg-wi-500 text-white",
  menara: "bg-menara-500 text-white",
  emas: "bg-emas-400 text-tinta",
  api: "bg-api-500 text-white",
} as const;

export function KartuStat({
  ikon,
  nada,
  label,
  nilai,
  ket,
}: {
  ikon: NamaIkon;
  nada: keyof typeof NADA_IKON;
  label: string;
  nilai: React.ReactNode;
  ket?: React.ReactNode;
}) {
  return (
    <Kartu className="flex items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${NADA_IKON[nada]}`}>
        <Ikon nama={ikon} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="truncate text-2xl font-bold tabular-nums text-tinta dark:text-white">{nilai}</p>
        {ket && <p className="text-xs text-zinc-500 dark:text-zinc-400">{ket}</p>}
      </div>
    </Kartu>
  );
}

const WARNA_PREDIKAT: Record<Predikat, string> = {
  "Sangat Baik": "bg-wi-100 text-wi-800 dark:bg-wi-900 dark:text-wi-200",
  Baik: "bg-menara-100 text-menara-700 dark:bg-menara-700/30 dark:text-menara-100",
  Cukup: "bg-emas-100 text-emas-700 dark:bg-emas-700/30 dark:text-emas-100",
  "Perlu Perbaikan": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  Kurang: "bg-api-100 text-api-700 dark:bg-api-700/30 dark:text-api-100",
};

export function LencanaPredikat({ predikat }: { predikat: Predikat | null }) {
  if (!predikat) return <span className="text-zinc-400">—</span>;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${WARNA_PREDIKAT[predikat]}`}>{predikat}</span>;
}

export function Lencana({ children, nada = "abu" }: { children: React.ReactNode; nada?: "abu" | "kuning" | "merah" | "hijau" }) {
  const w = {
    abu: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    kuning: "bg-emas-100 text-emas-700 dark:bg-emas-700/30 dark:text-emas-100",
    merah: "bg-api-100 text-api-700 dark:bg-api-700/30 dark:text-api-100",
    hijau: "bg-menara-100 text-menara-700 dark:bg-menara-700/30 dark:text-menara-100",
  }[nada];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${w}`}>{children}</span>;
}

const WARNA_AVATAR = [
  "bg-wi-100 text-wi-800",
  "bg-menara-100 text-menara-700",
  "bg-emas-100 text-emas-700",
  "bg-api-100 text-api-700",
  "bg-indigo-100 text-tinta",
];

export function Avatar({ nama, kecil = false }: { nama: string; kecil?: boolean }) {
  const inisial = nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join("")
    .toUpperCase();
  const idx = [...nama].reduce((a, c) => a + c.charCodeAt(0), 0) % WARNA_AVATAR.length;
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${WARNA_AVATAR[idx]} ${kecil ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"}`}
    >
      {inisial}
    </span>
  );
}

/** Batang kemajuan satu warna; label & angka selalu tertulis, warna bukan satu-satunya penanda. */
export function BatangProgres({ label, nilai, total, ket }: { label: string; nilai: number; total: number; ket?: string }) {
  const pct = total ? Math.round((nilai / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
          {nilai}/{total} · <strong className="text-tinta dark:text-white">{pct}%</strong>
        </span>
      </div>
      <div className="h-2 rounded-full bg-wi-50 dark:bg-wi-900" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-2 rounded-full bg-wi-500 dark:bg-wi-400" style={{ width: `${pct}%` }} />
      </div>
      {ket && <p className="mt-1 text-xs text-zinc-500">{ket}</p>}
    </div>
  );
}

export function Memuat() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat data">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-wi-100/60 dark:bg-wi-900" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white dark:bg-wi-950" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-wi-950" />
    </div>
  );
}

export function JudulHalaman({ judul, sub, aksi }: { judul: string; sub?: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl dark:text-white">{judul}</h1>
        {sub && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{sub}</div>}
      </div>
      {aksi}
    </div>
  );
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const labelPeriode = (id: string) => {
  const [y, m] = id.split("-");
  return `${BULAN[Number(m) - 1]} ${y}`;
};

export const th = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
export const td = "px-4 py-3 align-top";
export const tdAngka = "px-4 py-3 text-right tabular-nums align-top";
export const input =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-wi-400 focus:ring-2 focus:ring-wi-100 disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-wi-800 dark:bg-wi-950 dark:focus:ring-wi-900";
export const kepalaTabel = "border-b border-wi-100 bg-wi-50/60 dark:border-wi-900 dark:bg-wi-900/40";
export const badanTabel = "divide-y divide-wi-50 dark:divide-wi-900";
