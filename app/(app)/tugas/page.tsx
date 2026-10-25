import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq, lte } from "drizzle-orm";
import { ClipboardList, ListPlus } from "lucide-react";
import { KartuTugas } from "@/components/app/tugas";
import { Button } from "@/components/ui/button";
import { JudulBagian, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { schema as s } from "@/lib/db";
import { daftarTugas, kondisiTugasPenugasan, tugasAkanDatang } from "@/lib/data/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, periodeDari, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Tugas khusus" };

export default function HalamanTugas() {
  return (
    <>
      <Kepala
        judul="Tugas khusus"
        sub="Tugas dari koordinator atau atasan. Perbarui progresnya; tandai selesai sebelum tenggat lalu tunggu verifikasi pemberi tugas."
        aksi={
          <Suspense>
            <TombolUsulkan />
          </Suspense>
        }
      />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

/** Staf Khusus bisa mengusulkan tugas sendiri kepada atasannya. */
async function TombolUsulkan() {
  const sesi = await wajibSesi();
  if (sesi.amanah?.peranKerja !== "SK") return null;
  return (
    <Button asChild size="sm">
      <Link href="/tugas/usulan">
        <ListPlus className="size-4" /> Usulkan
      </Link>
    </Button>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const pnIds = sesi.amanahPn.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK").map((p) => p.id);
  if (!pnIds.length) return <Kosong ikon={ClipboardList} judul="Tugas khusus untuk SBK dan Staf Khusus" />;
  const today = hariIni(sesi.kantor);
  // Sepekan ke depan tampil per jadwal; yang lebih jauh cukup jadwal terdekat tiap tugas.
  const cakrawala = keUtc(tambahHari(today, 8), sesi.kantor);
  const bulanIni = eq(s.tugasKhususJadwal.periodeId, periodeDari(today));
  const [aktif, menunggu, selesai, semuaAkanDatang] = await Promise.all([
    daftarTugas(and(kondisiTugasPenugasan(pnIds, ["belum", "dikerjakan", "ditolak"]), lte(s.tugasKhususJadwal.tenggat, cakrawala))),
    daftarTugas(kondisiTugasPenugasan(pnIds, ["diajukan"])),
    daftarTugas(and(kondisiTugasPenugasan(pnIds, ["disetujui"]), bulanIni)),
    tugasAkanDatang(pnIds, cakrawala),
  ]);
  // Tugas berulang yang jadwal dekatnya sudah tampil di "Perlu dikerjakan" tidak diulang.
  const tugasAktif = new Set(aktif.map((t) => t.tugasId));
  const akanDatang = semuaAkanDatang.filter((x) => !tugasAktif.has(x.tugas.tugasId));
  const lanjutan = semuaAkanDatang.filter((x) => tugasAktif.has(x.tugas.tugasId)).reduce((a, x) => a + x.sisa + 1, 0);

  if (!aktif.length && !menunggu.length && !selesai.length && !akanDatang.length)
    return (
      <Kosong ikon={ClipboardList} judul="Belum ada tugas khusus">
        {sesi.amanah?.peranKerja === "SK" ? "Tugas dari atasan dan usulan Anda yang disetujui akan muncul di sini beserta tenggatnya." : "Tugas dari koordinator akan muncul di sini beserta tenggatnya."}
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
        {lanjutan > 0 && <p className="mt-3 text-xs text-muted-foreground">Tugas berulang di atas masih punya {lanjutan} jadwal lagi setelah sepekan ke depan.</p>}
      </section>
      {akanDatang.length > 0 && (
        <section className="lg:col-start-1">
          <JudulBagian>Akan datang</JudulBagian>
          <ul className="space-y-2">
            {akanDatang.map(({ tugas: t, sisa }) => (
              <li key={t.id}>
                <KartuTugas tugas={t} sebagai="staf" />
                {sisa > 0 && <p className="mt-1 px-1 text-xs text-muted-foreground">+{sisa} jadwal berikutnya</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
