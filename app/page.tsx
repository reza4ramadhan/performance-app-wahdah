import Link from "next/link";
import { Suspense } from "react";
import { majukanStatus } from "./actions";
import { AksiForm } from "./components/aksi-form";
import { JudulHalaman, Kartu, Lencana, LencanaPredikat, Memuat, labelPeriode, td, tdAngka, th } from "./components/ui";
import { URUTAN_STATUS } from "@/lib/data/schema";
import { getDb, hasilPeriode, periodeAktif } from "@/lib/data/store";
import { angka, rupiah } from "@/lib/format";
import type { Predikat } from "@/lib/kpi/types";

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
  const dinilai = hasil.filter((h) => !h.hanyaK2);
  const lengkap = dinilai.filter((h) => h.ikpAkhir !== null);
  const rataIkp = lengkap.length ? lengkap.reduce((a, h) => a + h.ikpAkhir!, 0) / lengkap.length : null;
  const totalTunjangan = lengkap.reduce((a, h) => a + (h.tunjangan ?? 0), 0);
  const sebaran = lengkap.reduce<Partial<Record<Predikat, number>>>((acc, h) => {
    acc[h.predikat!] = (acc[h.predikat!] ?? 0) + 1;
    return acc;
  }, {});
  const unit = new Map(db.units.map((u) => [u.id, u.nama]));
  const idxStatus = URUTAN_STATUS.indexOf(periode.status);
  const berikut = URUTAN_STATUS[idxStatus + 1];

  return (
    <>
      <JudulHalaman
        judul={`IKP ${labelPeriode(periode.id)}`}
        sub={
          <>
            {periode.hasilBeku ? "Hasil akhir yang disahkan" : "IKP sementara — dihitung ulang setiap ada perubahan data"} · parameter{" "}
            <code>{periode.parameterVersi}</code>
          </>
        }
      />

      <Kartu judul="Status periode" className="mb-4">
        <ol className="flex flex-wrap gap-2 text-xs">
          {URUTAN_STATUS.map((s, i) => (
            <li
              key={s}
              className={`rounded-full px-3 py-1 ${
                i < idxStatus
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : i === idxStatus
                    ? "bg-emerald-700 font-semibold text-white"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
              }`}
            >
              {s}
            </li>
          ))}
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

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kartu judul="Pegawai dinilai">
          <p className="text-2xl font-semibold tabular-nums">
            {lengkap.length}/{dinilai.length}
          </p>
          <p className="text-xs text-zinc-500">IKP lengkap</p>
        </Kartu>
        <Kartu judul="Rata-rata IKP Akhir">
          <p className="text-2xl font-semibold tabular-nums">{angka(rataIkp)}</p>
        </Kartu>
        <Kartu judul="Kebutuhan tunjangan">
          <p className="text-2xl font-semibold tabular-nums">{rupiah(totalTunjangan)}</p>
          <p className="text-xs text-zinc-500">dari {lengkap.length} pegawai lengkap</p>
        </Kartu>
        <Kartu judul="Sebaran predikat">
          <ul className="space-y-1 text-sm">
            {(["Sangat Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang"] as Predikat[]).map((p) => (
              <li key={p} className="flex justify-between">
                <LencanaPredikat predikat={p} />
                <span className="tabular-nums">{sebaran[p] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      <Kartu judul="Rekap per pegawai">
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-215 text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className={th}>Pegawai</th>
                <th className={th}>Penugasan</th>
                <th className={`${th} text-right`}>K1</th>
                <th className={`${th} text-right`}>K2</th>
                <th className={`${th} text-right`}>K3</th>
                <th className={`${th} text-right`}>K4</th>
                <th className={`${th} text-right`}>IKP Akhir</th>
                <th className={th}>Predikat</th>
                <th className={`${th} text-right`}>Tunjangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {hasil.map((h) => (
                <tr key={h.pegawaiId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className={td}>
                    <Link href={`/pegawai/${h.pegawaiId}`} className="font-medium text-emerald-800 hover:underline dark:text-emerald-400">
                      {h.nama}
                    </Link>
                    {h.kekurangan.length > 0 && (
                      <div className="mt-1">
                        <Lencana nada="kuning">{h.kekurangan[0]}</Lencana>
                      </div>
                    )}
                  </td>
                  <td className={`${td} text-xs text-zinc-600 dark:text-zinc-400`}>
                    {h.hanyaK2
                      ? "Pimpinan (hanya K2)"
                      : h.penugasan.map((p) => `${p.peran} ${unit.get(p.unitId)}`).join(" · ")}
                  </td>
                  <td className={tdAngka}>{angka(h.k1)}</td>
                  <td className={tdAngka}>{angka(h.k2)}</td>
                  <td className={tdAngka}>{angka(h.k3)}</td>
                  <td className={tdAngka}>{h.hanyaK2 ? "—" : angka(h.k4)}</td>
                  <td className={`${tdAngka} font-semibold`}>{angka(h.ikpAkhir)}</td>
                  <td className={td}>
                    <LencanaPredikat predikat={h.predikat} />
                  </td>
                  <td className={tdAngka}>
                    {rupiah(h.tunjangan)}
                    {h.ikpAkhir !== null && !h.syarat.lolos && (
                      <div className="mt-1 text-xs text-red-700 dark:text-red-400">{h.syarat.alasan.join("; ")}</div>
                    )}
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
