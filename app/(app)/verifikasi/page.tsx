import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck, ClipboardCheck } from "lucide-react";
import { BarisTautan, Kartu, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { VerifikasiMassal } from "@/components/app/verifikasi-massal";
import { barisAntrean, kondisiAntrean } from "@/lib/data/antrean";
import { liburPerKantor } from "@/lib/data/ikp";
import { daftarItem } from "@/lib/data/item";
import { daftarTugas, jumlahUsulanMenunggu, kondisiTugasMenunggu } from "@/lib/data/tugas";
import { ringkasanTugasTim } from "@/lib/format";
import { getDb } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";

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
  const [items, libur, tugas, usulan] = await Promise.all([
    daftarItem(await kondisiAntrean(sesi), { kantor: sesi.kantor, batas: 300 }),
    liburPerKantor(db),
    daftarTugas(kondisiTugasMenunggu(sesi.pegawaiId)),
    jumlahUsulanMenunggu(sesi.pegawaiId),
  ]);
  const kartuTugas = (tugas.length > 0 || usulan > 0) && (
    <Kartu className="mb-4 p-2">
      <BarisTautan href="/tim/tugas" ikon={ClipboardCheck} nada="gold" judul="Tugas khusus" sub={ringkasanTugasTim(tugas.length, usulan)} />
    </Kartu>
  );

  if (!items.length)
    return (
      <>
        {kartuTugas}
        <Kosong ikon={BadgeCheck} judul="Tidak ada item yang menunggu">
          Semua item yang diajukan kepada Anda sudah diverifikasi.
        </Kosong>
      </>
    );

  return (
    <>
      {kartuTugas}
      <VerifikasiMassal items={barisAntrean(items, sesi, libur(sesi.kantor))} />
    </>
  );
}
