import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JudulHalaman, Kartu, Lencana, LencanaPredikat, Memuat, labelPeriode, td, tdAngka, th } from "../../components/ui";
import { getDb, hasilPeriode, periodeAktif } from "@/lib/data/store";
import { angka, persen, rupiah } from "@/lib/format";
import type { HasilIndikator } from "@/lib/kpi/engine";
import { LABEL_NILAI_K3, NILAI_K3 } from "@/lib/kpi/types";

export default function Halaman(props: PageProps<"/pegawai/[id]">) {
  return (
    <Suspense fallback={<Memuat />}>
      <Rincian params={props.params} />
    </Suspense>
  );
}

function BarisIndikator({ i, sub = false }: { i: HasilIndikator; sub?: boolean }) {
  return (
    <tr className={i.dikecualikan ? "text-zinc-400" : ""}>
      <td className={`${td} ${sub ? "pl-8 text-xs" : ""}`}>
        <span className="font-mono text-xs">{i.kode}</span> {i.nama}
        <div className="mt-1 flex flex-wrap gap-1">
          {i.dikecualikan && <Lencana>Dikecualikan: {i.alasan}</Lencana>}
          {i.penyebutKecil && <Lencana nada="kuning">Penyebut kecil</Lencana>}
          {i.menungguVerifikasi && <Lencana nada="kuning">Menunggu verifikasi Keuangan</Lencana>}
        </div>
      </td>
      <td className={tdAngka}>{i.sub ? "" : persen(i.realisasi)}</td>
      <td className={tdAngka}>{i.sub ? "" : persen(i.target)}</td>
      <td className={`${tdAngka} font-medium`}>{angka(i.skor)}</td>
    </tr>
  );
}

async function Rincian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const periode = periodeAktif(db);
  const h = hasilPeriode(db, periode.id).find((x) => x.pegawaiId === id);
  const pg = db.pegawai.find((p) => p.id === id);
  if (!h || !pg) notFound();
  const unit = new Map(db.units.map((u) => [u.id, u.nama]));
  const nama = new Map(db.pegawai.map((p) => [p.id, p.nama]));
  const parameter = db.parameter.find((p) => p.versi === periode.parameterVersi)!;
  const pnDb = new Map(db.penugasan.map((t) => [t.id, t]));

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/" className="text-emerald-800 hover:underline dark:text-emerald-400">
          ← Dasbor
        </Link>
      </p>
      <JudulHalaman
        judul={h.nama}
        sub={`${pg.status} · ${pg.tempatTugas}${pg.pimpinan ? ` · ${pg.pimpinan}` : ""} · ${labelPeriode(periode.id)}`}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["K1", h.k1, `× ${parameter.bobot.k1 * 100}%`],
          ["K2", h.k2, `× ${parameter.bobot.k2 * 100}%`],
          ["K3", h.k3, `× ${parameter.bobot.k3 * 100}%`],
          ["K4", h.hanyaK2 ? null : h.k4, `maks ${parameter.k4Maks} poin`],
          ["IKP Akhir", h.ikpAkhir, h.ikp !== null ? `IKP ${angka(h.ikp)}` : ""],
        ].map(([label, nilai, ket]) => (
          <Kartu key={label as string} judul={label as string}>
            <p className="text-2xl font-semibold tabular-nums">{angka(nilai as number | null)}</p>
            <p className="text-xs text-zinc-500">{ket}</p>
          </Kartu>
        ))}
      </div>

      <Kartu judul="Hasil dan tunjangan" className="mb-4">
        {h.hanyaK2 ? (
          <p className="text-sm">Rumus IKP dan tunjangan pimpinan belum diputuskan; hanya K2 yang ditampilkan.</p>
        ) : h.ikpAkhir === null ? (
          <div className="text-sm">
            <p className="mb-1">IKP belum bisa dihitung karena:</p>
            <ul className="list-disc pl-5">
              {h.kekurangan.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <LencanaPredikat predikat={h.predikat} />
            <span>
              Tunjangan: <strong className="tabular-nums">{rupiah(h.tunjangan)}</strong>
            </span>
            {h.syarat.lolos ? <Lencana nada="hijau">Memenuhi syarat</Lencana> : <Lencana nada="merah">Gugur: {h.syarat.alasan.join("; ")}</Lencana>}
          </div>
        )}
        {h.peringatan.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
            {[...new Set(h.peringatan)].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </Kartu>

      <Kartu judul="K2 — Kehadiran dan ketepatan waktu" className="mb-4">
        <p className="text-sm">
          Kehadiran {persen(h.hadirPersen)} × {parameter.bobotK2.hadir * 100}% + ketepatan waktu {persen(h.tepatPersen)} ×{" "}
          {parameter.bobotK2.tepat * 100}% = <strong>{angka(h.k2)}</strong>
        </p>
      </Kartu>

      {h.penugasan.map((p) => {
        const t = pnDb.get(p.penugasanId);
        return (
          <Kartu
            key={p.penugasanId}
            judul={`${p.peran} · ${unit.get(p.unitId)}${t?.alokasi ? ` · alokasi ${t.alokasi}%` : ""}`}
            className="mb-4"
          >
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-140 text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className={th}>Indikator K1</th>
                    <th className={`${th} text-right`}>Realisasi</th>
                    <th className={`${th} text-right`}>Target</th>
                    <th className={`${th} text-right`}>Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {p.indikator.map((i) => [
                    <BarisIndikator key={i.kode} i={i} />,
                    ...(i.sub ?? []).map((s) => <BarisIndikator key={s.kode} i={s} sub />),
                  ])}
                  <tr className="font-semibold">
                    <td className={td}>K1 penugasan</td>
                    <td />
                    <td />
                    <td className={tdAngka}>{angka(p.k1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
              <p className="mb-2 font-medium">
                K3 oleh {t?.penilaiId ? nama.get(t.penilaiId) : "—"}: {angka(p.k3)}
              </p>
              {p.k3Rincian ? (
                <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                  {NILAI_K3.map((n) => (
                    <li key={n}>
                      {LABEL_NILAI_K3[n]}: <strong>{p.k3Rincian![n]}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Belum dinilai.</p>
              )}
            </div>
          </Kartu>
        );
      })}
    </>
  );
}
