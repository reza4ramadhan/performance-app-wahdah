// Tab Jurnal (docs/rombak-v2/02 bagian A.2, mockup Adm-6 & Adm-7): Jurnal kerja format isi sekaligus
// (uraian, durasi, link opsional; +0,15 poin per entri, maks. 5) dan Belajar (pengembangan diri).

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { BookOpen, NotebookPen } from "lucide-react";
import { BarisJurnalSaya, FormJurnalSekaligus, FormPdCepat, TombolHapus } from "@/components/app/form-harian";
import { ChipFilter } from "@/components/app/filter";
import { Kartu, Kerangka, Kosong } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { angka, bilangan, kelompokkan, labelDurasi, rentangJam } from "@/lib/format";
import { PARAMETER } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { hariIni, labelPeriode, labelTanggal, labelTanggalPanjang, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Jurnal" };

export default function HalamanJurnal(props: PageProps<"/jurnal">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const belajar = sp.tab === "belajar";
  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-4 space-y-3">
        <h1 className="text-xl font-bold text-heading">Jurnal</h1>
        <nav aria-label="Jenis catatan" className="grid grid-cols-2 rounded-xl bg-muted p-1">
          {[
            { href: "/jurnal", label: "Jurnal kerja", on: !belajar },
            { href: "/jurnal?tab=belajar", label: "Belajar", on: belajar },
          ].map((t) => (
            <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined} className={cn("flex h-9 items-center justify-center rounded-lg text-sm", t.on ? "bg-card font-semibold text-heading shadow-sm" : "font-medium text-muted-foreground")}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      {belajar ? <Belajar /> : <JurnalKerja periodeSp={sp.periode} />}
    </div>
  );
}

async function JurnalKerja({ periodeSp }: { periodeSp: string | string[] | undefined }) {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  const kini = periodeDari(today);
  const periode = /^\d{4}-\d{2}$/.test(String(periodeSp)) && String(periodeSp) <= kini ? String(periodeSp) : kini;
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();
  const [entri, minTanggal] = await Promise.all([
    db
      .select()
      .from(s.jurnal)
      .where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir)))
      .orderBy(desc(s.jurnal.tanggal), asc(s.jurnal.dibuatPada)),
    tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
  ]);
  // Poin tambahan K1 hanya untuk staf (SBK-JR / SK-JR).
  const staf = sesi.penugasan.some((p) => p.peranKerja === "SBK" || p.peranKerja === "SK");
  const poin = Math.min(PARAMETER.tambahan.maks, (periode === kini ? entri.length : 0) * PARAMETER.tambahan.poin);
  const hariIniEntri = entri.filter((e) => e.tanggal === today);
  const lainnya = kelompokkan(
    entri.filter((e) => e.tanggal !== today),
    (e) => e.tanggal,
  );

  const baris = (j: (typeof entri)[number]) => {
    const isi = (
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[14px] text-heading">
          {j.uraian}
          {j.link && (
            <>
              {" · "}
              <a href={j.link} target="_blank" rel="noopener noreferrer" className="text-primary">
                link
              </a>
            </>
          )}
        </span>
        <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{labelDurasi(j.durasiMenit) || rentangJam(j.jamMulai, j.jamSelesai)}</span>
      </div>
    );
    return (
      <li key={j.id} className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
        {j.tanggal >= minTanggal ? (
          <BarisJurnalSaya jurnal={j} tanggal={j.tanggal} minTanggal={minTanggal} maksTanggal={today}>
            {isi}
          </BarisJurnalSaya>
        ) : (
          isi
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {periode === kini && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-heading">{labelTanggalPanjang(today).replace(/^(\w+), (\d+) (\w{3})\w* /, "$1, $2 $3 ")}</span>
            {staf && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[12.5px] font-semibold text-brand-700 dark:text-brand-200">
                Bulan ini +{angka(poin)} / {PARAMETER.tambahan.maks} poin
              </span>
            )}
          </div>
          <FormJurnalSekaligus tanggal={today} minTanggal={minTanggal} />
          <section className="space-y-2">
            <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Sudah dicatat hari ini</h2>
            {hariIniEntri.length ? <ul className="space-y-2">{hariIniEntri.map(baris)}</ul> : <p className="text-sm text-muted-foreground">Belum ada.</p>}
          </section>
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Riwayat</h2>
        <ChipFilter pilihan={[periodeBerikut(kini, -2), periodeBerikut(kini, -1), kini].map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(p) => `/jurnal?periode=${p}`} />
        {lainnya.size ? (
          [...lainnya].map(([tgl, xs]) => (
            <div key={tgl} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">{labelTanggalPanjang(tgl)}</h3>
              <ul className="space-y-2">{xs.map(baris)}</ul>
            </div>
          ))
        ) : (
          <Kosong ikon={NotebookPen} judul="Belum ada jurnal lain bulan ini">
            Tulis pekerjaan yang diminta di luar indikator, mis. membantu kepanitiaan atau mendampingi tamu.
          </Kosong>
        )}
      </section>
    </div>
  );
}

async function Belajar() {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();
  const [rows, minTanggal] = await Promise.all([
    db
      .select()
      .from(s.pengembanganDiri)
      .where(and(eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId), gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir)))
      .orderBy(desc(s.pengembanganDiri.tanggal)),
    tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
  ]);
  const menit = rows.reduce((a, r) => a + r.durasiMenit, 0);

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">Bila bulan ini kosong, nilai K3 Pengembangan diri paling tinggi 2.</p>
      <Kartu>
        <FormPdCepat tanggal={today} minTanggal={minTanggal} />
      </Kartu>
      <section className="space-y-2">
        <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">
          Bulan ini · {rows.length} catatan · {bilangan(menit)} menit
        </h2>
        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-heading">{r.judul}</p>
                  <p className="text-[13px] text-foreground/80">{r.ringkasan}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {labelTanggal(r.tanggal)} · {labelDurasi(r.durasiMenit)}
                  </p>
                </div>
                {r.tanggal >= minTanggal && <TombolHapus id={r.id} jenis="pd" />}
              </li>
            ))}
          </ul>
        ) : (
          <Kosong ikon={BookOpen} judul="Belum ada catatan bulan ini">
            Cukup judul, durasi, dan satu kalimat ringkasan.
          </Kosong>
        )}
      </section>
    </div>
  );
}
