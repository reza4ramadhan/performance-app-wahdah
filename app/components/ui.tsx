import Link from "next/link";
import type { Predikat } from "@/lib/kpi/types";
import { Ikon, type NamaIkon } from "./ikon";

// ── Kerangka halaman ──────────────────────────────────────────────────────────

export function KepalaHalaman({ judul, sub, aksi }: { judul: string; sub?: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{judul}</h1>
        {sub && <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p>}
      </div>
      {aksi}
    </header>
  );
}

export function Panel({
  judul,
  aksi,
  children,
  className = "",
  rapat = false,
}: {
  judul?: React.ReactNode;
  aksi?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Tanpa padding isi — untuk tabel selebar panel. */
  rapat?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(15_60_70/0.04)] ${className}`}>
      {(judul || aksi) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
          {judul && <h2 className="text-[15px] font-semibold text-ink">{judul}</h2>}
          {aksi}
        </div>
      )}
      <div className={rapat ? "" : `px-5 pb-5 ${judul || aksi ? "" : "pt-5"}`}>{children}</div>
    </section>
  );
}

export function TautanPanel({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800 dark:text-brand-300">
      {children}
      <Ikon nama="kanan" className="size-4" />
    </Link>
  );
}

// ── Angka ringkas ─────────────────────────────────────────────────────────────

const NADA_BULAT = {
  brand: "bg-brand-500 text-white",
  mint: "bg-mint-500 text-white",
  gold: "bg-gold-400 text-[#1f1b5c]",
  flame: "bg-flame-500 text-white",
} as const;

export function Statistik({ ikon, nada, label, nilai, ket }: { ikon: NamaIkon; nada: keyof typeof NADA_BULAT; label: string; nilai: React.ReactNode; ket?: React.ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-full ${NADA_BULAT[nada]}`}>
          <Ikon nama={ikon} className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="truncate text-2xl font-bold tabular-nums text-ink">{nilai}</p>
          {ket && <p className="text-xs text-muted">{ket}</p>}
        </div>
      </div>
    </Panel>
  );
}

// ── Penanda ───────────────────────────────────────────────────────────────────

const NADA_LENCANA = {
  netral: "bg-surface-2 text-muted ring-line",
  brand: "bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:text-brand-200",
  mint: "bg-mint-500/12 text-mint-700 ring-mint-500/25 dark:text-mint-300",
  gold: "bg-gold-400/20 text-gold-700 ring-gold-400/40 dark:text-gold-300",
  oranye: "bg-orange-500/12 text-orange-700 ring-orange-500/25 dark:text-orange-300",
  flame: "bg-flame-500/10 text-flame-700 ring-flame-500/25 dark:text-flame-300",
} as const;

export type NadaLencana = keyof typeof NADA_LENCANA;

export function Lencana({ nada = "netral", children }: { nada?: NadaLencana; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${NADA_LENCANA[nada]}`}>{children}</span>;
}

export const NADA_PREDIKAT: Record<Predikat, NadaLencana> = {
  "Sangat Baik": "brand",
  Baik: "mint",
  Cukup: "gold",
  "Perlu Perbaikan": "oranye",
  Kurang: "flame",
};

export function LencanaPredikat({ predikat }: { predikat: Predikat | null }) {
  if (!predikat) return <span className="text-muted">—</span>;
  return <Lencana nada={NADA_PREDIKAT[predikat]}>{predikat}</Lencana>;
}

const WARNA_AVATAR = [
  "bg-brand-100 text-brand-800",
  "bg-mint-100 text-mint-700",
  "bg-gold-100 text-gold-700",
  "bg-flame-100 text-flame-700",
  "bg-indigo-100 text-indigo-800",
];

export function Avatar({ nama, ukuran = "md" }: { nama: string; ukuran?: "sm" | "md" | "lg" }) {
  const inisial = nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join("")
    .toUpperCase();
  const warna = WARNA_AVATAR[[...nama].reduce((a, c) => a + c.charCodeAt(0), 0) % WARNA_AVATAR.length];
  const besar = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" }[ukuran];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${warna} ${besar}`}>
      {inisial}
    </span>
  );
}

/** Batang kemajuan satu warna; label dan angka selalu tertulis. */
export function Kemajuan({ label, nilai, total, ket, ikon }: { label: string; nilai: number; total: number; ket?: string; ikon?: NamaIkon }) {
  const pct = total ? Math.round((nilai / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      {ikon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <Ikon nama={ikon} className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate font-medium text-body">{label}</span>
          <span className="shrink-0 tabular-nums text-muted">
            {nilai}/{total} <strong className="ml-1 text-ink">{pct}%</strong>
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
        {ket && <p className="mt-1 text-xs text-muted">{ket}</p>}
      </div>
    </div>
  );
}

export function Kosong({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function Kerangka() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat data">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

// ── Kelas bersama ─────────────────────────────────────────────────────────────

export const tabel = {
  bungkus: "overflow-x-auto",
  kepala: "border-y border-line bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted",
  th: "whitespace-nowrap px-5 py-2.5 font-semibold",
  badan: "divide-y divide-line",
  td: "px-5 py-3 align-top",
  angka: "px-5 py-3 text-right align-top tabular-nums",
};

export const kelasInput =
  "mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body shadow-xs outline-none transition placeholder:text-muted/70 focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60";

export const kelasTombol =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50";
