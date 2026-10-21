import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { CalendarX2 } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { akhiriPenugasan, tambahPenugasan, ubahKoordinator } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { kelompokkan } from "@/lib/format";
import { LABEL_PERAN_KERJA, PERAN_KERJA } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Penugasan" };

export default function HalamanPenugasan(props: PageProps<"/admin/penugasan">) {
  return (
    <>
      <Kepala judul="Penugasan" kembali="/tim" sub="Satu peran di satu unit, berlaku per periode. Koordinator = verifikator item dan penilai K3 penugasan itu. Bobot alokasi diisi bila ada keputusan tertulis (mis. 60/40)." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("admin");
  const kini = periodeDari(hariIni(sesi.kantor));
  const sp = await searchParams;
  const pilihan = [periodeBerikut(kini, -1), kini, periodeBerikut(kini, 1)];
  const periode = pilihan.includes(String(sp.periode)) ? String(sp.periode) : kini;
  const db = await getDb();
  const koord = alias(s.pegawai, "koord");
  const [rows, pegawai, unit] = await Promise.all([
    db
      .select({ pn: s.penugasan, nama: s.pegawai.nama, unit: s.unit.nama, koordinator: koord.nama })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
      .leftJoin(koord, eq(koord.id, s.penugasan.koordinatorId))
      .where(kondisiPenugasanBerlaku(periode))
      .orderBy(asc(s.unit.nama), asc(s.pegawai.nama)),
    db.select({ id: s.pegawai.id, nama: s.pegawai.nama }).from(s.pegawai).where(eq(s.pegawai.aktif, true)).orderBy(asc(s.pegawai.nama)),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).orderBy(asc(s.unit.nama)),
  ]);
  const perUnit = kelompokkan(rows, (r) => r.unit);
  const pilihPegawai = (nama: string, nilai?: string | null, kosong = "—") => (
    <select name={nama} className={kelasPilihan} defaultValue={nilai ?? ""}>
      <option value="">{kosong}</option>
      {pegawai.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nama}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <ChipFilter pilihan={pilihan.map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/admin/penugasan?periode=${v}`} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="order-2 space-y-4 lg:order-1">
          {[...perUnit].map(([u, xs]) => (
            <div key={u}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {u} · {xs.length}
              </h2>
              <ul className="space-y-2">
                {xs.map(({ pn, nama, koordinator }) => (
                  <li key={pn.id}>
                    <details className="rounded-2xl border border-border/70 bg-card">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-heading">{nama}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {LABEL_PERAN_KERJA[pn.peranKerja]} · koordinator {koordinator ?? "—"}
                          </span>
                        </span>
                        {pn.bobotAlokasi && <Lencana nada="brand">{pn.bobotAlokasi}%</Lencana>}
                        {!pn.koordinatorId && pn.peranKerja !== "KAKAN" && <Lencana nada="gold">Tanpa koordinator</Lencana>}
                      </summary>
                      <div className="space-y-3 border-t border-border px-4 pb-4">
                        <FormAksi aksi={ubahKoordinator.bind(null, pn.id)} tombol="Simpan" className="mt-3 grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-heading">Koordinator</span>
                            {pilihPegawai("koordinatorId", pn.koordinatorId)}
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-heading">Bobot %</span>
                            <Input name="bobotAlokasi" type="number" min={1} max={100} defaultValue={pn.bobotAlokasi ?? ""} />
                          </label>
                        </FormAksi>
                        <p className="text-xs text-muted-foreground">
                          Berlaku {labelPeriode(pn.periodeMulai)} – {pn.periodeSelesai ? labelPeriode(pn.periodeSelesai) : "sekarang"}
                        </p>
                        {!pn.periodeSelesai && (
                          <TombolAksi aksi={akhiriPenugasan.bind(null, pn.id, periode)} konfirmasi={`Akhiri penugasan ini setelah ${labelPeriode(periode)}?`} ukuran="sm">
                            <CalendarX2 className="size-4" /> Akhiri setelah {labelPeriode(periode)}
                          </TombolAksi>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
          <h2 className="text-[15px] font-semibold text-heading">Tambah penugasan</h2>
          <FormAksi aksi={tambahPenugasan} tombol="Tambah" tombolPenuh className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Pegawai</span>
              {pilihPegawai("pegawaiId", null, "Pilih pegawai…")}
              <Galat nama="pegawaiId" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Peran kerja</span>
                <select name="peranKerja" className={kelasPilihan} defaultValue="SBK">
                  {PERAN_KERJA.map((p) => (
                    <option key={p} value={p}>
                      {p} · {LABEL_PERAN_KERJA[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Unit</span>
                <select name="unitId" className={kelasPilihan} defaultValue="">
                  <option value="">Pilih…</option>
                  {unit.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
                <Galat nama="unitId" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Koordinator (verifikator & penilai K3)</span>
              {pilihPegawai("koordinatorId")}
              <Galat nama="koordinatorId" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Mulai</span>
                <Input name="periodeMulai" type="month" defaultValue={periode} required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Selesai</span>
                <Input name="periodeSelesai" type="month" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Bobot %</span>
                <Input name="bobotAlokasi" type="number" min={1} max={100} />
              </label>
            </div>
          </FormAksi>
        </Kartu>
      </div>
    </>
  );
}
