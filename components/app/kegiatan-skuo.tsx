// Kartu Kegiatan SKUO di dashboard SBK: daftar pekerjaan satu kegiatan.
// Pengingat 1 & 2, SPP, SPB dibuat otomatis; Layanan dan Arsip ditambah staf dari kartu ini.

import Link from "next/link";
import { CircleDashed } from "lucide-react";
import type { BarisItem } from "@/lib/data/item";
import { PARAMETER } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { labelTanggalPanjang } from "@/lib/waktu";
import { IKON_STATUS } from "./baris-item";
import { TombolCatat } from "./tombol-catat";
import { Lencana, LencanaStatus } from "./ui";

export type KegiatanSkuo = { id: string; nama: string; tanggal: string; skuoNama: string | null; perluSpp: boolean; perluSpb: boolean; penugasanId: string };

function BarisPekerjaan({ label, item, ket }: { label: string; item?: BarisItem; ket?: string }) {
  const { Ikon, warna } = item ? IKON_STATUS[item.status] : { Ikon: CircleDashed, warna: "text-muted-foreground/50" };
  const isi = (
    <>
      <Ikon className={cn("size-5 shrink-0", warna)} strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
        {label}
        {ket && <span className="font-normal text-muted-foreground"> · {ket}</span>}
      </span>
      {item ? item.sisa ? <Lencana nada={item.sisa.nada}>{item.sisa.teks}</Lencana> : <LencanaStatus status={item.status} /> : <Lencana>Belum ada</Lencana>}
    </>
  );
  return item ? (
    <Link href={`/item/${item.id}`} className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition hover:bg-muted/60 active:bg-muted">
      {isi}
    </Link>
  ) : (
    <div className="flex min-h-11 items-center gap-2.5 px-2">{isi}</div>
  );
}

export function KartuKegiatan({ kegiatan: k, items, hariIni }: { kegiatan: KegiatanSkuo; items: BarisItem[]; hariIni: string }) {
  const dari = (kode: string) => items.filter((i) => i.indikatorKode === kode);
  const pengingat = dari("SBK-3");
  const layanan = dari("SBK-4");
  const arsip = dari("SBK-5");
  const selesai = items.filter((i) => i.status === "diajukan" || i.status === "disetujui").length;
  const selisih = Math.round((Date.parse(k.tanggal) - Date.parse(hariIni)) / 86_400_000);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5">
      <div className="mb-2 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-heading">{k.nama}</p>
          <p className="text-xs text-muted-foreground">
            {labelTanggalPanjang(k.tanggal)}
            {k.skuoNama ? ` · ${k.skuoNama}` : ""}
          </p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Lencana nada={selisih < 0 ? "netral" : selisih <= 2 ? "gold" : "brand"}>{selisih > 0 ? `H-${selisih}` : selisih === 0 ? "Hari H" : `H+${-selisih}`}</Lencana>
          <span className="text-xs tabular-nums text-muted-foreground">
            {selesai}/{items.length} selesai
          </span>
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {PARAMETER.pengingatHMinus.map((h, n) => (
          <BarisPekerjaan key={h} label={`Pengingat ${n + 1}`} ket={`≤ H-${h}`} item={pengingat.find((i) => i.data.ke === String(n + 1))} />
        ))}
        {k.perluSpp && <BarisPekerjaan label="SPP" item={dari("SBK-2a")[0]} />}
        {k.perluSpb && <BarisPekerjaan label="SPB" item={dari("SBK-2b")[0]} />}
        {layanan.map((i) => (
          <BarisPekerjaan key={i.id} label="Layanan" ket={i.data.jenis} item={i} />
        ))}
        {arsip.map((i) => (
          <BarisPekerjaan key={i.id} label="Arsip" ket={i.data.judul || i.data.jenis} item={i} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 px-1">
        <TombolCatat label="Layanan" varian="outline" preset={{ penugasanId: k.penugasanId, kode: "SBK-4", kegiatanId: k.id }} />
        <TombolCatat label="Arsip" varian="outline" preset={{ penugasanId: k.penugasanId, kode: "SBK-5", kegiatanId: k.id }} />
      </div>
    </div>
  );
}
