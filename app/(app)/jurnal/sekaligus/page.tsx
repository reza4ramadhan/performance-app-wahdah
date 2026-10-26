import type { Metadata } from "next";
import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { FormJurnalSekaligus } from "@/components/app/form-harian";
import { Kepala, Kerangka } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni } from "@/lib/waktu";

export const metadata: Metadata = { title: "Isi jurnal sekaligus" };

export default function HalamanJurnalSekaligus() {
  return (
    <>
      <Kepala judul="Isi jurnal sekaligus" kembali="/jurnal" sub="Tulis beberapa poin pekerjaan satu hari sekaligus, masing-masing dengan jam mulai dan selesainya." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [unit, minTanggal] = await Promise.all([
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.jenis, ["bidang", "skuo", "unit_pendukung"])).orderBy(s.unit.nama),
    tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
  ]);
  return (
    <div className="max-w-2xl">
      <FormJurnalSekaligus tanggal={hariIni(sesi.kantor)} unit={unit} minTanggal={minTanggal} />
    </div>
  );
}
