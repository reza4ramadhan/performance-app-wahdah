import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ikon } from "../../components/ikon";
import { Kartu, Lencana, Memuat, labelPeriode, td, tdAngka, th, kepalaTabel, badanTabel, Avatar } from "../../components/ui";
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
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-wi-700 hover:underline dark:text-wi-300">
        <Ikon nama="panah" className="h-4 w-4 rotate-180" /> Dasbor
      </Link>

      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-wi-600 via-wi-700 to-wi-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="rounded-full ring-4 ring-white/20">
              <Avatar nama={h.nama} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{h.nama}</h1>
              <p className="text-sm text-wi-100">
                {pg.status} · {pg.tempatTugas}
                {pg.pimpinan ? ` · ${pg.pimpinan}` : ""} · {labelPeriode(periode.id)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-wi-100">IKP Akhir</p>
            <p className="text-4xl font-bold tabular-nums">{angka(h.ikpAkhir)}</p>
            {h.ikp !== null && <p className="text-xs text-wi-100">IKP {angka(h.ikp)} + K4 {angka(h.k4)}</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/15 pt-4 text-sm">
          {h.hanyaK2 ? (
            <span>Rumus IKP dan tunjangan pimpinan belum diputuskan; hanya K2 yang ditampilkan.</span>
          ) : h.ikpAkhir === null ? (
            <span className="inline-flex items-center gap-2">
              <Ikon nama="peringatan" className="h-4 w-4 text-emas-300" /> IKP belum bisa dihitung: {h.kekurangan.join("; ")}
            </span>
          ) : (
            <>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-wi-800">{h.predikat}</span>
              <span>
                Tunjangan <strong className="tabular-nums">{rupiah(h.tunjangan)}</strong>
              </span>
              {h.syarat.lolos ? (
                <span className="inline-flex items-center gap-1 text-wi-100">
                  <Ikon nama="centang" className="h-4 w-4" /> Memenuhi syarat
                </span>
              ) : (
                <span className="rounded-full bg-api-500 px-3 py-1 text-xs font-semibold">Gugur: {h.syarat.alasan.join("; ")}</span>
              )}
            </>
          )}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            ["K1 · Capaian kerja", h.k1, `bobot ${parameter.bobot.k1 * 100}%`],
            ["K2 · Kehadiran", h.k2, `bobot ${parameter.bobot.k2 * 100}%`],
            ["K3 · Perilaku", h.k3, `bobot ${parameter.bobot.k3 * 100}%`],
            ["K4 · Inovasi Plus", h.hanyaK2 ? null : h.k4, `maks ${parameter.k4Maks} poin`],
          ] as const
        ).map(([label, nilai, ket]) => (
          <Kartu key={label}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-tinta dark:text-white">{angka(nilai)}</p>
            <p className="text-xs text-zinc-500">{ket}</p>
          </Kartu>
        ))}
      </div>

      {h.peringatan.length > 0 && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-emas-300/60 bg-emas-100/60 p-4 text-sm text-emas-700 dark:border-emas-700/40 dark:bg-emas-700/10 dark:text-emas-100">
          <Ikon nama="peringatan" className="mt-0.5 h-5 w-5 shrink-0" />
          <ul className="space-y-1">
            {[...new Set(h.peringatan)].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <Kartu judul="K2 — Kehadiran dan ketepatan waktu" className="mb-6">
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
            className="mb-6"
          >
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-140 text-sm">
                <thead className={kepalaTabel}>
                  <tr>
                    <th className={th}>Indikator K1</th>
                    <th className={`${th} text-right`}>Realisasi</th>
                    <th className={`${th} text-right`}>Target</th>
                    <th className={`${th} text-right`}>Skor</th>
                  </tr>
                </thead>
                <tbody className={badanTabel}>
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
            <div className="mt-4 border-t border-wi-50 pt-3 text-sm dark:border-wi-900">
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
