import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ikon } from "../../components/ikon";
import { Avatar, Kerangka, Lencana, Panel, tabel } from "../../components/ui";
import { getDb, hasilPeriode, parameterPeriode, periodeAktif } from "@/lib/data/store";
import { angka, labelPeriode, persen, rupiah } from "@/lib/format";
import type { HasilIndikator } from "@/lib/kpi/engine";
import { LABEL_NILAI_K3, LABEL_PERAN, NILAI_K3 } from "@/lib/kpi/types";

export default function Halaman(props: PageProps<"/pegawai/[id]">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Rincian params={props.params} />
    </Suspense>
  );
}

async function Rincian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const periode = periodeAktif(db);
  const h = hasilPeriode(db, periode.id).find((x) => x.pegawaiId === id);
  const pg = db.pegawai.find((p) => p.id === id);
  if (!h || !pg) notFound();

  const parameter = parameterPeriode(db, periode);
  const namaUnit = new Map(db.units.map((u) => [u.id, u.nama]));
  const namaPegawai = new Map(db.pegawai.map((p) => [p.id, p.nama]));
  const penugasan = new Map(db.penugasan.map((t) => [t.id, t]));

  const komponen = [
    { label: "K1 · Capaian kerja", nilai: h.k1, ket: `bobot ${parameter.bobot.k1 * 100}%` },
    { label: "K2 · Kehadiran", nilai: h.k2, ket: `bobot ${parameter.bobot.k2 * 100}%` },
    { label: "K3 · Perilaku", nilai: h.k3, ket: `bobot ${parameter.bobot.k3 * 100}%` },
    { label: "K4 · Inovasi Plus", nilai: h.hanyaK2 ? null : h.k4, ket: `tambahan, maks. ${parameter.k4Maks} poin` },
  ];

  return (
    <>
      <Link href="/pegawai" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
        <Ikon nama="kiri" className="size-4" /> Semua pegawai
      </Link>

      {/* Profil */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900 p-6 text-white">
        <span aria-hidden className="absolute -right-10 -bottom-16 size-56 rounded-full bg-white/5" />
        <span aria-hidden className="absolute top-6 right-48 size-16 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="rounded-full ring-4 ring-white/20">
              <Avatar nama={h.nama} ukuran="lg" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{h.nama}</h1>
              <p className="text-sm text-brand-100">
                {pg.pimpinan ?? pg.status} · {pg.tempatTugas} · {labelPeriode(periode.id)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-100">IKP Akhir</p>
            <p className="text-4xl font-bold tabular-nums">{angka(h.ikpAkhir)}</p>
            {h.ikp !== null && (
              <p className="text-xs text-brand-100">
                IKP {angka(h.ikp)} + K4 {angka(h.k4)}
              </p>
            )}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-3 border-t border-white/15 pt-4 text-sm">
          {h.hanyaK2 ? (
            <span>Rumus IKP dan tunjangan pimpinan belum diputuskan. Untuk sementara hanya K2 yang ditampilkan.</span>
          ) : h.ikpAkhir === null ? (
            <span className="inline-flex items-center gap-2">
              <Ikon nama="awas" className="size-4 text-gold-300" />
              IKP belum bisa dihitung: {h.kekurangan.join("; ")}.
            </span>
          ) : (
            <>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-800">{h.predikat}</span>
              <span>
                Tunjangan <strong className="tabular-nums">{rupiah(h.tunjangan)}</strong>
              </span>
              {h.syarat.lolos ? (
                <span className="inline-flex items-center gap-1 text-brand-100">
                  <Ikon nama="centang" className="size-4" /> Memenuhi syarat
                </span>
              ) : (
                <span className="rounded-full bg-flame-500 px-3 py-1 text-xs font-semibold">Gugur: {h.syarat.alasan.join("; ")}</span>
              )}
            </>
          )}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {komponen.map((k) => (
          <Panel key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{angka(k.nilai)}</p>
            <p className="text-xs text-muted">{k.ket}</p>
          </Panel>
        ))}
      </div>

      {h.peringatan.length > 0 && (
        <div role="note" className="mb-6 flex gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-gold-700 dark:text-gold-300">
          <Ikon nama="awas" className="mt-0.5 size-5 shrink-0" />
          <ul className="space-y-1">
            {[...new Set(h.peringatan)].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <Panel judul="K2 · Kehadiran dan ketepatan waktu" className="mb-6">
        {h.k2 === null ? (
          <p className="text-sm text-muted">Rekap absensi bulan ini belum diunggah Personalia.</p>
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <Rumus label="Kehadiran" nilai={persen(h.hadirPersen)} ket={`× ${parameter.bobotK2.hadir * 100}% · syarat insentif ≥ ${parameter.ambangKehadiran}%`} />
            <Rumus label="Ketepatan waktu" nilai={persen(h.tepatPersen)} ket={`× ${parameter.bobotK2.tepat * 100}%`} />
            <Rumus label="K2" nilai={angka(h.k2)} ket="jumlah keduanya" tebal />
          </div>
        )}
      </Panel>

      {h.penugasan.map((p) => {
        const t = penugasan.get(p.penugasanId);
        return (
          <Panel
            key={p.penugasanId}
            rapat
            className="mb-6"
            judul={
              <span className="flex flex-wrap items-center gap-2">
                {LABEL_PERAN[p.peran]} · {namaUnit.get(p.unitId)}
                {t?.alokasi && <Lencana nada="brand">alokasi {t.alokasi}%</Lencana>}
              </span>
            }
            aksi={<span className="text-sm text-muted">K1 <strong className="tabular-nums text-ink">{angka(p.k1)}</strong></span>}
          >
            <div className={tabel.bungkus}>
              <table className="w-full min-w-[620px] text-sm">
                <thead className={tabel.kepala}>
                  <tr>
                    <th className={tabel.th}>Indikator K1</th>
                    <th className={`${tabel.th} text-right`}>Realisasi</th>
                    <th className={`${tabel.th} text-right`}>Target</th>
                    <th className={`${tabel.th} text-right`}>Skor</th>
                  </tr>
                </thead>
                <tbody className={tabel.badan}>
                  {p.indikator.flatMap((i) => [<BarisIndikator key={i.kode} i={i} />, ...(i.sub ?? []).map((s) => <BarisIndikator key={s.kode} i={s} sub />)])}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink">K3 · Perilaku</p>
                <p className="text-sm text-muted">
                  Penilai: {t?.penilaiId ? namaPegawai.get(t.penilaiId) : "belum dipetakan"} · <strong className="tabular-nums text-ink">{angka(p.k3)}</strong>
                </p>
              </div>
              {p.k3Rincian ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {NILAI_K3.map((n) => (
                    <li key={n} className="rounded-xl bg-surface-2 px-3 py-2">
                      <p className="text-xs text-muted">{LABEL_NILAI_K3[n]}</p>
                      <p className="text-lg font-bold tabular-nums text-ink">
                        {p.k3Rincian![n]}
                        <span className="text-xs font-normal text-muted"> / 5</span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Belum dinilai koordinator.</p>
              )}
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function Rumus({ label, nilai, ket, tebal }: { label: string; nilai: string; ket: string; tebal?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${tebal ? "bg-brand-500/10" : "bg-surface-2"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${tebal ? "text-brand-700 dark:text-brand-200" : "text-ink"}`}>{nilai}</p>
      <p className="text-xs text-muted">{ket}</p>
    </div>
  );
}

function BarisIndikator({ i, sub = false }: { i: HasilIndikator; sub?: boolean }) {
  return (
    <tr className={i.dikecualikan ? "text-muted" : ""}>
      <td className={`${tabel.td} ${sub ? "pl-10" : ""}`}>
        <span className={sub ? "text-xs" : ""}>
          <span className="mr-1.5 font-mono text-xs text-muted">{i.kode}</span>
          {i.nama}
        </span>
        {(i.dikecualikan || i.penyebutKecil || i.menungguVerifikasi) && (
          <span className="mt-1 flex flex-wrap gap-1">
            {i.dikecualikan && <Lencana>Dikecualikan · {i.alasan}</Lencana>}
            {i.penyebutKecil && <Lencana nada="gold">Penyebut kecil</Lencana>}
            {i.menungguVerifikasi && <Lencana nada="gold">Menunggu verifikasi Keuangan</Lencana>}
          </span>
        )}
      </td>
      <td className={tabel.angka}>{i.sub ? "" : persen(i.realisasi)}</td>
      <td className={tabel.angka}>{i.sub ? "" : persen(i.target)}</td>
      <td className={`${tabel.angka} font-semibold ${i.dikecualikan ? "" : "text-ink"}`}>{angka(i.skor)}</td>
    </tr>
  );
}
