import Link from "next/link";
import { Suspense } from "react";
import { majukanStatus } from "./actions";
import { AksiForm } from "./components/aksi-form";
import { Ikon } from "./components/ikon";
import {
  Avatar,
  BatangProgres,
  JudulHalaman,
  Kartu,
  KartuStat,
  Lencana,
  LencanaPredikat,
  Memuat,
  TautanAksi,
  badanTabel,
  kepalaTabel,
  labelPeriode,
  td,
  tdAngka,
  th,
} from "./components/ui";
import { URUTAN_STATUS } from "@/lib/data/schema";
import { getDb, hasilPeriode, penugasanBerlaku, periodeAktif } from "@/lib/data/store";
import { angka, rupiah } from "@/lib/format";
import type { HasilPegawai } from "@/lib/kpi/engine";
import type { Predikat } from "@/lib/kpi/types";

const PREDIKAT: Predikat[] = ["Sangat Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang"];

export default function Dasbor() {
  return (
    <Suspense fallback={<Memuat />}>
      <IsiDasbor />
    </Suspense>
  );
}

async function IsiDasbor() {
  const db = await getDb();
  const periode = periodeAktif(db);
  const hasil = hasilPeriode(db, periode.id);
  const unit = new Map(db.units.map((u) => [u.id, u.nama]));
  const pimpinan = new Set(db.pegawai.filter((p) => p.pimpinan).map((p) => p.id));

  const dinilai = hasil.filter((h) => !h.hanyaK2);
  const lengkap = dinilai.filter((h) => h.ikpAkhir !== null);
  const rataIkp = lengkap.length ? lengkap.reduce((a, h) => a + h.ikpAkhir!, 0) / lengkap.length : null;
  const totalTunjangan = lengkap.reduce((a, h) => a + (h.tunjangan ?? 0), 0);
  const perluTindakan = dinilai.filter((h) => h.kekurangan.length > 0 || (h.ikpAkhir !== null && !h.syarat.lolos));

  // Kelengkapan data periode.
  const di = <T extends { periodeId: string }>(xs: T[]) => xs.filter((x) => x.periodeId === periode.id);
  const pn = penugasanBerlaku(db, periode.id).filter((t) => !pimpinan.has(t.pegawaiId));
  const pnK1 = new Set(di(db.realisasi).map((r) => r.penugasanId));
  const pnK3 = new Set(di(db.skorK3).map((s) => s.penugasanId));
  const pgAbsen = new Set(di(db.absensi).map((a) => a.pegawaiId));
  const pgLog = new Set(di(db.logPengembanganDiri).map((l) => l.pegawaiId));
  const aktif = db.pegawai.filter((p) => p.aktif);

  const sebaran = PREDIKAT.map((p) => ({ p, n: lengkap.filter((h) => h.predikat === p).length }));
  const maksSebaran = Math.max(1, ...sebaran.map((s) => s.n));

  const perUnit = db.units
    .map((u) => {
      const anggota = lengkap.filter((h) => h.penugasan.some((x) => x.unitId === u.id));
      return { nama: u.nama, n: anggota.length, rata: anggota.length ? anggota.reduce((a, h) => a + h.ikpAkhir!, 0) / anggota.length : null };
    })
    .filter((u) => u.rata !== null);

  const idxStatus = URUTAN_STATUS.indexOf(periode.status);
  const berikut = URUTAN_STATUS[idxStatus + 1];

  const kolom: { judul: string; ket: string; aksen: string; isi: HasilPegawai[] }[] = [
    { judul: "Belum lengkap", ket: "IKP belum bisa dihitung", aksen: "bg-zinc-100/70 dark:bg-zinc-900", isi: dinilai.filter((h) => h.ikpAkhir === null) },
    {
      judul: "Perlu perhatian",
      ket: "Di bawah 70 atau gugur syarat",
      aksen: "bg-api-100/50 dark:bg-api-700/10",
      isi: lengkap.filter((h) => h.ikpAkhir! < 70 || !h.syarat.lolos),
    },
    { judul: "Baik", ket: "IKP Akhir 70–89,99", aksen: "bg-emas-100/50 dark:bg-emas-700/10", isi: lengkap.filter((h) => h.syarat.lolos && h.ikpAkhir! >= 70 && h.ikpAkhir! < 90) },
    { judul: "Sangat baik", ket: "IKP Akhir ≥ 90", aksen: "bg-wi-50 dark:bg-wi-900/30", isi: lengkap.filter((h) => h.syarat.lolos && h.ikpAkhir! >= 90) },
  ];

  const unitPegawai = (h: HasilPegawai) =>
    h.hanyaK2 ? "Pimpinan" : [...new Set(h.penugasan.map((x) => `${x.peran} · ${unit.get(x.unitId)}`))].join(", ");

  return (
    <>
      <JudulHalaman
        judul="Assalamu'alaikum"
        sub={
          <>
            Ringkasan penilaian kinerja <strong>{labelPeriode(periode.id)}</strong>.{" "}
            {periode.hasilBeku ? "Hasil akhir sudah disahkan." : "Angka di bawah adalah IKP sementara dan dihitung ulang setiap ada perubahan data."}
          </>
        }
      />

      {/* Baris 1 — angka utama */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuStat ikon="pengguna" nada="wi" label="IKP lengkap" nilai={`${lengkap.length} / ${dinilai.length}`} ket="pegawai dinilai" />
        <KartuStat ikon="grafik" nada="menara" label="Rata-rata IKP Akhir" nilai={angka(rataIkp)} ket={`dari ${lengkap.length} pegawai lengkap`} />
        <KartuStat ikon="dompet" nada="emas" label="Kebutuhan tunjangan" nilai={rupiah(totalTunjangan)} ket="sementara, belum final" />
        <KartuStat ikon="peringatan" nada="api" label="Perlu tindakan" nilai={perluTindakan.length} ket="data kurang atau gugur syarat" />
      </div>

      {/* Baris 2 — kelengkapan, sebaran, tahapan */}
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Kartu judul="Kelengkapan data" aksi={<TautanAksi href="/input/k1">Isi data</TautanAksi>}>
          <div className="space-y-5">
            <BatangProgres label="Realisasi K1 terisi" nilai={pn.filter((t) => pnK1.has(t.id)).length} total={pn.length} ket="per penugasan" />
            <BatangProgres label="Rekap absensi K2" nilai={aktif.filter((p) => pgAbsen.has(p.id)).length} total={aktif.length} ket="per pegawai, termasuk pimpinan" />
            <BatangProgres label="Skor perilaku K3" nilai={pn.filter((t) => pnK3.has(t.id)).length} total={pn.length} ket="per penugasan, dari koordinator" />
            <BatangProgres
              label="Log pengembangan diri"
              nilai={aktif.filter((p) => !p.pimpinan && pgLog.has(p.id)).length}
              total={aktif.filter((p) => !p.pimpinan).length}
              ket="tanpa log, skor pengembangan diri maksimal 2"
            />
          </div>
        </Kartu>

        <Kartu judul="Sebaran predikat">
          <p className="mb-4 text-sm text-zinc-500">
            Jumlah pegawai per predikat, dari {lengkap.length} pegawai dengan IKP lengkap.
          </p>
          <ul className="space-y-3">
            {sebaran.map(({ p, n }) => (
              <li key={p} className="grid grid-cols-[120px_1fr_28px] items-center gap-3" title={`${p}: ${n} pegawai`}>
                <LencanaPredikat predikat={p} />
                <div className="h-6 rounded-md bg-wi-50/60 dark:bg-wi-900/40">
                  {n > 0 && <div className="h-6 rounded-r-md bg-wi-500 transition-[width] dark:bg-wi-400" style={{ width: `${(n / maksSebaran) * 100}%` }} />}
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </Kartu>

        <Kartu judul="Tahapan periode">
          <ol className="relative space-y-3">
            {URUTAN_STATUS.map((s, i) => {
              const selesai = i < idxStatus;
              const kini = i === idxStatus;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selesai ? "bg-wi-500 text-white" : kini ? "bg-emas-400 text-tinta ring-4 ring-emas-100 dark:ring-emas-700/30" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                    }`}
                  >
                    {selesai ? <Ikon nama="centang" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={kini ? "font-semibold text-tinta dark:text-white" : selesai ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400"}>{s}</span>
                  {kini && <span className="ml-auto text-xs font-medium text-emas-700 dark:text-emas-300">Sekarang</span>}
                </li>
              );
            })}
          </ol>
          {berikut && (
            <AksiForm
              action={majukanStatus}
              tombol={`Lanjut ke "${berikut}"`}
              konfirmasi={berikut === "Disahkan" ? "Setelah disahkan, data periode terkunci. Lanjutkan?" : undefined}
            >
              <input type="hidden" name="periodeId" value={periode.id} />
            </AksiForm>
          )}
        </Kartu>
      </div>

      {/* Baris 3 — tindakan & grafik unit */}
      <div className="mb-6 grid gap-4 xl:grid-cols-5">
        <Kartu judul="Perlu tindakan" className="xl:col-span-2" aksi={<TautanAksi href="#rekap">Rekap lengkap</TautanAksi>}>
          {perluTindakan.length === 0 ? (
            <p className="text-sm text-zinc-500">Semua pegawai lengkap dan memenuhi syarat.</p>
          ) : (
            <ul className="space-y-3">
              {perluTindakan.map((h) => (
                <li key={h.pegawaiId}>
                  <Link href={`/pegawai/${h.pegawaiId}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-wi-50/70 dark:hover:bg-wi-900/40">
                    <Avatar nama={h.nama} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{h.nama}</span>
                      <span className="block truncate text-xs text-zinc-500">{unitPegawai(h)}</span>
                    </span>
                    {h.kekurangan.length > 0 ? (
                      <Lencana nada="kuning">{h.kekurangan[0].replace(" dari semua koordinator", "")}</Lencana>
                    ) : (
                      <Lencana nada="merah">{h.syarat.alasan[0]}</Lencana>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        <Kartu judul="Rata-rata IKP Akhir per unit" className="xl:col-span-3">
          <GrafikUnit data={perUnit as { nama: string; n: number; rata: number }[]} />
        </Kartu>
      </div>

      {/* Baris 4 — papan pegawai */}
      <Kartu judul="Papan pegawai" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kolom.map((k) => (
            <div key={k.judul} className={`rounded-xl p-3 ${k.aksen}`}>
              <div className="mb-3 flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-tinta dark:text-white">{k.judul}</h3>
                <span className="rounded-full bg-white px-2 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-wi-950 dark:text-zinc-300">{k.isi.length}</span>
              </div>
              <p className="mb-3 px-1 text-xs text-zinc-500">{k.ket}</p>
              <ul className="space-y-2">
                {k.isi.map((h) => (
                  <li key={h.pegawaiId}>
                    <Link href={`/pegawai/${h.pegawaiId}`} className="block rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-wi-300 dark:bg-wi-950 dark:ring-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{h.nama}</span>
                        <Avatar nama={h.nama} kecil />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{unitPegawai(h)}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        {h.ikpAkhir !== null ? (
                          <>
                            <span className="font-semibold tabular-nums text-tinta dark:text-white">IKP {angka(h.ikpAkhir)}</span>
                            <span className="tabular-nums text-zinc-500">{rupiah(h.tunjangan)}</span>
                          </>
                        ) : (
                          <span className="text-zinc-500">{h.kekurangan[0]}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
                {k.isi.length === 0 && <li className="px-1 text-xs text-zinc-400">Tidak ada.</li>}
              </ul>
            </div>
          ))}
        </div>
      </Kartu>

      {/* Baris 5 — tabel rekap */}
      <Kartu judul={<span id="rekap">Rekap per pegawai</span>}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-215 text-sm">
            <thead className={kepalaTabel}>
              <tr>
                <th className={th}>Pegawai</th>
                <th className={`${th} text-right`}>K1</th>
                <th className={`${th} text-right`}>K2</th>
                <th className={`${th} text-right`}>K3</th>
                <th className={`${th} text-right`}>K4</th>
                <th className={`${th} text-right`}>IKP Akhir</th>
                <th className={th}>Predikat</th>
                <th className={`${th} text-right`}>Tunjangan</th>
              </tr>
            </thead>
            <tbody className={badanTabel}>
              {hasil.map((h) => (
                <tr key={h.pegawaiId} className="hover:bg-wi-50/50 dark:hover:bg-wi-900/30">
                  <td className={td}>
                    <Link href={`/pegawai/${h.pegawaiId}`} className="flex items-center gap-3">
                      <Avatar nama={h.nama} kecil />
                      <span>
                        <span className="block font-medium text-wi-700 hover:underline dark:text-wi-300">{h.nama}</span>
                        <span className="block text-xs text-zinc-500">{h.hanyaK2 ? "Pimpinan — hanya K2" : unitPegawai(h)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={tdAngka}>{angka(h.k1)}</td>
                  <td className={tdAngka}>{angka(h.k2)}</td>
                  <td className={tdAngka}>{angka(h.k3)}</td>
                  <td className={tdAngka}>{h.hanyaK2 ? "—" : angka(h.k4)}</td>
                  <td className={`${tdAngka} font-semibold text-tinta dark:text-white`}>{angka(h.ikpAkhir)}</td>
                  <td className={td}>
                    <LencanaPredikat predikat={h.predikat} />
                  </td>
                  <td className={tdAngka}>
                    {rupiah(h.tunjangan)}
                    {h.ikpAkhir !== null && !h.syarat.lolos && <div className="mt-1 text-xs text-api-700 dark:text-api-100">{h.syarat.alasan.join("; ")}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>
    </>
  );
}

/** Batang vertikal satu seri; nilai ditulis di atas tiap batang, garis bantu 0–100 samar. */
function GrafikUnit({ data }: { data: { nama: string; n: number; rata: number }[] }) {
  if (!data.length) return <p className="text-sm text-zinc-500">Belum ada pegawai dengan IKP lengkap.</p>;
  const TINGGI = 220;
  const maks = Math.max(100, ...data.map((d) => d.rata));
  const garis = [0, 25, 50, 75, 100];
  return (
    <figure className="pt-5">
      <div className="flex gap-2">
        <div className="relative w-7 shrink-0 text-right text-[11px] tabular-nums text-zinc-400" style={{ height: TINGGI }} aria-hidden>
          {garis.map((g) => (
            <span key={g} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(g / maks) * 100}%` }}>
              {g}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: TINGGI }} aria-hidden>
            {garis.map((g) => (
              <div key={g} className={`absolute inset-x-0 border-t ${g === 0 ? "border-zinc-300 dark:border-zinc-700" : "border-dashed border-zinc-200 dark:border-zinc-800"}`} style={{ bottom: `${(g / maks) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex justify-around gap-2">
            {data.map((d) => (
              <div key={d.nama} className="group flex min-w-0 max-w-24 flex-1 flex-col items-center" title={`${d.nama}: rata-rata ${angka(d.rata)} (${d.n} pegawai)`}>
                <div className="flex w-full items-end justify-center" style={{ height: TINGGI }}>
                  <div className="relative w-full max-w-12 rounded-t-sm bg-wi-500 transition group-hover:bg-wi-600 dark:bg-wi-400" style={{ height: `${(d.rata / maks) * 100}%` }}>
                    <span className="absolute inset-x-0 -top-5 text-center text-xs font-semibold tabular-nums text-tinta dark:text-white">{angka(d.rata)}</span>
                  </div>
                </div>
                <span className="mt-2 text-center text-xs leading-tight text-zinc-600 dark:text-zinc-400">{d.nama}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-zinc-500">Hanya pegawai dengan IKP lengkap. Pegawai rangkap dihitung di setiap unitnya.</figcaption>
      <table className="sr-only">
        <caption>Rata-rata IKP Akhir per unit</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.nama}>
              <th>{d.nama}</th>
              <td>{angka(d.rata)}</td>
              <td>{d.n} pegawai</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
