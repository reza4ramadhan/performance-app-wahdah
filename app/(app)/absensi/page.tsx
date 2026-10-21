import type { Metadata } from "next";
import { Suspense } from "react";
import { count, eq } from "drizzle-orm";
import { ChipFilter } from "@/components/app/filter";
import { UnggahAbsensi } from "@/components/app/unggah-absensi";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

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
  const sesi = await wajibPeran("personalia");
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const pilihan = [periodeBerikut(kini, -1), kini];
  const periode = pilihan.includes(String(sp.periode)) ? String(sp.periode) : pilihan[0];
  const db = await getDb();
  const [[ada], [aktif]] = await Promise.all([
    db.select({ n: count() }).from(s.absensi).where(eq(s.absensi.periodeId, periode)),
    db.select({ n: count() }).from(s.pegawai).where(eq(s.pegawai.aktif, true)),
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
    </>
  );
}
