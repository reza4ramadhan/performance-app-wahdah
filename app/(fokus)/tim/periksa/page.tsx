import type { Metadata } from "next";
import { Suspense } from "react";
import { Periksa, type KartuPeriksa } from "@/components/app/periksa";
import { Kerangka } from "@/components/app/ui";
import { kontrolStaf, tepatWaktuItem } from "@/lib/data/kontrol-staf";
import { wajibSesi } from "@/lib/sesi";
import { labelTanggal, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Periksa pekerjaan staf" };

export default function HalamanPeriksa() {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi />
    </Suspense>
  );
}

/** Semua item dan tugas khusus yang menunggu persetujuan saya, yang paling lama diajukan lebih dulu. */
async function Isi() {
  const sesi = await wajibSesi();
  const k = await kontrolStaf(sesi);
  const tgl = (d: Date | null) => (d ? labelTanggal(tanggalLokal(d, sesi.kantor)) : null);
  const baris: { urut: number; kartu: KartuPeriksa }[] = [
    ...k.antrean.map((i) => ({
      urut: i.diajukanPada?.getTime() ?? 0,
      kartu: {
        jenis: "item" as const,
        id: i.id,
        judul: i.judul,
        staf: i.pemilikNama,
        label: i.indikatorPendek,
        selesai: tgl(i.tglSelesai),
        tepat: tepatWaktuItem(i, sesi),
        linkBukti: i.linkBukti,
        milikSendiri: i.pemilikId === sesi.pegawaiId,
      },
    })),
    ...k.tugasMenunggu.map((t) => ({
      urut: t.selesaiPada?.getTime() ?? 0,
      kartu: {
        jenis: "tugas" as const,
        id: t.id,
        judul: t.judul,
        staf: t.stafNama,
        label: "Tugas khusus",
        selesai: tgl(t.selesaiPada),
        tepat: t.selesaiPada ? t.selesaiPada <= t.tenggat : null,
        linkBukti: t.linkBukti,
        milikSendiri: false,
      },
    })),
  ];
  return <Periksa daftar={baris.sort((a, b) => a.urut - b.urut).map((b) => b.kartu)} />;
}
