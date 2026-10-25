// Kartu Kegiatan SKUO di dashboard SBK: daftar pekerjaan satu kegiatan.
// Pengingat 1 & 2, SPP, SPB dibuat otomatis; Layanan dan Arsip ditambah staf dari kartu ini.

import type { BarisItem } from "@/lib/data/item";
import { indikatorDari } from "@/lib/ikp/katalog";
import { PARAMETER } from "@/lib/ikp/tipe";
import { jamLokal, labelTanggalPanjang, tanggalLokal, type Kantor } from "@/lib/waktu";
import { BarisPekerjaan, type ItemPekerjaan } from "./isi-pekerjaan";
import { TombolCatat } from "./tombol-catat";
import { Lencana } from "./ui";

export type KegiatanSkuo = { id: string; nama: string; tanggal: string; skuoNama: string | null; perluSpp: boolean; perluSpb: boolean; penugasanId: string };

/** Item → nilai awal sheet isian (tanggal dalam zona kantor). */
function keItemPekerjaan(i: BarisItem | undefined, kantor: Kantor): ItemPekerjaan | undefined {
  if (!i) return undefined;
  const bentuk = indikatorDari(i.indikatorKode)?.item;
  const fmt = (d: Date | null, jenis: "tanggal" | "waktu" | undefined) => (d ? (jenis === "waktu" ? `${tanggalLokal(d, kantor)}T${jamLokal(d, kantor)}` : tanggalLokal(d, kantor)) : "");
  return {
    id: i.id,
    status: i.status,
    sisa: i.sisa,
    alasanTolak: i.alasanTolak,
    awal: {
      kegiatanId: i.kegiatanId ?? "",
      masuk: fmt(i.tglMasuk, bentuk?.masuk?.jenis),
      selesai: fmt(i.tglSelesai, bentuk?.selesai.jenis),
      linkBukti: i.linkBukti ?? "",
      data: i.data,
      sudahSelesai: !!i.tglSelesai,
    },
  };
}

export function KartuKegiatan({ kegiatan: k, items, hariIni, kantor, minTanggal }: { kegiatan: KegiatanSkuo; items: BarisItem[]; hariIni: string; kantor: Kantor; minTanggal: string }) {
  const dari = (kode: string) => items.filter((i) => i.indikatorKode === kode);
  const pengingat = dari("SBK-3");
  // Baris tetap: pekerjaan otomatis selalu tampil, meski itemnya belum terbentuk (kegiatan lama).
  const baris = [
    ...PARAMETER.pengingatHMinus.map((h, n) => ({ kunci: `p${n}`, label: `Pengingat ${n + 1}`, ket: `≤ H-${h}`, kode: "SBK-3", ke: String(n + 1), item: pengingat.find((i) => i.data.ke === String(n + 1)) })),
    ...(k.perluSpp ? [{ kunci: "spp", label: "SPP", kode: "SBK-2a", item: dari("SBK-2a")[0] }] : []),
    ...(k.perluSpb ? [{ kunci: "spb", label: "SPB", kode: "SBK-2b", item: dari("SBK-2b")[0] }] : []),
    ...dari("SBK-4").map((i) => ({ kunci: i.id, label: "Layanan", ket: i.data.jenis, kode: i.indikatorKode, item: i })),
    ...dari("SBK-5").map((i) => ({ kunci: i.id, label: "Arsip", ket: i.data.judul || i.data.jenis, kode: i.indikatorKode, item: i })),
  ];
  const selesai = baris.filter((b) => b.item?.status === "diajukan" || b.item?.status === "disetujui").length;
  const selisih = Math.round((Date.parse(k.tanggal) - Date.parse(hariIni)) / 86_400_000);
  const keg = { id: k.id, nama: k.nama, tanggal: k.tanggal };

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
            {selesai}/{baris.length} selesai
          </span>
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {baris.map(({ kunci, item, ...b }) => (
          <BarisPekerjaan key={kunci} {...b} item={keItemPekerjaan(item, kantor)} kegiatan={keg} hariIni={hariIni} minTanggal={minTanggal} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 px-1">
        <TombolCatat label="Layanan" varian="outline" preset={{ penugasanId: k.penugasanId, kode: "SBK-4", kegiatanId: k.id }} />
        <TombolCatat label="Arsip" varian="outline" preset={{ penugasanId: k.penugasanId, kode: "SBK-5", kegiatanId: k.id }} />
      </div>
    </div>
  );
}
