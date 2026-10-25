// Dashboard Hari Ini untuk amanah Staf Khusus: berpusat pada tugas khusus (K1 SK-TK), usulan tugas, dan jurnal.

import Link from "next/link";
import { and, count, eq, gt, gte, inArray, lte } from "drizzle-orm";
import { AlarmClock, BookOpen, CalendarClock, ChevronRight, CircleCheck, ClipboardCheck, Clock3, Gauge, Hourglass, ListPlus, NotebookPen, Users } from "lucide-react";
import { BagianJurnal, PanelPengembanganDiri, SapaanHariIni } from "@/components/app/hari-ini";
import { KartuTugas } from "@/components/app/tugas";
import { BarisTautan, JudulBagian, Kartu, Kosong, Lencana, PetakIkon, Statistik, TautanKecil } from "@/components/app/ui";
import { pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { daftarTugas, daftarUsulan, kondisiTugasPenugasan, kondisiUsulanPenugasan, ringkasTugas } from "@/lib/data/tugas";
import { cn } from "@/lib/utils";
import type { Sesi } from "@/lib/sesi";
import { jamLokal, keUtc, labelPeriode, labelTanggal, LABEL_ZONA, periodeDari, rentangPeriode, tambahHari, tanggalLokal } from "@/lib/waktu";

const BELUM_SELESAI = ["belum", "dikerjakan", "ditolak"] as const;

export async function HariIniSk({ sesi, amanah, hariIni: today, sp }: { sesi: Sesi; amanah: NonNullable<Sesi["amanah"]>; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const db = await getDb();
  const periode = periodeDari(today);
  const { awal } = rentangPeriode(periode);
  const pnIds = [amanah.id];
  const awalHari = keUtc(today, sesi.kantor);
  const akhirHari = keUtc(tambahHari(today, 1), sesi.kantor);

  const [ringkas, fokus, berikutnya, usulan, diperbaruiHariIni, jurnalHariIni, jurnalBulanIni, pdBulanIni] = await Promise.all([
    ringkasTugas(pnIds, periode),
    // Jatuh tempo hari ini, ditambah yang sudah lewat tenggat tetapi belum selesai.
    daftarTugas(and(kondisiTugasPenugasan(pnIds, [...BELUM_SELESAI]), lte(s.tugasKhususJadwal.tenggat, akhirHari)), 20),
    daftarTugas(and(kondisiTugasPenugasan(pnIds, [...BELUM_SELESAI]), gt(s.tugasKhususJadwal.tenggat, akhirHari), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 8), sesi.kantor))), 6),
    daftarUsulan(and(kondisiUsulanPenugasan(pnIds, ["diajukan", "ditolak"]), gte(s.usulanTugas.dibuatPada, keUtc(tambahHari(today, -30), sesi.kantor))), 50),
    db
      .select({ n: count() })
      .from(s.tugasKhususJadwal)
      .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
      .where(and(inArray(s.tugasKhusus.penugasanId, pnIds), gte(s.tugasKhususJadwal.diubahPada, awalHari), lte(s.tugasKhususJadwal.diubahPada, akhirHari))),
    db.select().from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), eq(s.jurnal.tanggal, today))),
    db.select({ n: count() }).from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal))),
    db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId), gte(s.pengembanganDiri.tanggal, awal))),
  ]);

  // Selesai = disetujui atasan; menunggu = semua jadwal bulan ini yang belum disetujui.
  const total = Object.values(ringkas).reduce((a, n) => a + n, 0);
  const selesai = ringkas.disetujui;
  const menunggu = total - selesai;
  const capaian = total ? Math.round((selesai / total) * 100) : null;
  const lewat = fokus.filter((t) => t.lewat);
  const hariIniSaja = fokus.filter((t) => !t.lewat);
  const usulanMenunggu = usulan.filter((u) => u.status === "diajukan");
  const usulanDitolak = usulan.filter((u) => u.status === "ditolak").slice(0, 3);
  const sudahIsi = diperbaruiHariIni[0].n > 0 || jurnalHariIni.length > 0;

  // Batang bertumpuk: urutan dari yang paling dekat selesai.
  const segmen = [
    { label: "Selesai", n: ringkas.disetujui, warna: "bg-mint-500" },
    { label: "Diverifikasi", n: ringkas.diajukan, warna: "bg-gold-400" },
    { label: "Dikerjakan", n: ringkas.dikerjakan, warna: "bg-white/70" },
    { label: "Belum", n: ringkas.belum + ringkas.ditolak, warna: "bg-white/25" },
  ];

  return (
    <>
      <SapaanHariIni sesi={sesi} hariIni={today} sp={sp} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5">
          {/* Selesai / menunggu bulan ini */}
          <Link href="/tugas" className="block rounded-3xl transition active:scale-[0.99]">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/20">
              <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/8" />
              <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-white/5" />
              <div className="relative flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Tugas khusus · {labelPeriode(periode)}</p>
                <p className="flex items-center gap-1.5 text-xs text-white/80">
                  {sudahIsi ? <CircleCheck className="size-3.5 text-mint-100" /> : <Clock3 className="size-3.5 text-gold-400" />}
                  {sudahIsi ? "Sudah mengisi hari ini" : "Belum ada isian hari ini"}
                </p>
              </div>

              <div className="relative mt-4 flex items-end gap-4">
                <div>
                  <p className="text-5xl font-bold leading-none tabular-nums">{selesai}</p>
                  <p className="mt-1.5 text-sm font-medium text-white/80">selesai</p>
                </div>
                <span aria-hidden className="pb-7 text-4xl font-extralight leading-none text-white/40">
                  /
                </span>
                <div>
                  <p className="text-5xl font-bold leading-none tabular-nums text-white/85">{menunggu}</p>
                  <p className="mt-1.5 text-sm font-medium text-white/80">menunggu</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-3xl font-bold leading-none tabular-nums">{capaian === null ? "—" : `${capaian}%`}</p>
                  <p className="mt-1.5 text-xs text-white/70">dari {total} jadwal</p>
                </div>
              </div>

              <div className="relative mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/15" role="img" aria-label={`${selesai} selesai dari ${total} jadwal tugas`}>
                {total > 0 && segmen.filter((x) => x.n).map((x) => <span key={x.label} className={cn("h-full", x.warna)} style={{ width: `${(x.n / total) * 100}%` }} />)}
              </div>
              <ul className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
                {segmen.map((x) => (
                  <li key={x.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", x.warna)} />
                    {x.label} <span className="font-semibold tabular-nums text-white">{x.n}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Link>

          <div className="grid grid-cols-3 gap-2.5">
            <Statistik ikon={CalendarClock} nada="brand" label="Hari ini" nilai={hariIniSaja.length} href="/tugas" />
            <Statistik ikon={Hourglass} nada="gold" label="Diverifikasi" nilai={ringkas.diajukan} href="/tugas" />
            <Statistik ikon={AlarmClock} nada="flame" label="Terlambat" nilai={lewat.length} href="/tugas" />
          </div>

          {/* Aksi cepat */}
          <section aria-label="Aksi cepat">
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/tugas", label: "Tugas", ikon: ClipboardCheck, nada: "brand" as const },
                { href: "/tugas/usulan", label: "Usulkan", ikon: ListPlus, nada: "ink" as const },
                { href: "/jurnal", label: "Jurnal", ikon: NotebookPen, nada: "gold" as const },
                { href: "/pengembangan-diri", label: "Belajar", ikon: BookOpen, nada: "mint" as const },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 text-xs font-medium text-foreground transition active:scale-95">
                  <PetakIkon ikon={a.ikon} nada={a.nada} besar />
                  {a.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Fokus hari ini */}
          <section>
            <JudulBagian aksi={<TautanKecil href="/tugas">Semua tugas</TautanKecil>}>Fokus hari ini</JudulBagian>
            {fokus.length ? (
              <ul className="space-y-2">
                {[...lewat, ...hariIniSaja].map((t) => (
                  <li key={t.id}>
                    <KartuTugas tugas={t} sebagai="staf" />
                  </li>
                ))}
              </ul>
            ) : (
              <Kosong ikon={CircleCheck} judul="Tidak ada tugas jatuh tempo hari ini">
                {total ? "Lanjutkan tugas berikutnya, atau usulkan tugas yang sedang Anda kerjakan." : "Belum ada tugas bulan ini. Usulkan tugas yang Anda kerjakan agar tercatat dan dinilai."}
              </Kosong>
            )}
          </section>

          {/* Sepekan ke depan */}
          {berikutnya.length > 0 && (
            <section>
              <JudulBagian>Sepekan ke depan</JudulBagian>
              <Kartu className="p-1.5">
                <ul className="divide-y divide-border/70">
                  {berikutnya.map((t) => {
                    const [tgl, bln] = labelTanggal(tanggalLokal(t.tenggat, t.kantor)).split(" ");
                    return (
                      <li key={t.id}>
                        <Link href={`/tugas#${t.id}`} className="flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-muted/60">
                          <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-muted py-1 text-center leading-tight">
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">{bln}</span>
                            <span className="text-base font-bold tabular-nums text-heading">{tgl}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium text-heading">{t.judul}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              pukul {jamLokal(t.tenggat, t.kantor)} {LABEL_ZONA[t.kantor]}
                              {t.status === "dikerjakan" && ` · ${t.persen}%`}
                            </span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Kartu>
            </section>
          )}

          <BagianJurnal hariIni={today} entri={jurnalHariIni} jumlahBulanIni={jurnalBulanIni[0].n} poin />
        </div>

        <aside className="space-y-4">
          {/* Usulan tugas */}
          <Kartu className="p-2">
            <BarisTautan
              href="/tugas/usulan"
              ikon={ListPlus}
              nada="ink"
              judul="Usulan tugas"
              sub={usulanMenunggu.length ? "Menunggu persetujuan atasan" : "Ajukan satu atau banyak tugas sekaligus"}
              kanan={usulanMenunggu.length ? <Lencana nada="gold">{usulanMenunggu.length} menunggu</Lencana> : undefined}
            />
            {usulanDitolak.length > 0 && (
              <ul className="mx-1 mt-1 space-y-1.5 border-t border-border px-2 pt-2.5 pb-1.5">
                {usulanDitolak.map((u) => (
                  <li key={u.id} className="text-xs">
                    <span className="font-medium text-heading">{u.judul}</span>
                    <span className="block text-flame-600">Ditolak: {u.alasanTolak}</span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
          {sesi.tim.length > 0 && (
            <Kartu className="p-2">
              <BarisTautan href="/tim" ikon={Users} nada="brand" judul="Tim hari ini" sub="Pengisian & verifikasi staf" />
            </Kartu>
          )}
          {pimpinan(sesi) && (
            <Kartu className="p-2">
              <BarisTautan href="/kantor" ikon={Gauge} nada="ink" judul="Dashboard kantor" sub="Pengisian & K1 berjalan per bidang" />
            </Kartu>
          )}
          <PanelPengembanganDiri hariIni={today} jumlahBulanIni={pdBulanIni[0].n} />
        </aside>
      </div>
    </>
  );
}
