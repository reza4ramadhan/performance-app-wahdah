import type { Metadata } from "next";
import { Suspense } from "react";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { FormPdCepat, TombolHapus } from "@/components/app/form-harian";
import { Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { bilangan } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggal, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Pengembangan diri" };

export default function HalamanPd() {
  return (
    <>
      <Kepala judul="Pengembangan diri" sub="Bacaan, kajian, atau pelatihan. Bila bulan ini kosong, skor nilai K3 “Pengembangan diri” paling tinggi 2." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();
  const [rows, minTanggal] = await Promise.all([
    db
      .select()
      .from(s.pengembanganDiri)
      .where(and(eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId), gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir)))
      .orderBy(desc(s.pengembanganDiri.tanggal)),
    tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
  ]);
  const menit = rows.reduce((a, r) => a + r.durasiMenit, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="order-2 space-y-3 lg:order-1">
        <Kartu className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelPeriode(periode)}</p>
            <p className="text-lg font-bold text-heading">
              {rows.length} catatan · {bilangan(menit)} menit
            </p>
          </div>
          {rows.length ? <Lencana nada="mint">Syarat K3 terpenuhi</Lencana> : <Lencana nada="gold">Belum ada</Lencana>}
        </Kartu>
        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-heading">{r.judul}</p>
                  <p className="text-sm text-foreground/80">{r.ringkasan}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {labelTanggal(r.tanggal)} · {r.durasiMenit} menit
                  </p>
                </div>
                {r.tanggal >= minTanggal && <TombolHapus id={r.id} jenis="pd" />}
              </li>
            ))}
          </ul>
        ) : (
          <Kosong ikon={BookOpen} judul="Belum ada catatan bulan ini">
            Cukup judul, durasi, dan satu kalimat ringkasan.
          </Kosong>
        )}
      </div>
      <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
        <h2 className="text-[15px] font-semibold text-heading">Tambah catatan</h2>
        <FormPdCepat tanggal={today} minTanggal={minTanggal} />
      </Kartu>
    </div>
  );
}
