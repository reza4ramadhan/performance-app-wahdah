import type { Metadata } from "next";
import { Suspense } from "react";
import { and, desc, eq, gte } from "drizzle-orm";
import { MessageSquareText } from "lucide-react";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan, kelasTeks } from "@/components/app/kolom";
import { Avatar, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { simpanCatatan } from "@/app/aksi/tim";
import { getDb, schema as s } from "@/lib/db";
import { anggotaTim } from "@/lib/data/tim";
import { LABEL_NILAI_K3, NILAI_K3, type NilaiK3 } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelTanggal, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Catatan perilaku" };

export default function HalamanCatatan() {
  return (
    <>
      <Kepala judul="Catatan perilaku" kembali="/tim" sub="Catat kejadian kapan saja. Catatan ini tampil sebagai bahan “contoh perilaku” saat menilai K3 di akhir bulan." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const tim = await anggotaTim(sesi.pegawaiId, sesi.kantor);
  if (!tim.length) return <Kosong ikon={MessageSquareText} judul="Belum ada anggota tim" />;
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const catatan = await db
    .select({ c: s.catatanPerilaku, nama: s.pegawai.nama })
    .from(s.catatanPerilaku)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.catatanPerilaku.pegawaiId))
    .where(and(eq(s.catatanPerilaku.penilaiId, sesi.pegawaiId), gte(s.catatanPerilaku.tanggal, tambahHari(today, -62))))
    .orderBy(desc(s.catatanPerilaku.tanggal), desc(s.catatanPerilaku.dibuatPada));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="order-2 space-y-2 lg:order-1">
        {catatan.length ? (
          catatan.map(({ c, nama }) => (
            <Kartu key={c.id} className="flex items-start gap-3">
              <Avatar nama={nama} ukuran="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong className="text-heading">{nama}</strong> <span className="text-muted-foreground">· {labelTanggal(c.tanggal)}</span>
                </p>
                <p className="text-[15px]">{c.catatan}</p>
                {c.nilaiK3 && <Lencana nada="brand" className="mt-1">{LABEL_NILAI_K3[c.nilaiK3 as NilaiK3]}</Lencana>}
              </div>
            </Kartu>
          ))
        ) : (
          <Kosong ikon={MessageSquareText} judul="Belum ada catatan">Catatan singkat membantu penilaian K3 yang adil dan berdasar.</Kosong>
        )}
      </section>
      <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
        <h2 className="text-[15px] font-semibold text-heading">Catatan baru</h2>
        <FormAksi aksi={simpanCatatan} tombol="Simpan catatan" tombolPenuh className="mt-3 space-y-3">
          <input type="hidden" name="tanggal" value={today} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Staf</span>
            <select name="pegawaiId" className={kelasPilihan} required defaultValue="">
              <option value="" disabled>
                Pilih staf…
              </option>
              {tim.map((t) => (
                <option key={t.pegawaiId} value={t.pegawaiId}>
                  {t.nama}
                </option>
              ))}
            </select>
            <Galat nama="pegawaiId" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Nilai K3 terkait (opsional)</span>
            <select name="nilaiK3" className={kelasPilihan} defaultValue="">
              <option value="">—</option>
              {NILAI_K3.map((n) => (
                <option key={n} value={n}>
                  {LABEL_NILAI_K3[n]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Catatan</span>
            <textarea name="catatan" required rows={3} className={kelasTeks} placeholder="Apa yang terjadi, kapan, dan dampaknya" />
            <Galat nama="catatan" />
          </label>
        </FormAksi>
      </Kartu>
    </div>
  );
}
