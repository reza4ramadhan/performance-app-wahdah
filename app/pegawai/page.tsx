import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Ikon } from "../components/ikon";
import { labelPenugasan } from "../components/label";
import { Avatar, Kerangka, KepalaHalaman, Kosong, LencanaPredikat, Panel, kelasInput, tabel } from "../components/ui";
import { getDb, hasilPeriode, periodeAktif } from "@/lib/data/store";
import { angka, labelPeriode, rupiah } from "@/lib/format";
import { DAFTAR_PREDIKAT } from "@/lib/kpi/types";

export const metadata: Metadata = { title: "Pegawai" };

const FILTER = ["Semua", ...DAFTAR_PREDIKAT, "Belum lengkap", "Gugur syarat"] as const;

export default function Halaman(props: PageProps<"/pegawai">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const filter = FILTER.find((f) => f === sp.predikat) ?? "Semua";

  const db = await getDb();
  const periode = periodeAktif(db);
  const namaUnit = new Map(db.units.map((u) => [u.id, u.nama]));
  const semua = hasilPeriode(db, periode.id);

  const cocok = semua
    .filter((h) => !q || `${h.nama} ${labelPenugasan(h, namaUnit)}`.toLowerCase().includes(q.toLowerCase()))
    .filter((h) => {
      if (filter === "Semua") return true;
      if (filter === "Belum lengkap") return !h.hanyaK2 && h.ikpAkhir === null;
      if (filter === "Gugur syarat") return h.ikpAkhir !== null && !h.syarat.lolos;
      return h.predikat === filter;
    });

  const tautan = (f: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (f !== "Semua") p.set("predikat", f);
    const s = p.toString();
    return s ? `/pegawai?${s}` : "/pegawai";
  };

  return (
    <>
      <KepalaHalaman judul="Pegawai" sub={`Rekap IKP ${labelPeriode(periode.id)} per pegawai. Klik nama untuk melihat rincian sampai ke indikator.`} />

      <Panel rapat>
        <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
          <Form action="/pegawai" className="relative md:w-72">
            {filter !== "Semua" && <input type="hidden" name="predikat" value={filter} />}
            <Ikon nama="cari" className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted" />
            <label htmlFor="q" className="sr-only">
              Cari pegawai
            </label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Cari nama atau unit…" className={`${kelasInput} pl-9`} />
          </Form>
          <nav aria-label="Saring predikat" className="flex flex-wrap gap-1.5">
            {FILTER.map((f) => (
              <Link
                key={f}
                href={tautan(f)}
                aria-current={f === filter ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  f === filter ? "bg-brand-600 text-white ring-brand-600" : "text-muted ring-line hover:bg-surface-2 hover:text-body"
                }`}
              >
                {f}
              </Link>
            ))}
          </nav>
        </div>

        {cocok.length === 0 ? (
          <div className="px-5 pb-5">
            <Kosong>Tidak ada pegawai yang cocok{q ? ` dengan “${q}”` : ""}.</Kosong>
          </div>
        ) : (
          <div className={tabel.bungkus}>
            <table className="w-full min-w-[860px] text-sm">
              <thead className={tabel.kepala}>
                <tr>
                  <th className={tabel.th}>Pegawai</th>
                  <th className={`${tabel.th} text-right`}>K1</th>
                  <th className={`${tabel.th} text-right`}>K2</th>
                  <th className={`${tabel.th} text-right`}>K3</th>
                  <th className={`${tabel.th} text-right`}>K4</th>
                  <th className={`${tabel.th} text-right`}>IKP Akhir</th>
                  <th className={tabel.th}>Predikat</th>
                  <th className={`${tabel.th} text-right`}>Tunjangan</th>
                </tr>
              </thead>
              <tbody className={tabel.badan}>
                {cocok.map((h) => (
                  <tr key={h.pegawaiId} className="transition hover:bg-surface-2/60">
                    <td className={tabel.td}>
                      <Link href={`/pegawai/${h.pegawaiId}`} className="group flex items-center gap-3">
                        <Avatar nama={h.nama} ukuran="sm" />
                        <span>
                          <span className="block font-semibold text-ink group-hover:text-brand-600 group-hover:underline">{h.nama}</span>
                          <span className="block text-xs text-muted">{labelPenugasan(h, namaUnit)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={tabel.angka}>{angka(h.k1)}</td>
                    <td className={tabel.angka}>{angka(h.k2)}</td>
                    <td className={tabel.angka}>{angka(h.k3)}</td>
                    <td className={tabel.angka}>{h.hanyaK2 ? "—" : angka(h.k4)}</td>
                    <td className={`${tabel.angka} font-semibold text-ink`}>{angka(h.ikpAkhir)}</td>
                    <td className={tabel.td}>
                      <LencanaPredikat predikat={h.predikat} />
                      {!h.hanyaK2 && h.kekurangan.length > 0 && <p className="mt-1 text-xs text-gold-700 dark:text-gold-300">{h.kekurangan[0]}</p>}
                    </td>
                    <td className={tabel.angka}>
                      {rupiah(h.tunjangan)}
                      {h.ikpAkhir !== null && !h.syarat.lolos && <p className="mt-1 text-xs text-flame-700 dark:text-flame-300">{h.syarat.alasan.join("; ")}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-xs text-muted">
          Menampilkan {cocok.length} dari {semua.length} pegawai aktif.
        </p>
      </Panel>
    </>
  );
}
