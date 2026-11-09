import Link from "next/link";
import { CircleCheck, CircleDashed, CircleDot, CircleX } from "lucide-react";
import type { BarisItem } from "@/lib/data/item";
import type { SisaTenggat } from "@/lib/ikp/tenggat";
import { LABEL_STATUS_ITEM, type StatusItem } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";

export const IKON_STATUS: Record<StatusItem, { Ikon: typeof CircleCheck; warna: string }> = {
  terbuka: { Ikon: CircleDashed, warna: "text-muted-foreground" },
  diajukan: { Ikon: CircleDot, warna: "text-gold-500" },
  disetujui: { Ikon: CircleCheck, warna: "text-mint-500" },
  ditolak: { Ikon: CircleX, warna: "text-flame-500" },
};

const WARNA_SISA: Record<SisaTenggat["nada"], string> = {
  netral: "text-heading",
  gold: "text-gold-700 dark:text-gold-100",
  flame: "text-flame-600 dark:text-flame-100",
};

const WARNA_STATUS: Record<StatusItem, string> = {
  terbuka: "text-muted-foreground",
  diajukan: "text-gold-700 dark:text-gold-100",
  disetujui: "text-mint-700 dark:text-mint-100",
  ditolak: "text-flame-600 dark:text-flame-100",
};

/** Kolom kanan dua baris: angka/kata kunci tenggat di atas, satuannya di bawah, rata kanan supaya terbaca menurun. */
function KolomTenggat({ sisa, status }: { sisa: SisaTenggat | null; status: StatusItem }) {
  if (!sisa) return <span className={cn("block text-xs font-semibold leading-tight", WARNA_STATUS[status])}>{LABEL_STATUS_ITEM[status]}</span>;
  const angka = /^\d+$/.test(sisa.pokok);
  return (
    <>
      <span className={cn("block font-bold leading-tight tabular-nums", angka ? "text-lg" : "text-[15px]", WARNA_SISA[sisa.nada])}>{sisa.pokok}</span>
      <span className="block text-[11px] font-medium leading-tight text-muted-foreground">{sisa.rincian}</span>
    </>
  );
}

/** Baris item: ikon status, judul, pemilik/kode/kegiatan, alasan tolak, dan kolom tenggat. Item lewat tenggat atau ditolak diberi rona merah. */
export function KartuItem({ item, pemilik = false, href }: { item: BarisItem; pemilik?: boolean; href?: string }) {
  const { Ikon, warna } = IKON_STATUS[item.status];
  const perhatian = item.lewat || item.status === "ditolak";
  const kegiatan = item.kegiatanNama && !item.judul.includes(item.kegiatanNama) ? item.kegiatanNama : null;
  return (
    <Link
      href={href ?? `/item/${item.id}`}
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-card px-3.5 py-3 outline-none transition active:scale-[0.99] motion-reduce:active:scale-100",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        perhatian ? "border-flame-500/25 bg-flame-50/60 hover:border-flame-500/45 dark:bg-flame-500/[0.06]" : "border-border/70 hover:border-primary/30",
      )}
    >
      <Ikon className={cn("mt-px size-6 shrink-0", warna)} strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-heading">{item.judul}</span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {pemilik && <span className="max-w-[45%] shrink-0 truncate font-medium text-foreground">{item.pemilikNama}</span>}
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[11px] font-semibold tabular-nums text-foreground/70">{item.indikatorKode}</span>
          <span className="truncate">
            {item.indikatorPendek}
            {kegiatan && ` · ${kegiatan}`}
          </span>
        </span>
        {item.status === "ditolak" && item.alasanTolak && (
          <span className="mt-1.5 line-clamp-2 text-xs leading-snug text-flame-700 dark:text-flame-100">
            <span className="font-semibold">Ditolak:</span> {item.alasanTolak}
          </span>
        )}
      </span>
      <span className="w-[4.5rem] shrink-0 text-right">
        <KolomTenggat sisa={item.sisa} status={item.status} />
      </span>
    </Link>
  );
}
