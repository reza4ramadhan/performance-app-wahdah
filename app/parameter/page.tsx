import { Suspense } from "react";
import { JudulHalaman, Kartu, Lencana, Memuat, labelPeriode, td, th, kepalaTabel, badanTabel } from "../components/ui";
import { getDb } from "@/lib/data/store";
import { rupiah } from "@/lib/format";

export default function Halaman() {
  return (
    <>
      <JudulHalaman judul="Parameter dan katalog indikator" sub="Berversi per periode. Revisi pedoman tidak mengubah IKP bulan yang sudah disahkan." />
      <Suspense fallback={<Memuat />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const db = await getDb();
  return (
    <>
      {db.parameter.map((p) => (
        <Kartu key={p.versi} judul={`Versi ${p.versi}`} className="mb-4">
          <p className="mb-3 text-xs text-zinc-500">
            Dipakai periode: {db.periode.filter((x) => x.parameterVersi === p.versi).map((x) => labelPeriode(x.id)).join(", ") || "—"}
          </p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Bobot K1 / K2 / K3", `${p.bobot.k1 * 100}% / ${p.bobot.k2 * 100}% / ${p.bobot.k3 * 100}%`],
              ["Bobot dalam K2 (hadir / tepat)", `${p.bobotK2.hadir * 100}% / ${p.bobotK2.tepat * 100}%`],
              ["Batas K4", `0–${p.k4Maks} poin`],
              ["Batas skor indikator", String(p.batasSkorIndikator)],
              ["Ambang kehadiran syarat insentif", `${p.ambangKehadiran}%`],
              ["Plafon tunjangan", rupiah(p.plafonTunjangan)],
              ["Ambang IKP minimum", p.ambangIkpMinimum === null ? "Belum diputuskan" : String(p.ambangIkpMinimum)],
              ["Pita predikat", p.predikat.map((b) => `${b.label} ≥ ${b.min}`).join("; ")],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-wi-50 py-2 dark:border-wi-900">
                <dt className="text-zinc-600 dark:text-zinc-400">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Kartu>
      ))}

      <Kartu judul="Katalog indikator K1">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-175 text-sm">
            <thead className={kepalaTabel}>
              <tr>
                <th className={th}>Kode</th>
                <th className={th}>Peran</th>
                <th className={th}>Indikator</th>
                <th className={th}>Target</th>
                <th className={th}>Sumber data</th>
                <th className={th}>Fase</th>
              </tr>
            </thead>
            <tbody className={badanTabel}>
              {db.indikator.map((i) => (
                <tr key={i.kode} className={i.fase === 2 ? "text-zinc-400" : ""}>
                  <td className={`${td} font-mono text-xs`}>{i.kode}</td>
                  <td className={td}>{i.peran}</td>
                  <td className={td}>
                    {i.nama}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {i.turunan && <Lencana>Otomatis</Lencana>}
                      {i.subTugas && <Lencana>{i.subTugas.length} sub-tugas</Lencana>}
                      {i.penyebutKecil && <Lencana nada="kuning">Penyebut kecil</Lencana>}
                      {i.verifikasiKeuangan && <Lencana>Verifikasi Keuangan</Lencana>}
                    </div>
                  </td>
                  <td className={td}>{i.target}%</td>
                  <td className={td}>{i.sumberData}</td>
                  <td className={td}>{i.fase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>
    </>
  );
}
