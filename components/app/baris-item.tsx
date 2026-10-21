import Link from "next/link";
import { CircleCheck, CircleDashed, CircleDot, CircleX } from "lucide-react";
import type { BarisItem } from "@/lib/data/item";
import type { StatusItem } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { Lencana, LencanaStatus } from "./ui";

const IKON: Record<StatusItem, { Ikon: typeof CircleCheck; warna: string }> = {
  terbuka: { Ikon: CircleDashed, warna: "text-muted-foreground" },
  diajukan: { Ikon: CircleDot, warna: "text-gold-500" },
  disetujui: { Ikon: CircleCheck, warna: "text-mint-500" },
  ditolak: { Ikon: CircleX, warna: "text-flame-500" },
};

/** Baris item seperti daftar tugas di referensi: ikon status, judul, keterangan, penanda tenggat. */
export function KartuItem({ item, pemilik = false, href }: { item: BarisItem; pemilik?: boolean; href?: string }) {
  const { Ikon, warna } = IKON[item.status];
  return (
    <Link
      href={href ?? `/item/${item.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 transition hover:border-primary/30 active:scale-[0.99]"
    >
      <Ikon className={cn("size-6 shrink-0", warna)} strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-heading">{item.judul}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {pemilik ? `${item.pemilikNama} · ` : ""}
          {item.indikatorKode} {item.indikatorPendek}
          {item.kegiatanNama && !item.judul.includes(item.kegiatanNama) ? ` · ${item.kegiatanNama}` : ""}
        </span>
        {item.status === "ditolak" && item.alasanTolak && <span className="mt-0.5 block truncate text-xs font-medium text-flame-600">Ditolak: {item.alasanTolak}</span>}
      </span>
      {item.sisa ? <Lencana nada={item.sisa.nada}>{item.sisa.teks}</Lencana> : <LencanaStatus status={item.status} />}
    </Link>
  );
}
