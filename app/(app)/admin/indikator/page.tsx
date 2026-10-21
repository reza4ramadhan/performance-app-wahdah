import type { Metadata } from "next";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ubahIndikator } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { kelompokkan } from "@/lib/format";
import { indikatorDari } from "@/lib/ikp/katalog";
import { LABEL_PERAN_KERJA, type PeranKerja } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";

export const metadata: Metadata = { title: "Indikator" };

const SATUAN = { hari_kerja: "hari kerja", hari: "hari", jam: "jam" } as const;

export default function HalamanIndikator() {
  return (
    <>
      <Kepala
        judul="Katalog indikator"
        kembali="/tim"
        sub="Standar, tenggat, verifikator, dan status aktif bisa dikalibrasi tanpa rilis ulang. Bentuk form dan cara hitung ada di kode (lib/ikp/katalog.ts)."
      />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  await wajibPeran("admin");
  const db = await getDb();
  const rows = await db.select().from(s.indikator).orderBy(asc(s.indikator.kode));
  const perPeran = kelompokkan(rows, (r) => r.peranKerja);

  return (
    <div className="space-y-5">
      {[...perPeran].map(([peran, xs]) => (
        <section key={peran}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {peran} · {LABEL_PERAN_KERJA[peran as PeranKerja] ?? peran}
          </h2>
          <ul className="space-y-2">
            {xs.map((r) => {
              const def = indikatorDari(r.kode);
              return (
                <li key={r.kode}>
                  <details className="rounded-2xl border border-border/70 bg-card">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-heading">
                          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{r.kode}</span>
                          {r.nama}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          Standar {Math.round(r.standarCapaian * 100)}%
                          {r.tenggat !== null && def?.satuanTenggat && ` · tenggat ${r.tenggat} ${SATUAN[def.satuanTenggat]}`} · verifikator {r.verifikatorPeran}
                        </span>
                      </span>
                      {r.aktif ? <Lencana nada="mint">Aktif</Lencana> : <Lencana>Nonaktif</Lencana>}
                    </summary>
                    <div className="border-t border-border px-4 pb-4">
                      {def?.aturan && <p className="mt-3 text-sm text-muted-foreground">{def.aturan}</p>}
                      <FormAksi aksi={ubahIndikator.bind(null, r.kode)} tombol="Simpan" className="mt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-heading">Standar %</span>
                            <Input name="standar" type="number" min={1} max={100} defaultValue={Math.round(r.standarCapaian * 100)} required />
                            <Galat nama="standar" />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-heading">Tenggat{def?.satuanTenggat ? ` (${SATUAN[def.satuanTenggat]})` : ""}</span>
                            <Input name="tenggat" type="number" min={0} defaultValue={r.tenggat ?? ""} disabled={r.tipe !== "item"} />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-heading">Verifikator</span>
                            <select name="verifikator" className={kelasPilihan} defaultValue={r.verifikatorPeran}>
                              <option value="koordinator">Koordinator</option>
                              <option value="keuangan">Keuangan</option>
                              <option value="sekretariat">Sekretariat</option>
                            </select>
                          </label>
                        </div>
                        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                          <Checkbox name="aktif" defaultChecked={r.aktif} className="size-5" /> Aktif (dihitung dalam K1)
                        </label>
                      </FormAksi>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
