import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { TombolCetak } from "./tombol-cetak";
import { bolehLihatPegawai } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { hasilPeriode } from "@/lib/data/ikp";
import { angka, bilangan, persenBulat } from "@/lib/format";
import { LABEL_NILAI_K3, LABEL_PERAN_KERJA, LABEL_STATUS_PERIODE, NILAI_K3 } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { labelPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Rapor IKP" };

export default function HalamanRapor(props: PageProps<"/rapor/[periode]/[pegawaiId]">) {
  return (
    <Suspense fallback={<p>Memuat rapor…</p>}>
      <Isi params={props.params} />
    </Suspense>
  );
}

const th = "border border-neutral-300 bg-neutral-100 px-2 py-1 text-left font-semibold";
const td = "border border-neutral-300 px-2 py-1 align-top";
const tdA = `${td} text-right tabular-nums`;

async function Isi({ params }: { params: Promise<{ periode: string; pegawaiId: string }> }) {
  const { periode, pegawaiId } = await params;
  if (!/^\d{4}-\d{2}$/.test(periode)) notFound();
  const sesi = await wajibSesi();
  const db = await getDb();
  const tim = await db.selectDistinct({ id: s.penugasan.pegawaiId }).from(s.penugasan).where(eq(s.penugasan.koordinatorId, sesi.pegawaiId));
  if (!bolehLihatPegawai(sesi, pegawaiId, new Set(tim.map((t) => t.id))).boleh) notFound();

  const { hasil, status } = await hasilPeriode(periode);
  const h = hasil.find((x) => x.pegawaiId === pegawaiId);
  const [pg] = await db.select().from(s.pegawai).where(eq(s.pegawai.id, pegawaiId));
  if (!h || !pg) notFound();
  const pnIds = h.penugasan.map((p) => p.penugasanId);
  const [unit, k3, abs, k4] = await Promise.all([
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit),
    pnIds.length
      ? db
          .select({ k: s.penilaianK3, penilai: s.pegawai.nama })
          .from(s.penilaianK3)
          .innerJoin(s.pegawai, eq(s.pegawai.id, s.penilaianK3.penilaiId))
          .where(and(eq(s.penilaianK3.periodeId, periode), inArray(s.penilaianK3.penugasanId, pnIds), eq(s.penilaianK3.status, "dikirim")))
      : [],
    db.select().from(s.absensi).where(and(eq(s.absensi.periodeId, periode), eq(s.absensi.pegawaiId, pegawaiId))),
    db
      .select({ k: s.k4Pengajuan })
      .from(s.k4Pengajuan)
      .innerJoin(s.k4Pengusul, eq(s.k4Pengusul.k4Id, s.k4Pengajuan.id))
      .where(and(eq(s.k4Pengajuan.periodeId, periode), eq(s.k4Pengusul.pegawaiId, pegawaiId), inArray(s.k4Pengajuan.status, ["ditetapkan", "disahkan"]))),
  ]);
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const a = abs[0];

  return (
    <article className="space-y-5">
      <div className="flex justify-end print:hidden">
        <TombolCetak />
      </div>
      <header className="flex items-center gap-4 border-b-2 border-[#0c7883] pb-3">
        <Image src="/logo-wahdah.jpg" alt="" width={56} height={52} />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Kantor Pusat Wahdah Islamiyah</p>
          <h1 className="text-lg font-bold">Rapor Indeks Kinerja Pegawai (IKP)</h1>
          <p>
            {labelPeriode(periode)} · status {LABEL_STATUS_PERIODE[status]}
          </p>
        </div>
      </header>

      <table className="w-full border-collapse">
        <tbody>
          {[
            ["Nama", pg.nama],
            ["NIP", pg.nip ?? "—"],
            ["Status kepegawaian", pg.statusKepegawaian],
            ["Kantor", pg.kantor === "jakarta" ? "Jakarta" : "Makassar"],
          ].map(([k, v]) => (
            <tr key={k}>
              <th className={`${th} w-48`}>{k}</th>
              <td className={td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section>
        <h2 className="mb-1 font-bold">A. Capaian kerja (K1)</h2>
        {h.penugasan
          .filter((p) => p.indikator.length)
          .map((p) => (
            <table key={p.penugasanId} className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={th} colSpan={6}>
                    {LABEL_PERAN_KERJA[p.peran]} · {namaUnit.get(p.unitId)}
                    {p.bobotAlokasi ? ` · bobot ${p.bobotAlokasi}%` : ""}
                  </th>
                </tr>
                <tr>
                  <th className={th}>Indikator</th>
                  <th className={`${th} text-right`}>Target</th>
                  <th className={`${th} text-right`}>Realisasi</th>
                  <th className={`${th} text-right`}>Capaian</th>
                  <th className={`${th} text-right`}>Standar</th>
                  <th className={`${th} text-right`}>Skor</th>
                </tr>
              </thead>
              <tbody>
                {p.indikator.flatMap((i) => [
                  <tr key={i.kode}>
                    <td className={td}>
                      {i.kode} {i.nama}
                      {i.dikecualikan && <span className="text-neutral-500"> — dikecualikan ({i.alasan})</span>}
                      {i.volumeKecil && <span className="text-neutral-500"> — volume kecil</span>}
                    </td>
                    <td className={tdA}>{i.sub || i.dikecualikan ? "" : bilangan(i.target)}</td>
                    <td className={tdA}>{i.sub || i.dikecualikan ? "" : i.kode === "KSBK-2" ? angka(i.realisasi) : bilangan(i.realisasi)}</td>
                    <td className={tdA}>{i.capaian === null ? "" : persenBulat(i.capaian)}</td>
                    <td className={tdA}>{persenBulat(i.standar)}</td>
                    <td className={`${tdA} font-semibold`}>{angka(i.skor)}</td>
                  </tr>,
                  ...(i.sub ?? []).map((x) => (
                    <tr key={x.kode} className="text-neutral-600">
                      <td className={`${td} pl-6`}>
                        {x.kode} {x.nama}
                      </td>
                      <td className={tdA}>{x.dikecualikan ? "" : bilangan(x.target)}</td>
                      <td className={tdA}>{x.dikecualikan ? "" : bilangan(x.realisasi)}</td>
                      <td className={tdA}>{persenBulat(x.capaian)}</td>
                      <td className={tdA} />
                      <td className={tdA}>{angka(x.skor)}</td>
                    </tr>
                  )),
                ])}
                <tr>
                  <td className={`${td} font-semibold`} colSpan={5}>
                    K1 penugasan
                  </td>
                  <td className={`${tdA} font-bold`}>{angka(p.k1)}</td>
                </tr>
              </tbody>
            </table>
          ))}
        {h.kategori !== "umum" && <p className="text-neutral-600">{h.kategori === "pimpinan" ? "Pimpinan: dinilai K2 saja selama uji coba." : "Kepala Unit Pendukung: K1 ditunda selama uji coba."}</p>}
      </section>

      <section>
        <h2 className="mb-1 font-bold">B. Kehadiran (K2)</h2>
        {a ? (
          <p>
            Hari kerja wajib {a.hariKerjaWajib}, hadir {a.hadir}, tepat waktu {a.hadirTepatWaktu}, izin/sakit sah {a.izinSakit}
            {a.sanksiBerat ? ", ada sanksi disiplin berat" : ""}. Kehadiran {angka(h.kehadiran)}% × 0,6 + ketepatan {angka(h.ketepatan)}% × 0,4 = <strong>{angka(h.k2)}</strong>
          </p>
        ) : (
          <p>Rekap absensi belum diunggah.</p>
        )}
      </section>

      {h.kategori !== "pimpinan" && (
        <section>
          <h2 className="mb-1 font-bold">C. Perilaku (K3)</h2>
          {k3.length ? (
            k3.map(({ k, penilai }) => (
              <table key={k.id} className="mb-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Nilai (penilai: {penilai})</th>
                    <th className={`${th} w-14 text-right`}>Skor</th>
                    <th className={th}>Contoh perilaku</th>
                  </tr>
                </thead>
                <tbody>
                  {NILAI_K3.map((n) => (
                    <tr key={n}>
                      <td className={td}>{LABEL_NILAI_K3[n]}</td>
                      <td className={tdA}>{k.skor[n]}</td>
                      <td className={td}>{k.contoh[n] ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))
          ) : (
            <p>Belum ada penilaian K3 yang dikirim.</p>
          )}
          <p>
            K3 = <strong>{angka(h.k3)}</strong>
          </p>
        </section>
      )}

      {h.kategori !== "pimpinan" && (
        <section>
          <h2 className="mb-1 font-bold">D. Inovasi Plus (K4)</h2>
          {k4.length ? (
            <ul className="list-disc pl-5">
              {k4.map(({ k }) => (
                <li key={k.id}>
                  {k.judul} — tingkat {k.tingkatDitetapkan}, {k.poin} poin
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada.</p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-1 font-bold">E. Rekap</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["K1", "K2", "K3", "K4", "IKP", "IKP Akhir", "Predikat"].map((x) => (
                <th key={x} className={`${th} text-center`}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="text-center font-semibold tabular-nums">
              <td className={td}>{angka(h.k1)}</td>
              <td className={td}>{angka(h.k2)}</td>
              <td className={td}>{angka(h.k3)}</td>
              <td className={td}>{angka(h.k4)}</td>
              <td className={td}>{angka(h.ikp)}</td>
              <td className={td}>{angka(h.ikpAkhir)}</td>
              <td className={td}>{h.predikat ?? "—"}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-600">
          IKP = 0,50 × K1 + 0,25 × K2 + 0,25 × K3; IKP Akhir = IKP + K4. {h.syaratMinimum.memenuhi ? "" : `Tidak memenuhi syarat insentif: ${h.syaratMinimum.alasan.join(", ")}.`}
        </p>
      </section>

      <footer className="grid grid-cols-2 gap-8 pt-8 text-center">
        <div>
          <p>Pegawai</p>
          <p className="mt-16 border-t border-neutral-400 pt-1">{pg.nama}</p>
        </div>
        <div>
          <p>Kepala Kantor</p>
          <p className="mt-16 border-t border-neutral-400 pt-1">&nbsp;</p>
        </div>
      </footer>
    </article>
  );
}
