import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { TombolCetak } from "@/components/app/tombol-cetak";
import { bacaParam, LABEL_STATUS, labelRentang, saringPegawai } from "@/app/(app)/admin/aktivitas/param";
import { aktivitasK1, beraktivitas } from "@/lib/data/aktivitas";
import { persenBulat } from "@/lib/format";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, jamLokal, LABEL_ZONA, labelTanggalPanjang, rentangTanggal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Aktivitas K1" };

export default function HalamanCetakAktivitas(props: PageProps<"/admin/aktivitas/cetak">) {
  return (
    <Suspense fallback={<p>Memuat laporan…</p>}>
      <Isi searchParams={props.searchParams} />
    </Suspense>
  );
}

const th = "border border-neutral-300 bg-neutral-100 px-2 py-1 text-left font-semibold";
const td = "border border-neutral-300 px-2 py-1 align-top";
const tdA = `${td} text-right tabular-nums`;

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("admin");
  const today = hariIni(sesi.kantor);
  const p = bacaParam(await searchParams, today);
  const { awal, akhir } = rentangTanggal(p.rentang, p.tanggal);
  const r = await aktivitasK1(awal, akhir);
  const { filterBidang, tampil } = saringPegawai(r.pegawai, r.bidang, p);
  const harian = p.rentang === "hari";
  const sekarang = new Date();

  return (
    <article className="space-y-5">
      <div className="flex justify-end print:hidden">
        <TombolCetak />
      </div>
      <header className="flex items-center gap-4 border-b-2 border-[#0c7883] pb-3">
        <Image src="/logo-wahdah.jpg" alt="" width={56} height={52} />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Kantor Pusat Wahdah Islamiyah</p>
          <h1 className="text-lg font-bold">Laporan Aktivitas K1 Pegawai</h1>
          <p>
            {labelRentang(p)}
            {p.tampil === "bidang" ? " · per bidang kerja" : ` · per nama${filterBidang ? ` · ${filterBidang.nama}` : ""}${p.status !== "semua" ? ` · ${LABEL_STATUS[p.status]}` : ""}`}
          </p>
        </div>
      </header>

      <table className="w-full border-collapse text-center">
        <thead>
          <tr>
            {["Pegawai beraktivitas", "Item dicatat", "Tugas khusus selesai", "Entri jurnal"].map((x) => (
              <th key={x} className={`${th} text-center`}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold tabular-nums">
            <td className={td}>
              {r.total.aktif}/{r.total.pegawai} ({persenBulat(r.total.pegawai ? r.total.aktif / r.total.pegawai : null)})
            </td>
            <td className={td}>{r.total.item}</td>
            <td className={td}>{r.total.tugas}</td>
            <td className={td}>{r.total.jurnal}</td>
          </tr>
        </tbody>
      </table>

      {p.tampil === "bidang" ? (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Bidang kerja</th>
              <th className={`${th} text-right`}>Pegawai</th>
              <th className={`${th} text-right`}>Beraktivitas</th>
              <th className={`${th} text-right`}>%</th>
              <th className={`${th} text-right`}>Item</th>
              <th className={`${th} text-right`}>Tugas</th>
              <th className={`${th} text-right`}>Jurnal</th>
            </tr>
          </thead>
          <tbody>
            {r.bidang.map((b) => (
              <tr key={b.id} className="break-inside-avoid">
                <td className={td}>{b.nama}</td>
                <td className={tdA}>{b.pegawai}</td>
                <td className={tdA}>{b.aktif}</td>
                <td className={tdA}>{persenBulat(b.pegawai ? b.aktif / b.pegawai : null)}</td>
                <td className={tdA}>{b.item}</td>
                <td className={tdA}>{b.tugas}</td>
                <td className={tdA}>{b.jurnal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tampil.length ? (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-8 text-right`}>No</th>
              <th className={th}>Nama</th>
              <th className={th}>Bidang kerja</th>
              <th className={`${th} text-right`}>Item</th>
              <th className={`${th} text-right`}>Tugas</th>
              <th className={`${th} text-right`}>Jurnal</th>
              {!harian && <th className={`${th} text-right`}>Hari aktif</th>}
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((x, i) => (
              <tr key={x.id} className="break-inside-avoid">
                <td className={tdA}>{i + 1}</td>
                <td className={td}>{x.nama}</td>
                <td className={td}>{x.bidang.map((b) => b.nama).join(", ")}</td>
                <td className={tdA}>{x.item}</td>
                <td className={tdA}>{x.tugas}</td>
                <td className={tdA}>{x.jurnal}</td>
                {!harian && (
                  <td className={tdA}>
                    {x.hariAktif}/{x.hariKerja}
                  </td>
                )}
                <td className={td}>{beraktivitas(x) ? "Beraktivitas" : "Belum ada"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Tidak ada pegawai.</p>
      )}

      <footer className="space-y-1 text-xs text-neutral-600">
        <p>
          Item dihitung dari tanggal dicatat, tugas khusus dari tanggal ditandai selesai, jurnal dari tanggal jurnal (zona kantor pegawai). Kepala Kantor dan Wakil Kepala Kantor tidak
          termasuk.
          {p.tampil === "bidang" ? " Pegawai rangkap dihitung di setiap bidang tempat ia bertugas." : ""}
          {!harian && p.tampil === "nama" ? " Hari aktif = tanggal dengan aktivitas / hari kerja dalam rentang sampai hari ini." : ""}
        </p>
        <p>
          Dicetak {labelTanggalPanjang(today)} pukul {jamLokal(sekarang, sesi.kantor)} {LABEL_ZONA[sesi.kantor]} oleh {sesi.nama}.
        </p>
      </footer>
    </article>
  );
}
