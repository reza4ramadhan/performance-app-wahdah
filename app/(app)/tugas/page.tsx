import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, gt, lte } from "drizzle-orm";
import { ClipboardList } from "lucide-react";
import { KartuTugas } from "@/components/app/tugas";
import { JudulBagian, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { schema as s } from "@/lib/db";
import { daftarTugas, kondisiTugasPenugasan } from "@/lib/data/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, periodeDari, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Tugas khusus" };

export default function HalamanTugas() {
  return (
    <>
      <Kepala judul="Tugas khusus" sub="Tugas dari koordinator atau atasan. Perbarui progresnya; tandai selesai sebelum tenggat lalu tunggu verifikasi pemberi tugas." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const pnIds = sesi.amanah && (sesi.amanah.peranKerja === "SBK" || sesi.amanah.peranKerja === "SK") ? [sesi.amanah.id] : [];
  if (!pnIds.length) return <Kosong ikon={ClipboardList} judul="Tugas khusus untuk SBK dan Staf Khusus" />;
  const today = hariIni(sesi.kantor);
  // Jadwal berulang yang masih jauh tidak ditampilkan dulu.
  const cakrawala = keUtc(tambahHari(today, 8), sesi.kantor);
  const bulanIni = eq(s.tugasKhususJadwal.periodeId, periodeDari(today));
  const [aktif, menunggu, selesai, akanDatang] = await Promise.all([
    daftarTugas(and(kondisiTugasPenugasan(pnIds, ["belum", "dikerjakan", "ditolak"]), lte(s.tugasKhususJadwal.tenggat, cakrawala))),
    daftarTugas(kondisiTugasPenugasan(pnIds, ["diajukan"])),
    daftarTugas(and(kondisiTugasPenugasan(pnIds, ["disetujui"]), bulanIni)),
    daftarTugas(and(kondisiTugasPenugasan(pnIds, ["belum"]), bulanIni, gt(s.tugasKhususJadwal.tenggat, cakrawala))),
  ]);

  if (!aktif.length && !menunggu.length && !selesai.length && !akanDatang.length)
    return (
      <Kosong ikon={ClipboardList} judul="Belum ada tugas khusus">
        Tugas dari koordinator akan muncul di sini beserta tenggatnya.
      </Kosong>
    );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
      <section>
        <JudulBagian>Perlu dikerjakan</JudulBagian>
        {aktif.length ? (
          <ul className="space-y-2">
            {aktif.map((t) => (
              <li key={t.id}>
                <KartuTugas tugas={t} sebagai="staf" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada tugas dengan tenggat dalam sepekan ke depan.</p>
        )}
        {akanDatang.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{akanDatang.length} jadwal lain bulan ini tenggatnya lebih dari sepekan lagi.</p>}
      </section>
      <div className="space-y-5">
        {menunggu.length > 0 && (
          <section>
            <JudulBagian>Menunggu verifikasi</JudulBagian>
            <ul className="space-y-2">
              {menunggu.map((t) => (
                <li key={t.id}>
                  <KartuTugas tugas={t} sebagai="staf" />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <JudulBagian>Selesai bulan ini</JudulBagian>
          {selesai.length ? (
            <ul className="space-y-2">
              {selesai.map((t) => (
                <li key={t.id}>
                  <KartuTugas tugas={t} sebagai="staf" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada tugas yang disetujui bulan ini.</p>
          )}
        </section>
      </div>
    </div>
  );
}
