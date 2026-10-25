import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { CalendarCheck2, ChartColumn, FileText, Star, UserRoundCheck } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { DaftarIndikator } from "@/components/app/rincian-ikp";
import { Cincin, JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana, LencanaPredikat, PetakIkon } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { hasilPeriode, liburPerKantor } from "@/lib/data/ikp";
import { idPenugasan, unitPenugasan } from "@/lib/ikp/hitung";
import { angka } from "@/lib/format";
import { LABEL_PERAN_KERJA, LABEL_STATUS_PERIODE } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, hariKerjaPeriode, labelPeriode, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Progres" };

export default function HalamanProgres(props: PageProps<"/progres">) {
  return (
    <>
      <Kepala judul="Progres" sub="Skor K1 berjalan dihitung langsung dari item Anda. K2, K3, dan K4 masuk setelah akhir bulan." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  const kini = periodeDari(today);
  const sp = await searchParams;
  const periode = /^\d{4}-\d{2}$/.test(String(sp.periode)) && String(sp.periode) <= kini ? String(sp.periode) : kini;
  const db = await getDb();
  const { awal, akhir } = rentangPeriode(periode);

  const [{ hasil, status, snapshot }, libur, unit, riwayat, hariItem, hariJurnal] = await Promise.all([
    hasilPeriode(periode),
    liburPerKantor(db),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit),
    db.select().from(s.hasilIkp).where(eq(s.hasilIkp.pegawaiId, sesi.pegawaiId)).orderBy(desc(s.hasilIkp.periodeId)).limit(12),
    db
      .selectDistinct({ d: sql<string>`(${s.item.dibuatPada} at time zone ${sesi.kantor === "makassar" ? "Asia/Makassar" : "Asia/Jakarta"})::date::text` })
      .from(s.item)
      .where(and(inArray(s.item.penugasanId, sesi.penugasan.map((p) => p.id).concat("-")), eq(s.item.periodeId, periode))),
    db.selectDistinct({ d: s.jurnal.tanggal }).from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir))),
  ]);
  const saya = hasil.find((h) => h.pegawaiId === sesi.pegawaiId);
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const hk = hariKerjaPeriode(periode, libur(sesi.kantor), today);
  const terisi = new Set([...hariItem.map((x) => x.d), ...hariJurnal.map((x) => x.d)].filter((d) => hk.includes(d)));

  const pilihan = [periodeBerikut(kini, -2), periodeBerikut(kini, -1), kini].map((p) => ({ nilai: p, label: labelPeriode(p) }));

  return (
    <>
      <ChipFilter pilihan={pilihan} aktif={periode} href={(p) => `/progres?periode=${p}`} />
      {!saya ? (
        <Kosong ikon={ChartColumn} judul="Belum ada data untuk periode ini" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            <Kartu className="flex items-center gap-4 p-5">
              <Cincin nilai={saya.kategori === "umum" ? saya.k1 : saya.ikpAkhir} ukuran={96} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {labelPeriode(periode)} · {LABEL_STATUS_PERIODE[status]}
                </p>
                <p className="text-lg font-bold text-heading">{saya.kategori === "umum" ? `K1 berjalan ${angka(saya.k1)}` : `IKP ${angka(saya.ikp)}`}</p>
                <p className="text-sm text-muted-foreground">
                  {saya.kategori === "pimpinan"
                    ? "Pimpinan dinilai dari K2 saja selama uji coba."
                    : saya.kategori === "kepala_unit"
                      ? "K1 Kepala Unit Pendukung ditunda; IKP = 50% K2 + 50% K3."
                      : snapshot
                        ? "Angka dari hasil yang sudah dikunci."
                        : "Item yang belum diverifikasi belum dihitung sebagai realisasi."}
                </p>
              </div>
            </Kartu>

            {saya.penugasan
              .filter((p) => p.indikator.length)
              // K1 tiap amanah berdiri sendiri (rangkap di bidang yang sama = satu K1 gabungan); amanah aktif di atas.
              .map((p) => ({ ...p, aktif: idPenugasan(p).includes(sesi.amanah?.id ?? "") }))
              .sort((a, b) => Number(b.aktif) - Number(a.aktif))
              .map((p) => (
                <Kartu key={p.penugasanId}>
                  <JudulBagian aksi={<span className="text-sm font-bold tabular-nums text-heading">K1 {angka(p.k1)}</span>}>
                    {LABEL_PERAN_KERJA[p.peran]} · {unitPenugasan(p).map((u) => namaUnit.get(u)).join(", ")}
                    {p.bobotAlokasi ? <span className="ml-2 align-middle"><Lencana nada="brand">bobot {p.bobotAlokasi}%</Lencana></span> : null}
                    {saya.penugasan.length > 1 && p.aktif ? <span className="ml-2 align-middle"><Lencana nada="mint">amanah aktif</Lencana></span> : null}
                  </JudulBagian>
                  <DaftarIndikator indikator={p.indikator} />
                  {!!p.tambahan && p.pokok != null && (
                    <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      Rata-rata indikator pokok {angka(p.pokok)} + poin tambahan {angka(p.tambahan)} = K1 {angka(p.k1)} (maks. 100)
                    </p>
                  )}
                </Kartu>
              ))}
          </div>

          <aside className="space-y-4">
            {periode === kini && (
              <Kartu className="flex items-center gap-3">
                <PetakIkon ikon={CalendarCheck2} nada="mint" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Hari terisi bulan ini</p>
                  <p className="text-lg font-bold text-heading">
                    {terisi.size} dari {hk.length} hari kerja
                  </p>
                </div>
              </Kartu>
            )}
            <Kartu>
              <JudulBagian>Komponen lain</JudulBagian>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <PetakIkon ikon={UserRoundCheck} nada="brand" />
                  <span className="flex-1">
                    K2 kehadiran
                    <span className="block text-xs text-muted-foreground">{saya.k2 === null ? "Menunggu unggahan Personalia" : `Hadir ${angka(saya.kehadiran)}% · tepat waktu ${angka(saya.ketepatan)}%`}</span>
                  </span>
                  <strong className="tabular-nums">{angka(saya.k2)}</strong>
                </li>
                {saya.kategori !== "pimpinan" && (
                  <li className="flex items-center gap-3">
                    <PetakIkon ikon={Star} nada="gold" />
                    <span className="flex-1">
                      K3 perilaku
                      <span className="block text-xs text-muted-foreground">{saya.k3 === null ? "Dinilai koordinator di akhir bulan" : "Rata-rata dari setiap penilai (satu penilai dihitung sekali)"}</span>
                    </span>
                    <strong className="tabular-nums">{angka(saya.k3)}</strong>
                  </li>
                )}
                {saya.kategori !== "pimpinan" && (
                  <li className="flex items-center gap-3">
                    <PetakIkon ikon={FileText} nada="ink" />
                    <span className="flex-1">
                      K4 inovasi
                      <span className="block text-xs text-muted-foreground">
                        <Link href="/k4" className="text-primary">
                          Ajukan inovasi
                        </Link>
                      </span>
                    </span>
                    <strong className="tabular-nums">{angka(saya.k4)}</strong>
                  </li>
                )}
              </ul>
              {saya.ikpAkhir !== null && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
                  <span className="text-sm font-medium">IKP Akhir {angka(saya.ikpAkhir)}</span>
                  <LencanaPredikat predikat={saya.predikat} />
                </div>
              )}
              {!saya.syaratMinimum.memenuhi && <p className="mt-2 text-xs font-medium text-flame-600">Tidak memenuhi syarat insentif: {saya.syaratMinimum.alasan.join(", ")}</p>}
            </Kartu>

            <Kartu>
              <JudulBagian>Riwayat IKP</JudulBagian>
              {riwayat.length ? (
                <ul className="divide-y divide-border text-sm">
                  {riwayat.map((r) => (
                    <li key={r.periodeId} className="flex items-center justify-between gap-2 py-2.5">
                      <Link href={`/rapor/${r.periodeId}/${sesi.pegawaiId}`} className="font-medium text-heading hover:underline">
                        {labelPeriode(r.periodeId)}
                        {r.versi === "sementara" && <span className="ml-1 text-xs font-normal text-muted-foreground">(sementara)</span>}
                      </Link>
                      <span className="flex items-center gap-2">
                        <strong className="tabular-nums">{angka(r.ikpAkhir)}</strong>
                        <LencanaPredikat predikat={r.predikat as never} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada IKP yang dikunci.</p>
              )}
            </Kartu>
          </aside>
        </div>
      )}
    </>
  );
}
