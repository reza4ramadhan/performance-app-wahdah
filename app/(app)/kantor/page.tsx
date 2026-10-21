import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, CalendarCheck2, ChartColumn, FileSpreadsheet, Lightbulb, Scale, TriangleAlert, Users } from "lucide-react";
import { Batang, BarisTautan, JudulBagian, Kartu, Kepala, Kerangka, Lencana, Statistik, tabel } from "@/components/app/ui";
import { ringkasanKantor } from "@/lib/data/kantor";
import { angka, persenBulat } from "@/lib/format";
import { wajibPeran } from "@/lib/sesi";
import { hariKerjaAntara, labelPeriode, labelTanggalPanjang, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Dashboard kantor" };

export default function HalamanKantor() {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const sesi = await wajibPeran("waka", "kepala", "sekretariat", "admin");
  const r = await ringkasanKantor(sesi.kantor);

  return (
    <>
      <Kepala judul="Dashboard kantor" sub={`${labelTanggalPanjang(r.today)} · ${labelPeriode(r.periode)}`} />
      {r.k4.peringatan && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-gold-400/20 px-4 py-3 text-sm text-gold-700 dark:text-gold-100">
          <TriangleAlert className="size-4 shrink-0" /> {r.k4.penerima} dari {r.k4.total} pegawai menerima K4 bulan ini (lebih dari 20%). Periksa kembali kriteria inovasi.
        </p>
      )}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistik ikon={CalendarCheck2} nada="mint" label="Mengisi hari ini" nilai={`${r.isiHariIni}/${r.totalPegawai}`} />
        <Statistik ikon={ChartColumn} nada="brand" label="K1 berjalan kantor" nilai={angka(r.k1Kantor)} />
        <Statistik ikon={BadgeCheck} nada="gold" label="Menunggu verifikasi" nilai={r.koordinator.reduce((a, k) => a + k.n, 0) + r.antreanKeuangan + r.antreanSekretariat} />
        <Statistik ikon={Lightbulb} nada="ink" label="Penerima K4" nilai={`${r.k4.penerima}/${r.k4.total}`} href="/kantor/k4" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Kartu>
          <JudulBagian>Per bidang / unit</JudulBagian>
          {/* Ponsel: kartu; desktop: tabel */}
          <ul className="space-y-4 lg:hidden">
            {r.perUnit.map((u) => (
              <li key={u.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-heading">{u.nama}</p>
                  <p className="text-sm font-bold tabular-nums text-heading">K1 {angka(u.k1)}</p>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Hari ini {u.hariIni}/{u.anggota} · bulan ini {persenBulat(u.bulan)}
                </p>
                <Batang nilai={(u.bulan ?? 0) * 100} nada={(u.bulan ?? 0) >= 0.8 ? "mint" : "gold"} />
              </li>
            ))}
          </ul>
          <div className={`${tabel.bungkus} hidden lg:block`}>
            <table className="w-full text-sm">
              <thead className={tabel.kepala}>
                <tr>
                  <th className={tabel.th}>Bidang / unit</th>
                  <th className={`${tabel.th} text-right`}>Pegawai</th>
                  <th className={`${tabel.th} text-right`}>Isi hari ini</th>
                  <th className={tabel.th}>Pengisian bulan ini</th>
                  <th className={`${tabel.th} text-right`}>K1 berjalan</th>
                </tr>
              </thead>
              <tbody className={tabel.badan}>
                {r.perUnit.map((u) => (
                  <tr key={u.id}>
                    <td className={`${tabel.td} font-medium text-heading`}>{u.nama}</td>
                    <td className={tabel.angka}>{u.anggota}</td>
                    <td className={tabel.angka}>
                      {u.hariIni}/{u.anggota}
                    </td>
                    <td className={tabel.td}>
                      <div className="flex items-center gap-2">
                        <Batang nilai={(u.bulan ?? 0) * 100} nada={(u.bulan ?? 0) >= 0.8 ? "mint" : "gold"} className="w-32" />
                        <span className="tabular-nums">{persenBulat(u.bulan)}</span>
                      </div>
                    </td>
                    <td className={`${tabel.angka} font-semibold`}>{angka(u.k1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Target uji coba: ≥ 80% pegawai aktif mengisi per hari kerja.</p>
        </Kartu>

        <aside className="space-y-4">
          <Kartu>
            <JudulBagian>Verifikasi tertunda</JudulBagian>
            {r.koordinator.length || r.antreanKeuangan || r.antreanSekretariat ? (
              <ul className="divide-y divide-border text-sm">
                {r.koordinator.map((k) => {
                  const lama = k.tertua ? hariKerjaAntara(tanggalLokal(k.tertua, sesi.kantor), r.today, new Set()) : 0;
                  return (
                    <li key={k.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">{k.nama}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <strong className="tabular-nums">{k.n}</strong>
                        {lama > 2 && <Lencana nada="flame">{lama} hari kerja</Lencana>}
                      </span>
                    </li>
                  );
                })}
                {r.antreanKeuangan > 0 && (
                  <li className="flex justify-between py-2">
                    <span>Keuangan (SPP/SPB)</span>
                    <strong className="tabular-nums">{r.antreanKeuangan}</strong>
                  </li>
                )}
                {r.antreanSekretariat > 0 && (
                  <li className="flex justify-between py-2">
                    <span>Sekretariat (laporan bidang)</span>
                    <strong className="tabular-nums">{r.antreanSekretariat}</strong>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada antrean.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Ditandai merah bila item tertua menunggu lebih dari 2 hari kerja.</p>
          </Kartu>

          <Kartu>
            <JudulBagian>Beban rangkap vs K1</JudulBagian>
            <ul className="space-y-2 text-sm">
              {r.rangkap.map((x) => (
                <li key={x.n} className="flex items-center justify-between">
                  <span>
                    {x.n === 3 ? "3+" : x.n} penugasan <span className="text-muted-foreground">({x.jumlah} pegawai)</span>
                  </span>
                  <strong className="tabular-nums">{angka(x.k1)}</strong>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Untuk memantau apakah rata-rata sederhana merugikan pegawai dengan banyak penugasan.</p>
          </Kartu>

          <Kartu className="p-2">
            <BarisTautan href="/kantor/rekap" ikon={FileSpreadsheet} nada="brand" judul="Rekap & pengesahan IKP" />
            <BarisTautan href="/kantor/kalibrasi" ikon={Scale} nada="gold" judul="Kalibrasi K3" />
            <BarisTautan href="/kantor/k4" ikon={Lightbulb} nada="ink" judul="Penetapan K4" />
            <BarisTautan href="/verifikasi" ikon={Users} nada="mint" judul="Antrean verifikasi saya" />
          </Kartu>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/kantor/rekap" className="text-primary">
              Unduh rekap Excel
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
