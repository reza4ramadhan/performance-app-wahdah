import { Suspense } from "react";
import { imporAbsensi } from "../actions";
import { AksiForm } from "../components/aksi-form";
import { JudulHalaman, Kartu, Memuat, input, labelPeriode, td, tdAngka, th, kepalaTabel, badanTabel } from "../components/ui";
import { getDb, periodeAktif } from "@/lib/data/store";
import { hitungK2 } from "@/lib/kpi/engine";
import { angka, persen } from "@/lib/format";

const CONTOH = `pegawai_id,hari_kerja_wajib,hadir,tepat_waktu,izin_sakit_sah,sanksi_disiplin_berat
p02,22,20,17,0,0`;

export default function Halaman() {
  return (
    <>
      <JudulHalaman judul="Absensi K2" sub="Personalia mengunggah rekap absensi bulanan. Satu templat untuk Makassar dan Jakarta." />
      <Suspense fallback={<Memuat />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const db = await getDb();
  const periode = periodeAktif(db);
  const parameter = db.parameter.find((p) => p.versi === periode.parameterVersi)!;
  const absensi = db.absensi.filter((a) => a.periodeId === periode.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Kartu judul={`Impor CSV · ${labelPeriode(periode.id)}`}>
        <p className="mb-2 text-xs text-zinc-500">
          Pemisah koma atau titik koma. Baris dengan <code>pegawai_id</code> yang sama menimpa data lama. Seluruh berkas ditolak bila ada
          satu baris tidak sah.
        </p>
        <AksiForm action={imporAbsensi} tombol="Impor">
          <input type="hidden" name="periodeId" value={periode.id} />
          <label className="mb-2 block text-xs">
            Berkas CSV
            <input type="file" name="berkas" accept=".csv,text/csv" className={input} />
          </label>
          <label className="block text-xs">
            atau tempel isi CSV
            <textarea name="teks" rows={6} placeholder={CONTOH} className={`${input} font-mono text-xs`} />
          </label>
        </AksiForm>
      </Kartu>

      <Kartu judul="Rekap terunggah">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-150 text-sm">
            <thead className={kepalaTabel}>
              <tr>
                <th className={th}>Pegawai</th>
                <th className={`${th} text-right`}>Wajib</th>
                <th className={`${th} text-right`}>Hadir</th>
                <th className={`${th} text-right`}>Tepat</th>
                <th className={`${th} text-right`}>Izin/sakit</th>
                <th className={`${th} text-right`}>% hadir</th>
                <th className={`${th} text-right`}>K2</th>
              </tr>
            </thead>
            <tbody className={badanTabel}>
              {db.pegawai.map((pg) => {
                const a = absensi.find((x) => x.pegawaiId === pg.id);
                const k2 = a ? hitungK2(a, parameter) : null;
                return (
                  <tr key={pg.id}>
                    <td className={td}>
                      {pg.nama} <span className="font-mono text-xs text-zinc-500">{pg.id}</span>
                    </td>
                    {a ? (
                      <>
                        <td className={tdAngka}>{a.hariKerjaWajib}</td>
                        <td className={tdAngka}>{a.hadir}</td>
                        <td className={tdAngka}>{a.tepatWaktu}</td>
                        <td className={tdAngka}>{a.izinSakitSah}</td>
                        <td className={`${tdAngka} ${k2 && k2.hadirPersen < parameter.ambangKehadiran ? "text-api-700 dark:text-api-100" : ""}`}>
                          {persen(k2?.hadirPersen)}
                        </td>
                        <td className={`${tdAngka} font-medium`}>{angka(k2?.k2)}</td>
                      </>
                    ) : (
                      <td colSpan={6} className={`${td} text-zinc-400`}>
                        Belum diunggah
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kartu>
    </div>
  );
}
