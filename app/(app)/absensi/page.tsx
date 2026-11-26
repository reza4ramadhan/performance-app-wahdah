import type { Metadata } from "next";
import { Suspense } from "react";
import { and, count, eq, gte, lte } from "drizzle-orm";
import { ChipFilter } from "@/components/app/filter";
import { FormAksi } from "@/components/app/form-aksi";
import { UnggahAbsensi } from "@/components/app/unggah-absensi";
import { simpanAbsensiHari } from "@/app/aksi/absensi";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Unggah absensi" };

export default function HalamanAbsensi(props: PageProps<"/absensi">) {
  return (
    <>
      <Kepala judul="Rekap absensi (K2)" sub="Unggah paling lambat tanggal 5 bulan berikutnya. Satu templat untuk Makassar dan Jakarta." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("personalia", "admin");
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const pilihan = [periodeBerikut(kini, -1), kini];
  const periode = pilihan.includes(String(sp.periode)) ? String(sp.periode) : pilihan[0];
  const db = await getDb();
  const { awal, akhir } = rentangPeriode(periode);
  const [[ada], [aktif], [hari]] = await Promise.all([
    db.select({ n: count() }).from(s.absensi).where(eq(s.absensi.periodeId, periode)),
    db.select({ n: count() }).from(s.pegawai).where(eq(s.pegawai.aktif, true)),
    db.select({ n: count() }).from(s.absensiHari).where(and(gte(s.absensiHari.tanggal, awal), lte(s.absensiHari.tanggal, akhir))),
  ]);

  return (
    <>
      <ChipFilter pilihan={pilihan.map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/absensi?periode=${v}`} />
      <Kartu className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Sudah tersimpan untuk {labelPeriode(periode)}</span>
        <Lencana nada={ada.n >= aktif.n ? "mint" : "gold"}>
          {ada.n}/{aktif.n} pegawai
        </Lencana>
      </Kartu>
      <UnggahAbsensi periode={periode} />
      <p className="mt-4 text-xs text-muted-foreground">
        Rumus K2 = 0,6 × (hadir ÷ hari kerja wajib) + 0,4 × (hadir tepat waktu ÷ hadir). Kehadiran &lt; 85% atau sanksi disiplin berat ditandai “tidak memenuhi syarat insentif”.
      </p>

      <Kartu className="mt-6 space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-heading">Izin, sakit, cuti per hari</h2>
          <p className="text-sm text-muted-foreground">
            Kolom <code>nip</code> (atau <code>no_hp</code>), <code>tanggal</code> (YYYY-MM-DD), <code>jenis</code> (izin/sakit/cuti). Tugas rutin pada tanggal itu dikeluarkan dari target K1. Sudah tercatat {labelPeriode(periode)}: {hari.n} hari.
          </p>
        </div>
        <FormAksi aksi={simpanAbsensiHari} tombol="Unggah" className="space-y-3">
          <input type="file" name="berkas" accept=".csv,.xlsx" required className="block w-full text-sm" />
        </FormAksi>
      </Kartu>
    </>
  );
}
