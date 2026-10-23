import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { ClipboardList, Trash2 } from "lucide-react";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { FormTugasBaru, KartuTugas } from "@/components/app/tugas";
import { Batang, JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { hapusTugasKhusus } from "@/app/aksi/tugas";
import { getDb, schema as s } from "@/lib/db";
import { anggotaTim } from "@/lib/data/tim";
import { daftarTugas, kondisiTugasMenunggu } from "@/lib/data/tugas";
import { LABEL_FREKUENSI_TUGAS, LABEL_PERAN_KERJA, type PeranKerja } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelTanggal, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Tugas khusus staf" };

export default function HalamanTugasStaf() {
  return (
    <>
      <Kepala judul="Tugas khusus" kembali="/tim" sub="Beri tugas ber-tenggat kepada staf, lalu verifikasi yang ditandai selesai. Tugas selesai tepat waktu menambah K1 staf." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  const staf = (await anggotaTim(sesi.pegawaiId, sesi.kantor)).flatMap((t) =>
    t.penugasan.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK").map((p) => ({ id: p.id, label: `${t.nama} · ${LABEL_PERAN_KERJA[p.peranKerja as PeranKerja]} ${p.unitNama}` })),
  );
  const db = await getDb();
  const [menunggu, induk] = await Promise.all([
    daftarTugas(kondisiTugasMenunggu(sesi.pegawaiId)),
    db
      .select({ t: s.tugasKhusus, staf: s.pegawai.nama })
      .from(s.tugasKhusus)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.tugasKhusus.penugasanId))
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(and(eq(s.tugasKhusus.dibuatOleh, sesi.pegawaiId), gte(s.tugasKhusus.tanggalAkhir, rentangPeriode(periodeDari(today)).awal)))
      .orderBy(asc(s.tugasKhusus.tanggalAkhir)),
  ]);
  const jadwal = induk.length
    ? await db.select({ tugasId: s.tugasKhususJadwal.tugasId, status: s.tugasKhususJadwal.status, persen: s.tugasKhususJadwal.persen }).from(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.tugasId, induk.map((x) => x.t.id)))
    : [];

  if (!staf.length && !induk.length && !menunggu.length) return <Kosong ikon={ClipboardList} judul="Tidak ada SBK atau Staf Khusus di tim Anda" />;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="order-2 space-y-5 lg:order-1">
        {menunggu.length > 0 && (
          <section>
            <JudulBagian>Menunggu verifikasi · {menunggu.length}</JudulBagian>
            <ul className="space-y-2">
              {menunggu.map((t) => (
                <li key={t.id}>
                  <KartuTugas tugas={t} sebagai="pemberi" tampilStaf />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <JudulBagian>Tugas yang diberikan</JudulBagian>
          {induk.length ? (
            <ul className="space-y-2">
              {induk.map(({ t, staf: nama }) => {
                const js = jadwal.filter((j) => j.tugasId === t.id);
                const selesai = js.filter((j) => j.status === "disetujui").length;
                const satu = t.frekuensi === "sekali" ? js[0] : undefined;
                return (
                  <li key={t.id} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-heading">{t.judul}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nama} · {LABEL_FREKUENSI_TUGAS[t.frekuensi]} · {t.frekuensi === "sekali" ? `tenggat ${labelTanggal(t.tanggalMulai)}` : `${labelTanggal(t.tanggalMulai)}–${labelTanggal(t.tanggalAkhir)}`} pukul {t.jamTenggat}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Batang nilai={satu ? satu.persen : js.length ? (selesai / js.length) * 100 : 0} className="flex-1" nada={selesai === js.length && js.length ? "mint" : "brand"} />
                        <Lencana nada={selesai === js.length && js.length ? "mint" : "netral"}>{satu ? (satu.status === "disetujui" ? "Selesai" : `${satu.persen}%`) : `${selesai}/${js.length} selesai`}</Lencana>
                      </div>
                    </div>
                    <TombolAksi
                      aksi={hapusTugasKhusus.bind(null, t.id)}
                      konfirmasi="Hapus tugas ini? Jadwal yang sudah disetujui tetap tercatat."
                      varian="ghost"
                      ukuran="icon"
                      label="Hapus tugas"
                    >
                      <Trash2 className="size-4" />
                    </TombolAksi>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Kosong ikon={ClipboardList} judul="Belum ada tugas bulan ini" />
          )}
        </section>
      </div>

      {staf.length > 0 && (
        <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
          <h2 className="text-[15px] font-semibold text-heading">Tugas baru</h2>
          <FormTugasBaru staf={staf} hariIni={today} />
        </Kartu>
      )}
    </div>
  );
}
