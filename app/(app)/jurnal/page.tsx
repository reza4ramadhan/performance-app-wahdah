import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NotebookPen } from "lucide-react";
import { BarisJurnalSaya, FormJurnalCepat } from "@/components/app/form-harian";
import { ChipFilter } from "@/components/app/filter";
import { JudulBagian, Kartu, Kepala, Kerangka, Kosong, TautanKecil } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { kelompokkan, rentangJam } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggalPanjang, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Jurnal" };

export default function HalamanJurnal(props: PageProps<"/jurnal">) {
  return (
    <>
      <Kepala judul="Jurnal kerja" sub="Pekerjaan di luar indikator (pengganti Catatan Tugas). Tidak masuk skor, tetapi terdata per bidang/SKUO." />
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
  const periode = /^\d{4}-\d{2}$/.test(String(sp.periode)) ? String(sp.periode) : kini;
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();
  const [entri, unit, minTanggal] = await Promise.all([
    db
      .select({ j: s.jurnal, unitNama: s.unit.nama })
      .from(s.jurnal)
      .leftJoin(s.unit, eq(s.unit.id, s.jurnal.unitId))
      .where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir)))
      .orderBy(desc(s.jurnal.tanggal), asc(s.jurnal.jamMulai), asc(s.jurnal.dibuatPada)),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.jenis, ["bidang", "skuo", "unit_pendukung"])).orderBy(s.unit.nama),
    tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
  ]);
  const perHari = kelompokkan(entri, (e) => e.j.tanggal);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="order-2 lg:order-1">
        <ChipFilter
          pilihan={[periodeBerikut(kini, -2), periodeBerikut(kini, -1), kini].map((p) => ({ nilai: p, label: labelPeriode(p) }))}
          aktif={periode}
          href={(p) => `/jurnal?periode=${p}`}
        />
        {perHari.size ? (
          <div className="space-y-4">
            {[...perHari].map(([tgl, xs]) => (
              <section key={tgl}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelTanggalPanjang(tgl)}</h2>
                <ul className="space-y-2">
                  {xs.map(({ j, unitNama }) => {
                    const isi = (
                      <>
                        {rentangJam(j.jamMulai, j.jamSelesai) && <p className="text-xs font-semibold tabular-nums text-primary">{rentangJam(j.jamMulai, j.jamSelesai)}</p>}
                        <p className="text-[15px] text-heading">{j.uraian}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[unitNama, j.pemberiTugas && `dari ${j.pemberiTugas}`].filter(Boolean).join(" · ") || "—"}
                          {j.link && (
                            <>
                              {" · "}
                              <a href={j.link} target="_blank" rel="noopener noreferrer" className="text-primary">
                                link
                              </a>
                            </>
                          )}
                        </p>
                      </>
                    );
                    return (
                      <li key={j.id} className="rounded-2xl border border-border/70 bg-card p-3.5">
                        {tgl >= minTanggal ? (
                          <BarisJurnalSaya jurnal={j} tanggal={tgl} unit={unit} minTanggal={minTanggal} maksTanggal={today}>
                            {isi}
                          </BarisJurnalSaya>
                        ) : (
                          isi
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <Kosong ikon={NotebookPen} judul="Belum ada jurnal">
            Tulis pekerjaan yang diminta di luar indikator, mis. membantu kepanitiaan atau mendampingi tamu.
          </Kosong>
        )}
      </div>
      {periode === kini && (
        <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
          <JudulBagian aksi={<TautanKecil href="/jurnal/sekaligus">Isi sekaligus</TautanKecil>}>Tambah jurnal</JudulBagian>
          <FormJurnalCepat tanggal={today} unit={unit} minTanggal={minTanggal} />
        </Kartu>
      )}
    </div>
  );
}
