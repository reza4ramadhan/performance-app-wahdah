// Dashboard Hari Ini untuk amanah KSBK: K1 tiap SBK binaan, kegiatan SKUO bulanan, tugas khusus staf, dan verifikasi.

import Link from "next/link";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import {
  AlarmClock,
  Archive,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardPlus,
  Gauge,
  ListChecks,
  NotebookPen,
  UserRoundX,
  Users,
} from "lucide-react";
import { KartuItem } from "@/components/app/baris-item";
import { BagianJurnal, PanelPengembanganDiri, SapaanHariIni } from "@/components/app/hari-ini";
import { DaftarIndikator } from "@/components/app/rincian-ikp";
import { KartuTugas } from "@/components/app/tugas";
import { Avatar, BarisTautan, Batang, Cincin, JudulBagian, Kartu, Kosong, Lencana, PetakIkon, Statistik, TautanKecil, type Nada } from "@/components/app/ui";
import { VerifikasiMassal } from "@/components/app/verifikasi-massal";
import { pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { barisAntrean, kondisiAntrean } from "@/lib/data/antrean";
import { hasilPeriode, liburPerKantor, paramIndikator } from "@/lib/data/ikp";
import { daftarItem, kondisiItemPenugasan } from "@/lib/data/item";
import { anggotaTim } from "@/lib/data/tim";
import { daftarTugas, jumlahUsulanMenunggu, kondisiTugasMenunggu, kondisiTugasPenugasan } from "@/lib/data/tugas";
import { angka, bilangan } from "@/lib/format";
import { idPenugasan } from "@/lib/ikp/hitung";
import { rataRata } from "@/lib/ikp/k1";
import { indikatorDari } from "@/lib/ikp/katalog";
import { cn } from "@/lib/utils";
import type { Sesi } from "@/lib/sesi";
import { keUtc, labelPeriode, labelTanggal, periodeBerikut, periodeDari, rentangPeriode, tambahHari, tanggalLokal } from "@/lib/waktu";

const BELUM_SELESAI = ["belum", "dikerjakan", "ditolak"] as const;
/** Batas tampilan di dashboard; selebihnya lewat tautan ke halaman lengkap. */
const MAKS_VERIFIKASI = 8;
const MAKS_TUGAS = 6;
const WARNA_STATUS: Partial<Record<Nada, string>> = {
  mint: "text-mint-700 dark:text-mint-100",
  gold: "text-gold-700 dark:text-gold-100",
  flame: "text-flame-700 dark:text-flame-100",
  netral: "text-muted-foreground",
};

export async function HariIniKsbk({ sesi, hariIni: today, sp }: { sesi: Sesi; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const db = await getDb();
  const periode = periodeDari(today);
  const bulanDepan = periodeBerikut(periode, 1);
  const { awal, akhir } = rentangPeriode(periode);
  const pnSaya = sesi.amanahPn.map((p) => p.id);
  const bidangIds = sesi.amanahPn.filter((p) => p.peranKerja === "KSBK").map((p) => p.unitId);

  const [tim, { hasil }, param, libur, antrean, tugasMenunggu, usulanMenunggu, kegiatan, ujiPetik, itemSaya, jurnalHariIni, jurnalBulanIni, pdBulanIni] = await Promise.all([
    anggotaTim(sesi),
    hasilPeriode(periode),
    paramIndikator(db),
    liburPerKantor(db),
    kondisiAntrean(sesi).then((k) => daftarItem(k, { kantor: sesi.kantor, batas: 300 })),
    daftarTugas(kondisiTugasMenunggu(sesi.pegawaiId)),
    jumlahUsulanMenunggu(sesi.pegawaiId),
    // Kegiatan bulan ini dan bulan depan: KSBK-1c menilai input paling lambat tanggal 5.
    bidangIds.length
      ? db
          .select({ k: s.kegiatan, pj: s.pegawai.nama, skuo: s.unit.nama })
          .from(s.kegiatan)
          .leftJoin(s.pegawai, eq(s.pegawai.id, s.kegiatan.penanggungJawabId))
          .leftJoin(s.unit, eq(s.unit.id, s.kegiatan.skuoId))
          .where(and(inArray(s.kegiatan.unitId, bidangIds), gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, rentangPeriode(bulanDepan).akhir)))
          .orderBy(s.kegiatan.tanggal)
      : Promise.resolve([]),
    bidangIds.length ? db.select({ n: count() }).from(s.ujiPetikArsip).where(and(eq(s.ujiPetikArsip.periodeId, periode), inArray(s.ujiPetikArsip.unitId, bidangIds))) : Promise.resolve([{ n: 0 }]),
    daftarItem(kondisiItemPenugasan(pnSaya, ["terbuka", "ditolak"]), { kantor: sesi.kantor, batas: 10 }),
    db.select().from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), eq(s.jurnal.tanggal, today))),
    db.select({ n: count() }).from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal))),
    db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId), gte(s.pengembanganDiri.tanggal, awal))),
  ]);

  // SBK binaan amanah ini; staf yang rangkap SKUO di bidang yang sama tampil sekali (K1-nya gabungan).
  const staf = tim.map((t) => ({ ...t, sbk: t.penugasan.filter((p) => p.peranKerja === "SBK") })).filter((t) => t.sbk.length);
  const pnStaf = staf.flatMap((t) => t.sbk.map((p) => p.id));
  const kegiatanDekat = kegiatan.filter(({ k }) => k.tanggal >= tambahHari(today, -7) && k.tanggal <= tambahHari(today, 14));

  const [itemStaf, tugasStaf, itemKegiatan] = await Promise.all([
    pnStaf.length ? daftarItem(kondisiItemPenugasan(pnStaf, ["terbuka", "ditolak"]), { kantor: sesi.kantor, batas: 400 }) : Promise.resolve([]),
    pnStaf.length
      ? daftarTugas(and(kondisiTugasPenugasan(pnStaf, [...BELUM_SELESAI]), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 8), sesi.kantor))), 100)
      : Promise.resolve([]),
    kegiatanDekat.length ? daftarItem(inArray(s.item.kegiatanId, kegiatanDekat.map((x) => x.k.id)), { kantor: sesi.kantor, batas: 500 }) : Promise.resolve([]),
  ]);

  // ── K1 staf ──
  const standar = (param.get("KSBK-2")?.standar ?? 0.85) * 100;
  const itemLewat = itemStaf.filter((i) => i.lewat);
  const tugasLewat = tugasStaf.filter((t) => t.lewat);
  const k1Staf = staf
    .map((t) => {
      const ids = new Set(t.sbk.map((p) => p.id));
      const h = hasil.find((x) => x.pegawaiId === t.pegawaiId)?.penugasan.find((p) => idPenugasan(p).some((id) => ids.has(id)));
      return {
        ...t,
        k1: h?.k1 ?? null,
        indikator: h?.indikator ?? [],
        menunggu: antrean.filter((i) => i.pemilikId === t.pegawaiId).length + tugasMenunggu.filter((x) => x.stafId === t.pegawaiId).length,
        lewat: itemLewat.filter((i) => i.pemilikId === t.pegawaiId).length + tugasLewat.filter((x) => x.stafId === t.pegawaiId).length,
      };
    })
    // Yang paling perlu perhatian di atas; yang belum punya K1 di akhir.
    .sort((a, b) => (a.k1 ?? Infinity) - (b.k1 ?? Infinity) || a.nama.localeCompare(b.nama));
  const nilaiK1 = k1Staf.map((t) => t.k1).filter((k): k is number => k !== null);
  const rataK1 = rataRata(nilaiK1);
  const segmen = [
    { label: `≥ ${bilangan(standar)}`, n: nilaiK1.filter((k) => k >= standar).length, warna: "bg-mint-500" },
    { label: `70–${bilangan(standar)}`, n: nilaiK1.filter((k) => k >= 70 && k < standar).length, warna: "bg-gold-400" },
    { label: "< 70", n: nilaiK1.filter((k) => k < 70).length, warna: "bg-flame-500" },
    { label: "Belum ada", n: k1Staf.length - nilaiK1.length, warna: "bg-white/25" },
  ];

  // K1 KSBK sendiri.
  const k1Saya = hasil.find((x) => x.pegawaiId === sesi.pegawaiId)?.penugasan.find((p) => idPenugasan(p).some((id) => pnSaya.includes(id)));

  // ── Kegiatan SKUO ──
  const kegIni = kegiatan.filter(({ k }) => periodeDari(k.tanggal) === periode);
  const kegDepan = kegiatan.filter(({ k }) => periodeDari(k.tanggal) === bulanDepan);
  const statusInput = (per: string, xs: typeof kegiatan): { teks: string; nada: Nada } => {
    const batas = `${per}-05`;
    const pertama = xs.map(({ k }) => tanggalLokal(k.dibuatPada, sesi.kantor)).sort()[0];
    if (pertama) return pertama <= batas ? { teks: `Diinput ${labelTanggal(pertama)} · tepat waktu`, nada: "mint" } : { teks: `Diinput ${labelTanggal(pertama)} · lewat tgl 5`, nada: "gold" };
    if (today > batas) return { teks: "Belum diinput · tenggat terlewat", nada: "flame" };
    return { teks: `Belum diinput · tenggat ${labelTanggal(batas)}`, nada: per === periode ? "gold" : "netral" };
  };
  const bulanKegiatan = [
    { periode, n: kegIni.length, status: statusInput(periode, kegIni) },
    { periode: bulanDepan, n: kegDepan.length, status: statusInput(bulanDepan, kegDepan) },
  ];

  // ── Ringkasan ──
  const belumIsi = staf.filter((t) => !t.isiHariIni).length;
  const totalVerifikasi = antrean.length + tugasMenunggu.length + usulanMenunggu;
  const ujiPetikAda = ujiPetik[0].n > 0;
  const akhirBulan = today >= tambahHari(akhir, -7);

  return (
    <>
      <SapaanHariIni sesi={sesi} hariIni={today} sp={sp} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          {/* K1 staf bidang bulan ini */}
          <a href="#k1-staf" className="block rounded-3xl transition active:scale-[0.99]">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/20">
              <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/8" />
              <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-white/5" />
              <p className="relative text-xs font-semibold uppercase tracking-wider text-white/70">K1 staf bidang · {labelPeriode(periode)}</p>

              <div className="relative mt-4 flex items-end gap-4">
                <div>
                  <p className="text-5xl font-bold leading-none tabular-nums">{angka(rataK1)}</p>
                  <p className="mt-1.5 text-sm font-medium text-white/80">rata-rata {nilaiK1.length} SBK · acuan {bilangan(standar)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-3xl font-bold leading-none tabular-nums">{angka(k1Saya?.k1)}</p>
                  <p className="mt-1.5 text-xs text-white/70">K1 Anda</p>
                </div>
              </div>

              <div className="relative mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/15" role="img" aria-label={`${segmen[0].n} dari ${k1Staf.length} SBK memenuhi acuan K1`}>
                {k1Staf.length > 0 && segmen.filter((x) => x.n).map((x) => <span key={x.label} className={cn("h-full", x.warna)} style={{ width: `${(x.n / k1Staf.length) * 100}%` }} />)}
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
          </a>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Statistik ikon={BadgeCheck} nada="gold" label="Perlu verifikasi" nilai={totalVerifikasi} href="#verifikasi" />
            <Statistik ikon={UserRoundX} nada="brand" label="Belum mengisi" nilai={`${belumIsi}/${staf.length}`} href="/tim" />
            <Statistik ikon={AlarmClock} nada="flame" label="Lewat tenggat" nilai={itemLewat.length + tugasLewat.length} href="/tim" />
            <Statistik ikon={CalendarDays} nada="mint" label="Kegiatan bulan ini" nilai={kegIni.length} href="/tim/kegiatan" />
          </div>

          {/* Aksi cepat */}
          <section aria-label="Aksi cepat">
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/verifikasi", label: "Verifikasi", ikon: BadgeCheck, nada: "gold" as const },
                { href: "/tim/kegiatan", label: "Kegiatan", ikon: CalendarPlus, nada: "mint" as const },
                { href: "/tim/tugas", label: "Beri tugas", ikon: ClipboardPlus, nada: "ink" as const },
                { href: "/tim", label: "Tim", ikon: Users, nada: "brand" as const },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 text-xs font-medium text-foreground transition active:scale-95">
                  <PetakIkon ikon={a.ikon} nada={a.nada} besar />
                  {a.label}
                </Link>
              ))}
            </div>
          </section>

          {/* 1. K1 per SBK */}
          <section id="k1-staf" className="scroll-mt-6">
            <JudulBagian aksi={<TautanKecil href="/tim">Tim hari ini</TautanKecil>}>Kinerja K1 staf</JudulBagian>
            {k1Staf.length ? (
              <Kartu className="p-1.5">
                <ul className="divide-y divide-border/70">
                  {k1Staf.map((t) => (
                    <li key={t.pegawaiId}>
                      <details className="group">
                        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
                          <span className="relative">
                            <Avatar nama={t.nama} ukuran="sm" />
                            {!t.isiHariIni && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-gold-500 ring-2 ring-card" title="Belum mengisi hari ini" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-[15px] font-medium text-heading">{t.nama}</span>
                              <span className={cn("shrink-0 text-base font-bold tabular-nums", t.k1 === null ? "text-muted-foreground" : "text-heading")}>{angka(t.k1)}</span>
                            </span>
                            <Batang nilai={t.k1} className="mt-1.5" nada={t.k1 === null ? "brand" : t.k1 >= standar ? "mint" : t.k1 >= 70 ? "gold" : "flame"} />
                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="mr-0.5 truncate">{t.sbk.map((p) => p.unitNama).join(", ")}</span>
                              {t.menunggu > 0 && <Lencana nada="gold">{t.menunggu} menunggu</Lencana>}
                              {t.lewat > 0 && <Lencana nada="flame">{t.lewat} lewat tenggat</Lencana>}
                            </span>
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                        </summary>
                        <div className="px-2.5 pt-1 pb-3">
                          {t.indikator.length ? <DaftarIndikator indikator={t.indikator} ringkas /> : <p className="text-sm text-muted-foreground">Belum ada indikator yang bisa dihitung bulan ini.</p>}
                          <div className="mt-3 flex flex-wrap gap-x-4">
                            <TautanKecil href={`/tim/jurnal?pegawai=${t.pegawaiId}`}>Jurnal</TautanKecil>
                            <TautanKecil href={`/tim/k3/${t.pegawaiId}`}>Penilaian K3</TautanKecil>
                            <TautanKecil href={`/rapor/${periode}/${t.pegawaiId}`}>Rapor</TautanKecil>
                          </div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </Kartu>
            ) : (
              <Kosong ikon={Users} judul="Belum ada SBK di bawah koordinasi Anda">
                Staf muncul di sini setelah Admin menetapkan Anda sebagai koordinator penugasan SBK mereka.
              </Kosong>
            )}
          </section>

          {/* 2. Kegiatan SKUO */}
          <section>
            <JudulBagian aksi={<TautanKecil href="/tim/kegiatan">Input kegiatan</TautanKecil>}>Kegiatan SKUO</JudulBagian>
            <div className="grid grid-cols-2 gap-3">
              {bulanKegiatan.map((b) => (
                <Link key={b.periode} href={`/tim/kegiatan?periode=${b.periode}`} className="block rounded-2xl transition active:scale-[0.98]">
                  <Kartu className="h-full p-3.5">
                    <p className="text-xs font-medium text-muted-foreground">{labelPeriode(b.periode)}</p>
                    <p className="text-xl font-bold tabular-nums text-heading">
                      {b.n} <span className="text-sm font-medium text-muted-foreground">kegiatan</span>
                    </p>
                    <p className={cn("mt-1 text-xs font-medium", WARNA_STATUS[b.status.nada])}>{b.status.teks}</p>
                  </Kartu>
                </Link>
              ))}
            </div>
            {kegiatanDekat.length > 0 && (
              <Kartu className="mt-3 p-1.5">
                <p className="px-2.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sepekan lalu – dua pekan ke depan</p>
                <ul className="divide-y divide-border/70">
                  {kegiatanDekat.map(({ k, pj, skuo }) => {
                    const [tgl, bln] = labelTanggal(k.tanggal).split(" ");
                    const items = itemKegiatan.filter((i) => i.kegiatanId === k.id);
                    const beres = items.filter((i) => i.status === "disetujui").length;
                    const lewat = items.filter((i) => i.lewat).length;
                    return (
                      <li key={k.id} className="flex min-h-14 items-center gap-3 px-2.5 py-2">
                        <span className={cn("grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center leading-tight", k.tanggal === today ? "bg-primary/12" : "bg-muted")}>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">{bln}</span>
                          <span className="text-base font-bold tabular-nums text-heading">{tgl}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-heading">{k.nama}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[skuo, pj ? `PJ ${pj}` : "Tanpa PJ"].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {lewat > 0 ? (
                          <Lencana nada="flame">{lewat} lewat</Lencana>
                        ) : items.length ? (
                          <Lencana nada={beres === items.length ? "mint" : "netral"}>
                            {beres}/{items.length} item
                          </Lencana>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Kartu>
            )}
          </section>

          {/* 3. Tugas khusus staf */}
          <section>
            <JudulBagian aksi={<TautanKecil href="/tim/tugas">Beri tugas</TautanKecil>}>Tugas khusus staf</JudulBagian>
            {tugasStaf.length ? (
              <>
                <ul className="space-y-2">
                  {[...tugasLewat, ...tugasStaf.filter((t) => !t.lewat)].slice(0, MAKS_TUGAS).map((t) => (
                    <li key={t.id}>
                      <KartuTugas tugas={t} sebagai="pemberi" tampilStaf />
                    </li>
                  ))}
                </ul>
                {tugasStaf.length > MAKS_TUGAS && (
                  <div className="mt-1 text-right">
                    <TautanKecil href="/tim/tugas">+{tugasStaf.length - MAKS_TUGAS} tugas lainnya</TautanKecil>
                  </div>
                )}
              </>
            ) : (
              <Kosong ikon={ClipboardCheck} judul="Tidak ada tugas staf yang jatuh tempo sepekan ini">
                Beri tugas ber-tenggat kepada SBK; tugas yang selesai tepat waktu dan Anda setujui menambah K1 mereka.
              </Kosong>
            )}
          </section>

          <BagianJurnal hariIni={today} entri={jurnalHariIni} jumlahBulanIni={jurnalBulanIni[0].n} poin={false} />
        </div>

        <aside className="space-y-4">
          {/* 4. Verifikasi */}
          <section id="verifikasi" className="scroll-mt-6">
            <JudulBagian aksi={antrean.length > MAKS_VERIFIKASI ? <TautanKecil href="/verifikasi">Semua ({antrean.length})</TautanKecil> : undefined}>
              Menunggu verifikasi{totalVerifikasi ? ` · ${totalVerifikasi}` : ""}
            </JudulBagian>
            <div className="space-y-3">
              {usulanMenunggu > 0 && (
                <Kartu className="p-2">
                  <BarisTautan href="/tim/tugas" ikon={ClipboardCheck} nada="ink" judul="Usulan tugas" sub="Menunggu persetujuan Anda" kanan={<Lencana nada="gold">{usulanMenunggu}</Lencana>} />
                </Kartu>
              )}
              {tugasMenunggu.length > 0 && (
                <ul className="space-y-2">
                  {tugasMenunggu.slice(0, 3).map((t) => (
                    <li key={t.id}>
                      <KartuTugas tugas={t} sebagai="pemberi" tampilStaf />
                    </li>
                  ))}
                  {tugasMenunggu.length > 3 && (
                    <li className="text-right">
                      <TautanKecil href="/tim/tugas">+{tugasMenunggu.length - 3} tugas lainnya</TautanKecil>
                    </li>
                  )}
                </ul>
              )}
              {antrean.length > 0 && <VerifikasiMassal items={barisAntrean(antrean, sesi, libur(sesi.kantor)).slice(0, MAKS_VERIFIKASI)} />}
              {!totalVerifikasi && (
                <Kosong ikon={BadgeCheck} judul="Semua sudah diverifikasi">
                  Item dan tugas yang ditandai selesai oleh staf akan muncul di sini.
                </Kosong>
              )}
            </div>
          </section>

          {/* K1 Anda sebagai KSBK */}
          <Kartu>
            <Link href="/progres" className="flex items-center gap-4">
              <Cincin nilai={k1Saya?.k1 ?? null} ukuran={72} tebal={8} label={`K1 Anda ${angka(k1Saya?.k1)}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">K1 Anda · KSBK</span>
                <span className="mt-1 block space-y-1">
                  {(k1Saya?.indikator ?? []).map((i) => (
                    <span key={i.kode} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">{indikatorDari(i.kode)?.pendek ?? i.nama}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-heading">{angka(i.skor)}</span>
                    </span>
                  ))}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </Kartu>

          <Kartu className="p-2">
            <BarisTautan
              href="/tim/uji-petik"
              ikon={Archive}
              nada={ujiPetikAda ? "mint" : akhirBulan ? "gold" : "netral"}
              judul="Uji petik arsip"
              sub={ujiPetikAda ? `Sudah diisi untuk ${labelPeriode(periode)}` : akhirBulan ? "Belum diisi; isi sebelum akhir bulan" : "Diisi di akhir bulan (KSBK-1e)"}
            />
          </Kartu>

          {itemSaya.length > 0 && (
            <section>
              <JudulBagian aksi={<TautanKecil href="/item">Semua</TautanKecil>}>Item Anda terbuka</JudulBagian>
              <ul className="space-y-2">
                {itemSaya.slice(0, 3).map((i) => (
                  <li key={i.id}>
                    <KartuItem item={i} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pimpinan(sesi) && (
            <Kartu className="p-2">
              <BarisTautan href="/kantor" ikon={Gauge} nada="ink" judul="Dashboard kantor" sub="Pengisian & K1 berjalan per bidang" />
            </Kartu>
          )}

          <Kartu className="p-2">
            <BarisTautan href="/tim/catatan" ikon={NotebookPen} nada="netral" judul="Catatan perilaku" sub="Bahan penilaian K3 staf" />
            <BarisTautan href="/tim/k3" ikon={ListChecks} nada="netral" judul="Penilaian K3" sub="Nilai staf di akhir bulan" />
            <BarisTautan href="/tim/jurnal" ikon={BookOpen} nada="netral" judul="Jurnal staf" />
          </Kartu>

          <PanelPengembanganDiri hariIni={today} jumlahBulanIni={pdBulanIni[0].n} />
        </aside>
      </div>
    </>
  );
}
