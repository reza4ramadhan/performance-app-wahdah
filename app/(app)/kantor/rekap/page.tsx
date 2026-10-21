import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { Download, FileText, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Avatar, Kartu, Kepala, Kerangka, Lencana, LencanaPredikat, tabel } from "@/components/app/ui";
import { buttonVariants } from "@/components/ui/button";
import { ubahStatusPeriode } from "@/app/aksi/periode";
import { punya } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { hasilPeriode } from "@/lib/data/ikp";
import { angka } from "@/lib/format";
import { LABEL_STATUS_PERIODE, STATUS_PERIODE } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Rekap IKP" };

export default function HalamanRekap(props: PageProps<"/kantor/rekap">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("waka", "kepala", "sekretariat", "admin");
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const pilihan = [-3, -2, -1, 0].map((n) => periodeBerikut(kini, n));
  const periode = pilihan.includes(String(sp.periode)) ? String(sp.periode) : periodeBerikut(kini, -1);
  const db = await getDb();
  const [{ hasil, status, snapshot }, pegawai, unit] = await Promise.all([
    hasilPeriode(periode),
    db.select({ id: s.pegawai.id, status: s.pegawai.statusKepegawaian }).from(s.pegawai),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).orderBy(asc(s.unit.nama)),
  ]);
  const statusPg = new Map(pegawai.map((p) => [p.id, p.status]));
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const urut = [...hasil].sort((a, b) => (b.ikpAkhir ?? -1) - (a.ikpAkhir ?? -1));
  const lengkap = hasil.filter((h) => h.ikp !== null).length;
  const idx = STATUS_PERIODE.indexOf(status);

  const sekr = punya(sesi, "sekretariat");
  const kepala = punya(sesi, "kepala");
  const tombol = [
    status === "berjalan" && sekr && { langkah: "verifikasi", label: "Mulai masa verifikasi", Ikon: Lock },
    status === "verifikasi" && sekr && { langkah: "kalibrasi", label: "Tutup verifikasi → kalibrasi K3", Ikon: Lock },
    status === "kalibrasi" && sekr && { langkah: "sementara", label: "Hitung & kunci IKP sementara", Ikon: Lock },
    status === "sementara" && sekr && { langkah: "buka", label: "Buka kembali (kalibrasi)", Ikon: LockOpen },
    status === "sementara" && kepala && { langkah: "disahkan", label: "Sahkan IKP akhir", Ikon: ShieldCheck },
  ].filter((x) => !!x);

  return (
    <>
      <Kepala
        judul="Rekap IKP"
        kembali="/kantor"
        aksi={
          <a href={`/api/ekspor/rekap?periode=${periode}`} className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" /> Excel
          </a>
        }
      />
      <ChipFilter pilihan={pilihan.map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/kantor/rekap?periode=${v}`} />

      <Kartu className="mb-4">
        <ol className="mb-4 grid grid-cols-5 gap-1 text-center text-[11px] font-medium sm:text-xs">
          {STATUS_PERIODE.map((st, i) => (
            <li key={st} className="space-y-1.5">
              <span className={`block h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              <span className={i === idx ? "text-heading" : "text-muted-foreground"}>{LABEL_STATUS_PERIODE[st]}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm text-muted-foreground">
            {lengkap} dari {hasil.length} pegawai lengkap · {snapshot ? "angka dari snapshot yang dikunci" : "angka dihitung langsung"}
          </p>
          {tombol.map((t) => (
            <TombolAksi
              key={t.langkah}
              aksi={ubahStatusPeriode.bind(null, periode, t.langkah)}
              varian={t.langkah === "buka" ? "outline" : "default"}
              konfirmasi={t.langkah === "disahkan" ? "Setelah disahkan, seluruh skor dibekukan. Lanjutkan?" : `${t.label} untuk ${labelPeriode(periode)}?`}
            >
              <t.Ikon className="size-4" /> {t.label}
            </TombolAksi>
          ))}
          <a href={`/api/ekspor/jurnal?periode=${periode}`} className={buttonVariants({ variant: "ghost" })}>
            <Download className="size-4" /> Rekap jurnal
          </a>
        </div>
      </Kartu>

      {/* Ponsel: kartu ringkas */}
      <ul className="space-y-2 lg:hidden">
        {urut.map((h) => (
          <li key={h.pegawaiId}>
            <Link href={`/rapor/${periode}/${h.pegawaiId}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
              <Avatar nama={h.nama} ukuran="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-heading">{h.nama}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  K1 {angka(h.k1)} · K2 {angka(h.k2)} · K3 {angka(h.k3)} · K4 {angka(h.k4)}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-bold tabular-nums text-heading">{angka(h.ikpAkhir)}</span>
                <LencanaPredikat predikat={h.predikat} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: tabel penuh */}
      <Kartu className="hidden p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tabel.kepala}>
              <tr>
                <th className={tabel.th}>Pegawai</th>
                <th className={tabel.th}>Penugasan</th>
                <th className={`${tabel.th} text-right`}>K1</th>
                <th className={`${tabel.th} text-right`}>K2</th>
                <th className={`${tabel.th} text-right`}>K3</th>
                <th className={`${tabel.th} text-right`}>K4</th>
                <th className={`${tabel.th} text-right`}>IKP</th>
                <th className={`${tabel.th} text-right`}>IKP Akhir</th>
                <th className={tabel.th}>Predikat</th>
                <th className={tabel.th}>Syarat</th>
                <th className={tabel.th} />
              </tr>
            </thead>
            <tbody className={tabel.badan}>
              {urut.map((h) => (
                <tr key={h.pegawaiId} className="hover:bg-muted/40">
                  <td className={tabel.td}>
                    <p className="font-semibold text-heading">{h.nama}</p>
                    <p className="text-xs text-muted-foreground">{statusPg.get(h.pegawaiId)}</p>
                  </td>
                  <td className={`${tabel.td} text-xs text-muted-foreground`}>
                    {h.penugasan.map((p) => (
                      <span key={p.penugasanId} className="block">
                        {p.peran} · {namaUnit.get(p.unitId)} {p.k1 !== null && <strong className="text-foreground">({angka(p.k1)})</strong>}
                      </span>
                    ))}
                  </td>
                  <td className={tabel.angka}>{angka(h.k1)}</td>
                  <td className={tabel.angka}>{angka(h.k2)}</td>
                  <td className={tabel.angka}>{angka(h.k3)}</td>
                  <td className={tabel.angka}>{angka(h.k4)}</td>
                  <td className={tabel.angka}>{angka(h.ikp)}</td>
                  <td className={`${tabel.angka} font-bold text-heading`}>{angka(h.ikpAkhir)}</td>
                  <td className={tabel.td}>
                    <LencanaPredikat predikat={h.predikat} />
                    {h.kekurangan.length > 0 && <p className="mt-1 text-xs text-gold-700 dark:text-gold-100">{h.kekurangan[0]}</p>}
                  </td>
                  <td className={tabel.td}>{h.syaratMinimum.memenuhi ? <Lencana nada="mint">Memenuhi</Lencana> : <Lencana nada="flame">{h.syaratMinimum.alasan[0]}</Lencana>}</td>
                  <td className={tabel.td}>
                    <Link href={`/rapor/${periode}/${h.pegawaiId}`} className="inline-flex min-h-9 items-center gap-1 text-primary" aria-label={`Rapor ${h.nama}`}>
                      <FileText className="size-4" />
                    </Link>
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
