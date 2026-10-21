// Komponen tampilan bersama, mengikuti referensi: kartu putih membulat, ikon berlatar lembut, angka tebal.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { inisial } from "@/lib/format";
import type { Predikat, StatusItem } from "@/lib/ikp/tipe";
import { LABEL_STATUS_ITEM } from "@/lib/ikp/tipe";

export function Kepala({ judul, sub, aksi, kembali }: { judul: string; sub?: React.ReactNode; aksi?: React.ReactNode; kembali?: string }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {kembali && (
          <Link href={kembali} className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary -ml-1 px-1">
            <ChevronRight className="size-4 rotate-180" /> Kembali
          </Link>
        )}
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-heading lg:text-2xl">{judul}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {aksi && <div className="shrink-0">{aksi}</div>}
    </header>
  );
}

export function Kartu({ className, children, ...p }: React.ComponentProps<"section">) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(16_60_70/0.04),0_4px_16px_-8px_rgb(16_60_70/0.08)]", className)} {...p}>
      {children}
    </section>
  );
}

export function JudulBagian({ children, aksi }: { children: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-heading">{children}</h2>
      {aksi}
    </div>
  );
}

export function TautanKecil({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
      {children}
    </Link>
  );
}

const NADA = {
  brand: "bg-brand-500/12 text-brand-700 dark:text-brand-200",
  mint: "bg-mint-500/14 text-mint-700 dark:text-mint-100",
  gold: "bg-gold-400/25 text-gold-700 dark:text-gold-100",
  flame: "bg-flame-500/12 text-flame-700 dark:text-flame-100",
  ink: "bg-indigo-500/10 text-ink dark:text-indigo-200",
  netral: "bg-muted text-muted-foreground",
} as const;
export type Nada = keyof typeof NADA;

/** Petak ikon berlatar lembut seperti "Quick Actions" di referensi. */
export function PetakIkon({ ikon: Ikon, nada = "brand", besar = false }: { ikon: LucideIcon; nada?: Nada; besar?: boolean }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl", NADA[nada], besar ? "size-12" : "size-10")}>
      <Ikon className={besar ? "size-6" : "size-5"} strokeWidth={1.9} />
    </span>
  );
}

export function Lencana({ nada = "netral", children, className }: { nada?: Nada; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", NADA[nada], className)}>{children}</span>;
}

const NADA_STATUS: Record<StatusItem, Nada> = { terbuka: "netral", diajukan: "gold", disetujui: "mint", ditolak: "flame" };
export function LencanaStatus({ status }: { status: StatusItem }) {
  return <Lencana nada={NADA_STATUS[status]}>{LABEL_STATUS_ITEM[status]}</Lencana>;
}

export const NADA_PREDIKAT: Record<Predikat, Nada> = { "Sangat Baik": "brand", Baik: "mint", Cukup: "gold", "Perlu Perbaikan": "flame", Kurang: "flame" };
export function LencanaPredikat({ predikat }: { predikat: Predikat | null }) {
  if (!predikat) return <span className="text-muted-foreground">—</span>;
  return <Lencana nada={NADA_PREDIKAT[predikat]}>{predikat}</Lencana>;
}

const WARNA_AVATAR = ["bg-brand-100 text-brand-800", "bg-mint-100 text-mint-700", "bg-gold-100 text-gold-700", "bg-flame-100 text-flame-700", "bg-indigo-100 text-indigo-800"];
export function Avatar({ nama, ukuran = "md", className }: { nama: string; ukuran?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const warna = WARNA_AVATAR[[...nama].reduce((a, c) => a + c.charCodeAt(0), 0) % WARNA_AVATAR.length];
  const besar = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base", xl: "size-16 text-xl" }[ukuran];
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-bold", warna, besar, className)}>
      {inisial(nama)}
    </span>
  );
}

/** Cincin kemajuan seperti "Daily Progress" di referensi. Angka selalu tertulis di tengah. */
export function Cincin({ nilai, label, ukuran = 88, tebal = 9 }: { nilai: number | null; label?: string; ukuran?: number; tebal?: number }) {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const pct = nilai === null ? 0 : Math.max(0, Math.min(100, nilai));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: ukuran, height: ukuran }} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <svg width={ukuran} height={ukuran} className="-rotate-90">
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" strokeWidth={tebal} className="stroke-muted" />
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - pct / 100)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums text-heading">{nilai === null ? "—" : `${Math.round(pct)}%`}</span>
    </div>
  );
}

/** Batang sederhana satu warna; label dan angka selalu tertulis. */
export function Batang({ nilai, nada = "brand", className }: { nilai: number | null; nada?: "brand" | "mint" | "gold" | "flame"; className?: string }) {
  const warna = { brand: "bg-primary", mint: "bg-mint-500", gold: "bg-gold-500", flame: "bg-flame-500" }[nada];
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", warna)} style={{ width: `${Math.max(0, Math.min(100, nilai ?? 0))}%` }} />
    </div>
  );
}

/** Kartu angka kecil 2×2 seperti "Total Tasks / In Progress" di referensi. */
export function Statistik({ ikon, nada, label, nilai, href }: { ikon: LucideIcon; nada: Nada; label: string; nilai: React.ReactNode; href?: string }) {
  const isi = (
    <Kartu className="flex items-center gap-3 p-3.5">
      <PetakIkon ikon={ikon} nada={nada} />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-heading">{nilai}</p>
      </div>
    </Kartu>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl transition active:scale-[0.98]">
      {isi}
    </Link>
  ) : (
    isi
  );
}

export function BarisTautan({ href, ikon, nada, judul, sub, kanan }: { href: string; ikon: LucideIcon; nada?: Nada; judul: string; sub?: React.ReactNode; kanan?: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-muted/60 active:bg-muted">
      <PetakIkon ikon={ikon} nada={nada} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-heading">{judul}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      {kanan}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function Kosong({ ikon: Ikon, judul, children }: { ikon?: LucideIcon; judul: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      {Ikon && <Ikon className="mb-3 size-8 text-muted-foreground/70" strokeWidth={1.6} />}
      <p className="font-semibold text-heading">{judul}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Kerangka() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-card" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}

/** Kelas tabel rekap untuk layar lebar. */
export const tabel = {
  bungkus: "-mx-4 overflow-x-auto",
  kepala: "border-y border-border bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  th: "whitespace-nowrap px-4 py-2.5",
  badan: "divide-y divide-border",
  td: "px-4 py-3 align-top",
  angka: "px-4 py-3 text-right align-top tabular-nums",
};
