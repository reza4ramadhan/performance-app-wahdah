import type { Metadata } from "next";
import { Suspense } from "react";
import { imporAbsensi } from "../actions";
import { AksiForm } from "../components/aksi-form";
import { Ikon } from "../components/ikon";
import { Avatar, Kerangka, KepalaHalaman, Lencana, Panel, kelasInput, tabel } from "../components/ui";
import { getDb, parameterPeriode, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { hitungK2 } from "@/lib/kpi/engine";
import { angka, labelPeriode, persen } from "@/lib/format";

export const metadata: Metadata = { title: "Absensi K2" };

const CONTOH = `pegawai_id,hari_kerja_wajib,hadir,tepat_waktu,izin_sakit_sah,sanksi_disiplin_berat
p02,22,20,17,0,0`;

export default function Halaman() {
  return (
    <>
      <KepalaHalaman
        judul="Kehadiran · K2"
        sub="Personalia mengunggah rekap absensi bulanan dengan satu templat untuk Makassar dan Jakarta. Izin/sakit sah dikeluarkan dari penyebut kehadiran."
      />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const db = await getDb();
  const periode = periodeAktif(db);
  const parameter = parameterPeriode(db, periode);
  const absensi = db.absensi.filter((a) => a.periodeId === periode.id);
  const aktif = db.pegawai.filter((p) => p.aktif);
  const terkunci = periodeTerkunci(periode);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel judul={`Impor CSV · ${labelPeriode(periode.id)}`}>
        <ul className="mb-4 space-y-1.5 text-xs text-muted">
          <li className="flex gap-2">
            <Ikon nama="dokumen" className="size-4 shrink-0 text-brand-500" />
            Kolom wajib: <code className="text-body">pegawai_id, hari_kerja_wajib, hadir, tepat_waktu, izin_sakit_sah</code>
          </li>
          <li className="flex gap-2">
            <Ikon nama="centang" className="size-4 shrink-0 text-brand-500" />
            Pemisah koma atau titik koma. Data pegawai yang sama ditimpa.
          </li>
          <li className="flex gap-2">
            <Ikon nama="awas" className="size-4 shrink-0 text-gold-700 dark:text-gold-300" />
            Bila satu baris tidak sah, seluruh berkas ditolak.
          </li>
        </ul>
        <AksiForm action={imporAbsensi} tombol="Impor absensi" nonaktif={terkunci}>
          <input type="hidden" name="periodeId" value={periode.id} />
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted transition hover:border-brand-300">
            <Ikon nama="unggah" className="size-6 text-brand-500" />
            <span className="font-medium text-body">Pilih berkas CSV</span>
            <input type="file" name="berkas" accept=".csv,text/csv" className="mt-2 max-w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-brand-500/10 file:px-3 file:py-1 file:text-brand-700" />
          </label>
          <label className="mt-3 block text-xs text-muted">
            atau tempel isi CSV
            <textarea name="teks" rows={5} placeholder={CONTOH} className={`${kelasInput} font-mono text-xs`} />
          </label>
        </AksiForm>
      </Panel>

      <Panel judul="Rekap terunggah" aksi={<span className="text-xs font-medium tabular-nums text-muted">{absensi.length}/{aktif.length} pegawai</span>} rapat>
        <div className={tabel.bungkus}>
          <table className="w-full min-w-[680px] text-sm">
            <thead className={tabel.kepala}>
              <tr>
                <th className={tabel.th}>Pegawai</th>
                <th className={`${tabel.th} text-right`}>Wajib</th>
                <th className={`${tabel.th} text-right`}>Hadir</th>
                <th className={`${tabel.th} text-right`}>Tepat</th>
                <th className={`${tabel.th} text-right`}>Izin/sakit</th>
                <th className={`${tabel.th} text-right`}>% hadir</th>
                <th className={`${tabel.th} text-right`}>K2</th>
              </tr>
            </thead>
            <tbody className={tabel.badan}>
              {aktif.map((pg) => {
                const a = absensi.find((x) => x.pegawaiId === pg.id);
                const k2 = a ? hitungK2(a, parameter) : null;
                const kurang = k2 && k2.hadirPersen < parameter.ambangKehadiran;
                return (
                  <tr key={pg.id}>
                    <td className={tabel.td}>
                      <span className="flex items-center gap-3">
                        <Avatar nama={pg.nama} ukuran="sm" />
                        <span>
                          <span className="block font-medium text-ink">{pg.nama}</span>
                          <span className="block font-mono text-xs text-muted">{pg.id}</span>
                        </span>
                      </span>
                    </td>
                    {a ? (
                      <>
                        <td className={tabel.angka}>{a.hariKerjaWajib}</td>
                        <td className={tabel.angka}>{a.hadir}</td>
                        <td className={tabel.angka}>{a.tepatWaktu}</td>
                        <td className={tabel.angka}>{a.izinSakitSah}</td>
                        <td className={tabel.angka}>
                          <span className={kurang ? "font-semibold text-flame-700 dark:text-flame-300" : ""}>{persen(k2?.hadirPersen)}</span>
                          {kurang && <span className="block text-xs text-flame-700 dark:text-flame-300">di bawah {parameter.ambangKehadiran}%</span>}
                          {a.sanksiDisiplinBerat && <span className="mt-1 block"><Lencana nada="flame">Sanksi berat</Lencana></span>}
                        </td>
                        <td className={`${tabel.angka} font-semibold text-ink`}>{angka(k2?.k2)}</td>
                      </>
                    ) : (
                      <td colSpan={6} className={`${tabel.td} text-right`}>
                        <Lencana nada="gold">Belum diunggah</Lencana>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
