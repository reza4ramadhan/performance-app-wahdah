import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NotebookPen } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { kelasPilihan } from "@/components/app/kolom";
import { Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { anggotaTim } from "@/lib/data/tim";
import { kelompokkan } from "@/lib/format";
import { PARAMETER } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggalPanjang, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Jurnal staf" };

export default function HalamanJurnalStaf(props: PageProps<"/tim/jurnal">) {
  return (
    <>
      <Kepala judul="Jurnal staf" sub={`Pekerjaan di luar indikator. Tidak diverifikasi; tiap entri menambah ${PARAMETER.tambahan.poin} poin K1 staf (maks. ${PARAMETER.tambahan.maks}).`} />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const periode = /^\d{4}-\d{2}$/.test(String(sp.periode)) && String(sp.periode) <= kini ? String(sp.periode) : kini;
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();

  // Koordinator melihat anggota timnya; pimpinan, Sekretariat, dan Admin melihat semua pegawai.
  const daftar = pimpinan(sesi)
    ? await db.select({ id: s.pegawai.id, nama: s.pegawai.nama }).from(s.pegawai).where(eq(s.pegawai.aktif, true)).orderBy(asc(s.pegawai.nama))
    : (await anggotaTim(sesi.pegawaiId, sesi.kantor)).map((t) => ({ id: t.pegawaiId, nama: t.nama })).filter((t) => t.id !== sesi.pegawaiId);
  if (!daftar.length) return <Kosong ikon={NotebookPen} judul="Tidak ada staf di bawah Anda" />;
  const dipilih = daftar.find((p) => p.id === sp.pegawai);
  const ids = dipilih ? [dipilih.id] : daftar.map((p) => p.id);

  const entri = await db
    .select({ j: s.jurnal, nama: s.pegawai.nama, unitNama: s.unit.nama })
    .from(s.jurnal)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.jurnal.pegawaiId))
    .leftJoin(s.unit, eq(s.unit.id, s.jurnal.unitId))
    .where(and(inArray(s.jurnal.pegawaiId, ids), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir)))
    .orderBy(desc(s.jurnal.tanggal), desc(s.jurnal.dibuatPada))
    .limit(500);
  const perHari = kelompokkan(entri, (e) => e.j.tanggal);
  const perPegawai = kelompokkan(entri, (e) => e.nama);
  const q = (o: Record<string, string>) => `/tim/jurnal?${new URLSearchParams({ ...(dipilih ? { pegawai: dipilih.id } : {}), periode, ...o })}`;

  return (
    <>
      <ChipFilter pilihan={[periodeBerikut(kini, -2), periodeBerikut(kini, -1), kini].map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(p) => q({ periode: p })} />
      <Form action="/tim/jurnal" className="mb-4 flex gap-2">
        <input type="hidden" name="periode" value={periode} />
        <select name="pegawai" defaultValue={dipilih?.id ?? ""} className={kelasPilihan} aria-label="Pegawai">
          <option value="">Semua ({daftar.length} pegawai)</option>
          {daftar.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="h-11">
          Tampilkan
        </Button>
      </Form>

      {entri.length ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {entri.length} entri dari {perPegawai.size} pegawai
            {!dipilih && perPegawai.size > 1 && (
              <span className="mt-2 flex flex-wrap gap-1.5">
                {[...perPegawai].map(([nama, xs]) => (
                  <Lencana key={nama}>
                    {nama} · {xs.length}
                  </Lencana>
                ))}
              </span>
            )}
          </p>
          <div className="space-y-4">
            {[...perHari].map(([tgl, xs]) => (
              <section key={tgl}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelTanggalPanjang(tgl)}</h2>
                <ul className="space-y-2">
                  {xs.map(({ j, nama, unitNama }) => (
                    <li key={j.id} className="rounded-2xl border border-border/70 bg-card p-3.5">
                      <p className="text-[15px] text-heading">{j.uraian}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[dipilih ? null : nama, unitNama, j.pemberiTugas && `dari ${j.pemberiTugas}`].filter(Boolean).join(" · ")}
                        {j.link && (
                          <>
                            {" · "}
                            <a href={j.link} target="_blank" rel="noopener noreferrer" className="text-primary">
                              link
                            </a>
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : (
        <Kosong ikon={NotebookPen} judul={`Belum ada jurnal ${labelPeriode(periode)}`} />
      )}
    </>
  );
}
