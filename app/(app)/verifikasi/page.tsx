import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { VerifikasiMassal } from "@/components/app/verifikasi-massal";
import { kondisiAntrean } from "@/lib/data/antrean";
import { liburPerKantor } from "@/lib/data/ikp";
import { daftarItem } from "@/lib/data/item";
import { getDb } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, hariKerjaAntara, labelTanggal, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Verifikasi" };

export default function HalamanVerifikasi() {
  return (
    <>
      <Kepala judul="Verifikasi" sub="Item yang menunggu keputusan Anda. Item yang belum diverifikasi saat batas akhir bulan tidak dihitung sebagai realisasi." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibPeran("koordinator", "keuangan", "sekretariat", "waka", "kepala");
  const db = await getDb();
  const [items, libur] = await Promise.all([daftarItem(await kondisiAntrean(sesi), { kantor: sesi.kantor, batas: 300 }), liburPerKantor(db)]);
  const today = hariIni(sesi.kantor);

  if (!items.length)
    return (
      <Kosong ikon={BadgeCheck} judul="Tidak ada yang menunggu">
        Semua item yang diajukan kepada Anda sudah diverifikasi.
      </Kosong>
    );

  return (
    <VerifikasiMassal
      items={items
        .sort((a, b) => (a.diajukanPada?.getTime() ?? 0) - (b.diajukanPada?.getTime() ?? 0))
        .map((i) => ({
          id: i.id,
          judul: i.judul,
          pemilik: i.pemilikNama,
          kode: i.indikatorKode,
          pendek: i.indikatorPendek,
          diajukan: i.diajukanPada ? labelTanggal(tanggalLokal(i.diajukanPada, sesi.kantor)) : "—",
          selesai: i.tglSelesai ? labelTanggal(tanggalLokal(i.tglSelesai, sesi.kantor)) : "—",
          linkBukti: i.linkBukti,
          lambat: !!i.diajukanPada && hariKerjaAntara(tanggalLokal(i.diajukanPada, sesi.kantor), today, libur(sesi.kantor)) > 1,
        }))}
    />
  );
}
