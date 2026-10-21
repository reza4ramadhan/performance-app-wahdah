import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { simpanUnit } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";

export const metadata: Metadata = { title: "Unit" };

const JENIS = { kantor: "Kantor", bidang: "Bidang kerja", skuo: "SKUO", unit_pendukung: "Unit pendukung", staf_khusus: "Staf khusus" } as const;

export default function HalamanUnit() {
  return (
    <>
      <Kepala judul="Unit" kembali="/tim" sub="13 kelompok bidang, SKUO, unit pendukung, dan staf khusus. WaKa per unit menentukan penilai K3 KSBK dan rute kalibrasi (Bagian 13.7)." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  await wajibPeran("admin");
  const db = await getDb();
  const [unit, waka] = await Promise.all([
    db.select().from(s.unit).orderBy(asc(s.unit.jenis), asc(s.unit.nama)),
    db.select({ id: s.pegawai.id, nama: s.pegawai.nama }).from(s.peranSistem).innerJoin(s.pegawai, eq(s.pegawai.id, s.peranSistem.pegawaiId)).where(eq(s.peranSistem.peran, "waka")),
  ]);
  const nama = new Map(unit.map((u) => [u.id, u.nama]));
  const namaWaka = new Map(waka.map((w) => [w.id, w.nama]));

  const formUnit = (u?: (typeof unit)[number]) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">Jenis</span>
          <select name="jenis" className={kelasPilihan} defaultValue={u?.jenis ?? "bidang"}>
            {Object.entries(JENIS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">Induk</span>
          <select name="indukId" className={kelasPilihan} defaultValue={u?.indukId ?? ""}>
            <option value="">—</option>
            {unit.filter((x) => x.id !== u?.id).map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Nama</span>
        <Input name="nama" defaultValue={u?.nama} required />
        <Galat nama="nama" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">WaKa yang membawahi</span>
        <select name="wakaId" className={kelasPilihan} defaultValue={u?.wakaId ?? ""}>
          <option value="">Belum ditetapkan</option>
          {waka.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nama}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="order-2 space-y-2 lg:order-1">
        {unit.map((u) => (
          <details key={u.id} className="rounded-2xl border border-border/70 bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-heading">{u.nama}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {JENIS[u.jenis]}
                  {u.indukId && ` · di bawah ${nama.get(u.indukId)}`}
                </span>
              </span>
              {u.wakaId ? <Lencana nada="brand">{namaWaka.get(u.wakaId) ?? "WaKa"}</Lencana> : u.jenis !== "skuo" && u.jenis !== "kantor" ? <Lencana nada="gold">WaKa belum</Lencana> : null}
            </summary>
            <div className="border-t border-border px-4 pb-4">
              <FormAksi aksi={simpanUnit.bind(null, u.id)} tombol="Simpan" className="mt-3 space-y-3">
                {formUnit(u)}
              </FormAksi>
            </div>
          </details>
        ))}
      </section>
      <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
        <h2 className="text-[15px] font-semibold text-heading">Tambah unit</h2>
        <FormAksi aksi={simpanUnit.bind(null, null)} tombol="Tambah" tombolPenuh className="mt-3 space-y-3">
          {formUnit()}
        </FormAksi>
      </Kartu>
    </div>
  );
}
