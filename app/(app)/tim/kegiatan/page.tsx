import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { CalendarDays, Copy, Trash2 } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { hapusKegiatan, salinKegiatanBulanLalu, simpanKegiatan } from "@/app/aksi/tim";
import { getDb, schema as s } from "@/lib/db";
import { stafBidang } from "@/lib/data/tim";
import { unitDalamBidang } from "@/lib/data/unit";
import { kelompokkan } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggalPanjang, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Kegiatan bulanan" };

export default function HalamanKegiatan(props: PageProps<"/tim/kegiatan">) {
  return (
    <>
      <Kepala
        judul="Kegiatan bulanan"
        kembali="/tim"
        sub="Input paling lambat tanggal 5 (KSBK-1c). Setiap kegiatan langsung masuk ke dashboard penanggung jawab: pengingat H-6 & H-2, serta SPP & SPB bila dicentang."
      />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const db = await getDb();
  const unitSaya = sesi.peran.has("admin")
    ? await db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(eq(s.unit.jenis, "bidang"))
    : sesi.penugasan.filter((p) => p.peranKerja === "KSBK").map((p) => ({ id: p.unitId, nama: p.unitNama }));
  if (!unitSaya.length) return <Kosong ikon={CalendarDays} judul="Khusus KSBK">Halaman ini untuk koordinator bidang.</Kosong>;

  const kini = periodeDari(hariIni(sesi.kantor));
  const unit = unitSaya.find((u) => u.id === sp.unit) ?? unitSaya[0];
  const periode = sp.periode === periodeBerikut(kini, 1) ? periodeBerikut(kini, 1) : kini;
  const { awal, akhir } = rentangPeriode(periode);

  const [kegiatan, skuo, staf] = await Promise.all([
    db
      .select({ k: s.kegiatan, pj: s.pegawai.nama })
      .from(s.kegiatan)
      .leftJoin(s.pegawai, eq(s.pegawai.id, s.kegiatan.penanggungJawabId))
      .where(and(eq(s.kegiatan.unitId, unit.id), gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, akhir)))
      .orderBy(asc(s.kegiatan.tanggal)),
    unitDalamBidang(db, unit.id).then((ids) =>
      db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(and(eq(s.unit.jenis, "skuo"), inArray(s.unit.id, ids))).orderBy(s.unit.nama),
    ),
    stafBidang(db, unit.id, periode),
  ]);
  const perTanggal = kelompokkan(kegiatan, (x) => x.k.tanggal);

  return (
    <>
      {unitSaya.length > 1 && <ChipFilter pilihan={unitSaya.map((u) => ({ nilai: u.id, label: u.nama }))} aktif={unit.id} href={(v) => `/tim/kegiatan?unit=${v}&periode=${periode}`} />}
      <ChipFilter
        pilihan={[kini, periodeBerikut(kini, 1)].map((p) => ({ nilai: p, label: labelPeriode(p) }))}
        aktif={periode}
        href={(v) => `/tim/kegiatan?unit=${unit.id}&periode=${v}`}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="order-2 space-y-4 lg:order-1">
          {kegiatan.length ? (
            [...perTanggal].map(([tgl, xs]) => (
              <div key={tgl}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelTanggalPanjang(tgl)}</h2>
                <ul className="space-y-2">
                  {xs.map(({ k, pj }) => (
                    <li key={k.id} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-heading">{k.nama}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {k.perluSpp && k.perluSpb ? (
                            <Lencana nada="brand">SPP & SPB</Lencana>
                          ) : (
                            <>
                              {k.perluSpp && <Lencana nada="brand">SPP</Lencana>}
                              {k.perluSpb && <Lencana nada="brand">SPB</Lencana>}
                            </>
                          )}
                          {pj && <Lencana>PJ: {pj}</Lencana>}
                          {k.sumber === "salin" && <Lencana nada="gold">Disalin</Lencana>}
                        </div>
                      </div>
                      <TombolAksi aksi={hapusKegiatan.bind(null, k.id)} konfirmasi="Hapus kegiatan ini?" varian="ghost" ukuran="icon" label="Hapus kegiatan">
                        <Trash2 className="size-4" />
                      </TombolAksi>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <Kosong ikon={CalendarDays} judul={`Belum ada kegiatan ${labelPeriode(periode)}`}>
              Tambahkan dari PKA/SIMAKPRO, atau salin dari bulan lalu.
            </Kosong>
          )}
          {periode === kini && (
            <TombolAksi aksi={salinKegiatanBulanLalu.bind(null, unit.id)} konfirmasi="Salin semua kegiatan bulan lalu ke bulan ini?" className="w-full">
              <Copy className="size-4" /> Salin dari bulan lalu
            </TombolAksi>
          )}
        </section>

        <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
          <h2 className="text-[15px] font-semibold text-heading">Tambah kegiatan · {unit.nama}</h2>
          <FormAksi aksi={simpanKegiatan} tombol="Simpan kegiatan" tombolPenuh className="mt-3 space-y-3">
            <input type="hidden" name="unitId" value={unit.id} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Nama kegiatan</span>
              <Input name="nama" required placeholder="mis. Daurah Dai Wilayah" />
              <Galat nama="nama" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Tanggal</span>
                <Input name="tanggal" type="date" required min={awal} max={akhir} defaultValue={periode === kini ? hariIni(sesi.kantor) : awal} />
                <Galat nama="tanggal" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">SKUO</span>
                <select name="skuoId" className={kelasPilihan} defaultValue={skuo.length === 1 ? skuo[0].id : ""} required>
                  <option value="">Pilih SKUO…</option>
                  {skuo.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
                <Galat nama="skuoId" />
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <Checkbox name="perluSppSpb" className="size-5" /> Butuh SPP & SPB
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Penanggung jawab (staf)</span>
              <select name="penanggungJawabId" className={kelasPilihan} defaultValue={staf.length === 1 ? staf[0].id : ""} required>
                <option value="">Pilih staf…</option>
                {staf.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.skuo.length ? `${p.nama} · ${p.skuo.join(", ")}` : p.nama}
                  </option>
                ))}
              </select>
              <Galat nama="penanggungJawabId" />
              <span className="mt-1 block text-xs text-muted-foreground">Boleh staf SKUO lain di bidang ini sebagai backup; penanggung jawab yang dinilai.</span>
            </label>
          </FormAksi>
        </Kartu>
      </div>
    </>
  );
}
