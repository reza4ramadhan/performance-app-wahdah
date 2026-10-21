import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { FormK3 } from "@/components/app/form-k3";
import { Avatar, Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { bolehNilaiK3 } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { LABEL_NILAI_K3, LABEL_PERAN_KERJA, type NilaiK3 } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggal, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Nilai K3" };

export default function HalamanNilaiK3(props: PageProps<"/tim/k3/[penugasanId]">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Isi({ params, searchParams }: { params: Promise<{ penugasanId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { penugasanId } = await params;
  const sp = await searchParams;
  const sesi = await wajibSesi();
  const db = await getDb();
  const [row] = await db
    .select({ pn: s.penugasan, nama: s.pegawai.nama, unitNama: s.unit.nama })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(eq(s.penugasan.id, penugasanId));
  if (!row || !bolehNilaiK3(sesi, row.pn).boleh) notFound();

  const kini = periodeDari(hariIni(sesi.kantor));
  const periode = sp.periode === kini ? kini : periodeBerikut(kini, -1);
  const { awal, akhir } = rentangPeriode(periode);
  const [[nilai], [log], catatan, [per]] = await Promise.all([
    db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periode), eq(s.penilaianK3.penugasanId, penugasanId), eq(s.penilaianK3.penilaiId, sesi.pegawaiId))),
    db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, row.pn.pegawaiId), gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir))),
    db
      .select()
      .from(s.catatanPerilaku)
      .where(and(eq(s.catatanPerilaku.pegawaiId, row.pn.pegawaiId), eq(s.catatanPerilaku.penilaiId, sesi.pegawaiId), gte(s.catatanPerilaku.tanggal, awal), lte(s.catatanPerilaku.tanggal, akhir)))
      .orderBy(desc(s.catatanPerilaku.tanggal)),
    db.select({ status: s.periode.status }).from(s.periode).where(eq(s.periode.id, periode)),
  ]);
  const terkunci = per?.status === "sementara" || per?.status === "disahkan";

  return (
    <>
      <Kepala judul={`K3 · ${labelPeriode(periode)}`} kembali={`/tim/k3?periode=${periode}`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-3">
          <Kartu className="flex items-center gap-3">
            <Avatar nama={row.nama} ukuran="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-heading">{row.nama}</p>
              <p className="truncate text-sm text-muted-foreground">
                {LABEL_PERAN_KERJA[row.pn.peranKerja]} · {row.unitNama}
              </p>
            </div>
            {nilai?.status === "dikirim" && <Lencana nada="mint">Terkirim</Lencana>}
            {nilai?.status === "dikembalikan" && <Lencana nada="flame">Dikembalikan</Lencana>}
          </Kartu>
          {nilai?.status === "dikembalikan" && nilai.catatanKalibrasi && (
            <p className="rounded-2xl bg-flame-500/10 px-4 py-3 text-sm text-flame-700 dark:text-flame-100">
              <strong>Catatan kalibrasi:</strong> {nilai.catatanKalibrasi}
            </p>
          )}
          <FormK3 penugasanId={penugasanId} periodeId={periode} awal={nilai ? { skor: nilai.skor, contoh: nilai.contoh } : undefined} adaLog={log.n > 0} terkunci={terkunci} />
        </div>
        <Kartu>
          <h2 className="mb-2 text-[15px] font-semibold text-heading">Catatan perilaku bulan ini</h2>
          {catatan.length ? (
            <ul className="space-y-2.5 text-sm">
              {catatan.map((c) => (
                <li key={c.id}>
                  <p className="text-xs text-muted-foreground">
                    {labelTanggal(c.tanggal)}
                    {c.nilaiK3 && ` · ${LABEL_NILAI_K3[c.nilaiK3 as NilaiK3]}`}
                  </p>
                  <p>{c.catatan}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada catatan. Tambahkan di Catatan perilaku agar penilaian berdasar.</p>
          )}
        </Kartu>
      </div>
    </>
  );
}
