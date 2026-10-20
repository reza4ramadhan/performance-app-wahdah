import type { Metadata } from "next";
import { Suspense } from "react";
import { Kerangka, KepalaHalaman, Lencana, LencanaPredikat, Panel, tabel } from "../components/ui";
import { getDb } from "@/lib/data/store";
import { labelPeriode, rupiah } from "@/lib/format";
import { LABEL_PERAN, type Peran } from "@/lib/kpi/types";

export const metadata: Metadata = { title: "Parameter" };

export default function Halaman() {
  return (
    <>
      <KepalaHalaman
        judul="Parameter & katalog"
        sub="Disimpan berversi. Setiap periode mengunci versinya saat dibuka, sehingga revisi pedoman tidak mengubah IKP bulan yang sudah disahkan."
      />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const db = await getDb();
  const peran: Peran[] = ["SBK", "KSBK", "KU", "SK"];

  return (
    <div className="space-y-6">
      {db.parameter.map((p) => {
        const dipakai = db.periode.filter((x) => x.parameterVersi === p.versi).map((x) => labelPeriode(x.id));
        const butir: [string, React.ReactNode][] = [
          ["Bobot K1 / K2 / K3", `${p.bobot.k1 * 100}% / ${p.bobot.k2 * 100}% / ${p.bobot.k3 * 100}%`],
          ["Dalam K2: hadir / tepat waktu", `${p.bobotK2.hadir * 100}% / ${p.bobotK2.tepat * 100}%`],
          ["K4 Inovasi Plus", `0–${p.k4Maks} poin per bulan`],
          ["Batas skor indikator", p.batasSkorIndikator],
          ["Ambang kehadiran syarat insentif", `${p.ambangKehadiran}%`],
          ["Plafon tunjangan", `${rupiah(p.plafonTunjangan)} per bulan`],
          ["Ambang IKP minimum", p.ambangIkpMinimum ?? <Lencana nada="gold">Belum diputuskan</Lencana>],
        ];
        return (
          <Panel key={p.versi} judul={<>Versi <code className="font-mono">{p.versi}</code></>} aksi={<span className="text-xs text-muted">Dipakai: {dipakai.join(", ") || "—"}</span>}>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <dl className="divide-y divide-line text-sm">
                {butir.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Pita predikat (IKP Akhir)</p>
                <ul className="space-y-2">
                  {p.predikat.map((b, i) => (
                    <li key={b.label} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <LencanaPredikat predikat={b.label} />
                      <span className="tabular-nums text-muted">
                        {i === 0 ? `≥ ${b.min}` : `${b.min} – ${p.predikat[i - 1].min - 0.01}`.replace(/\./g, ",")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        );
      })}

      <Panel judul="Katalog indikator K1" rapat>
        <div className={tabel.bungkus}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className={tabel.kepala}>
              <tr>
                <th className={tabel.th}>Kode</th>
                <th className={tabel.th}>Indikator</th>
                <th className={`${tabel.th} text-right`}>Target</th>
                <th className={tabel.th}>Sumber data</th>
                <th className={tabel.th}>Fase</th>
              </tr>
            </thead>
            {peran.map((r) => (
              <tbody key={r} className={tabel.badan}>
                <tr className="bg-surface-2/60">
                  <th colSpan={5} scope="colgroup" className="px-5 py-2 text-left text-xs font-semibold text-brand-700 dark:text-brand-300">
                    {r} · {LABEL_PERAN[r]}
                  </th>
                </tr>
                {db.indikator
                  .filter((i) => i.peran === r)
                  .map((i) => (
                    <tr key={i.kode} className={i.fase === 2 ? "text-muted" : ""}>
                      <td className={`${tabel.td} font-mono text-xs`}>{i.kode}</td>
                      <td className={tabel.td}>
                        {i.nama}
                        {(i.turunan || i.subTugas || i.penyebutKecil || i.verifikasiKeuangan) && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {i.turunan && <Lencana nada="brand">Otomatis</Lencana>}
                            {i.subTugas && <Lencana>{i.subTugas.length} sub-tugas</Lencana>}
                            {i.penyebutKecil && <Lencana nada="gold">Penyebut kecil</Lencana>}
                            {i.verifikasiKeuangan && <Lencana>Verifikasi Keuangan</Lencana>}
                          </span>
                        )}
                      </td>
                      <td className={tabel.angka}>{i.target}%</td>
                      <td className={tabel.td}>{i.sumberData}</td>
                      <td className={tabel.td}>{i.fase === 2 ? <Lencana>Fase 2</Lencana> : "Fase 1"}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">Nama, target, dan sumber data masih isian sementara dan harus dicocokkan dengan teks Draf 3.</p>
      </Panel>
    </div>
  );
}
