// Tab Tugas koordinator (docs/rombak-v2/04 bagian A.1, mockup Kor-1): segmen Saya | Tim. Segmen Tim terbuka
// bawaan bila ada pekerjaan staf yang menunggu diperiksa; selain itu Saya.

import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardCheck, Folder, Send, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/app/ui";
import { idKoordinator } from "@/lib/akses";
import { jumlahAntrean } from "@/lib/data/antrean";
import { liburPerKantor } from "@/lib/data/ikp";
import { muatTimKoordinator, unitKoordinator } from "@/lib/data/tim-koordinator";
import { muatTimRutin, unitRutin } from "@/lib/data/tim-rutin";
import { jumlahTugasMenunggu } from "@/lib/data/tugas";
import { getDb } from "@/lib/db";
import { angka } from "@/lib/format";
import { jendelaAkhirBulan } from "@/lib/jendela";
import type { Sesi } from "@/lib/sesi";
import { unitPendek } from "@/lib/tugas-saya";
import { cn } from "@/lib/utils";
import { labelPeriode, labelTanggal } from "@/lib/waktu";
import { TugasSaya } from "./tugas-saya";

export async function TugasKoordinator({ sesi, hariIni, sp }: { sesi: Sesi; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const [nItem, nTugas] = await Promise.all([jumlahAntrean(sesi), jumlahTugasMenunggu(idKoordinator(sesi))]);
  const nPeriksa = nItem + nTugas;
  const segmen = sp.segmen === "saya" || sp.segmen === "tim" ? sp.segmen : nPeriksa ? "tim" : "saya";
  const unit = unitKoordinator(sesi);
  const wakil = sesi.wakilDari && sesi.wakilDari.size > 0;
  const sub = `${wakil ? "Wakil Koordinator" : "Koordinator"} · ${unit.map((u) => u.unitNama).join(", ")}`;
  const tab = <Segmen aktif={segmen} nTim={nPeriksa} />;
  if (segmen === "saya") return <TugasSaya sesi={sesi} hariIni={hariIni} sp={sp} segmen={tab} sub={sub} dasar="/?segmen=saya&" />;
  // Unit tugas rutin (N–R): Set Tugas & Atur Tugas Staf menggantikan Jadwal dan Manage tim.
  if (unitRutin(sesi).length) return <SegmenTimRutin sesi={sesi} sub={sub} tab={tab} />;
  return <SegmenTim sesi={sesi} hariIni={hariIni} sub={sub} tab={tab} />;
}

function Segmen({ aktif, nTim }: { aktif: string; nTim: number }) {
  return (
    <nav aria-label="Segmen tugas" className="mb-4 grid grid-cols-2 rounded-xl bg-muted p-1">
      {[
        { id: "saya", label: "Saya" },
        { id: "tim", label: "Tim" },
      ].map((t) => (
        <Link
          key={t.id}
          href={`/?segmen=${t.id}`}
          aria-current={aktif === t.id ? "page" : undefined}
          className={cn("flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm", aktif === t.id ? "bg-card font-semibold text-heading shadow-sm" : "font-medium text-muted-foreground")}
        >
          {t.label}
          {t.id === "tim" && nTim > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-flame-600 px-1 text-[11px] font-semibold text-white">{nTim}</span>}
        </Link>
      ))}
    </nav>
  );
}

async function SegmenTim({ sesi, hariIni, sub, tab }: { sesi: Sesi; hariIni: string; sub: string; tab: React.ReactNode }) {
  const db = await getDb();
  const [t, libur] = await Promise.all([muatTimKoordinator(sesi), liburPerKantor(db)]);
  const jendela = jendelaAkhirBulan(hariIni, libur(sesi.kantor));
  // Wakil Koordinator tidak mengisi K3 (kecuali ia juga koordinator penugasan lain).
  const penilai = !sesi.wakilDari?.size || sesi.binaan.some((b) => b.koordinatorId === sesi.pegawaiId);
  const r = t.rencana;

  return (
    <div className="mx-auto max-w-xl pb-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
          <h1 className="text-xl font-bold text-heading">Tugas</h1>
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" />
        </Link>
      </header>
      {tab}

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Link href="/tim/verifikasi" className="flex flex-col gap-px rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
            <span className="text-xl font-bold tabular-nums">{t.perluDiperiksa}</span>
            <span className="text-xs font-medium">Perlu diperiksa</span>
          </Link>
          <a href="#staf" className="flex flex-col gap-px rounded-xl bg-flame-500/10 px-3 py-2.5 text-flame-700 dark:text-flame-100">
            <span className="text-xl font-bold tabular-nums">{t.terlambat}</span>
            <span className="text-xs font-medium">Terlambat</span>
          </a>
          <Link href="/tim/verifikasi#pending" className="flex flex-col gap-px rounded-xl bg-gold-400/25 px-3 py-2.5 text-gold-700 dark:text-gold-100">
            <span className="text-xl font-bold tabular-nums">{t.pendingDana}</span>
            <span className="text-xs font-medium">Pending dana</span>
          </Link>
        </div>

        {r && r.belum > 0 && (
          <Link href={`/tim/kegiatan?periode=${r.periode}`} className="flex items-center gap-3 rounded-2xl border border-gold-400/60 bg-gold-400/15 px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-heading">
                Rencana {labelPeriode(r.periode).split(" ")[0]}: {r.total} kegiatan
              </span>
              <span className="block text-[12.5px] text-gold-700 dark:text-gold-100">
                {r.dikonfirmasi} sudah dikonfirmasi · batas {labelTanggal(r.batas)}
              </span>
            </span>
            <span className="inline-flex h-9 items-center rounded-xl bg-heading px-3 text-[13px] font-semibold text-white dark:bg-primary">Konfirmasi</span>
          </Link>
        )}

        <nav aria-label="Fungsi koordinator" className="grid grid-cols-2 gap-2.5">
          <Ubin href="/tim/verifikasi" ikon={ClipboardCheck} judul="Verifikasi" sub={t.perluDiperiksa ? `${t.perluDiperiksa} menunggu` : "Tidak ada antrean"} />
          <Ubin href="/tim/kegiatan" ikon={CalendarDays} judul="Jadwal" sub="Konfirmasi rencana" />
          <Ubin href="/tim/tugas" ikon={Send} judul="Delegasi" sub={t.delegasiBerjalan ? `${t.delegasiBerjalan} berjalan` : "Beri tugas staf"} />
          <Ubin href="/tim/plot" ikon={Users} judul="Manage tim" sub={t.tanpaPj ? `${t.tanpaPj} departemen tanpa PJ` : "Plot staf ke departemen"} peringatan={t.tanpaPj > 0} />
        </nav>

        {jendela.periode && (
          <section className="rounded-2xl border border-border bg-card p-3.5">
            <h2 className="text-sm font-semibold text-heading">Kartu Penilaian {labelPeriode(jendela.periode)}</h2>
            <p className="mb-2 text-[12.5px] text-muted-foreground">Terbuka s.d. {labelTanggal(jendela.akhir)}.</p>
            <ul className="divide-y divide-border/60 text-sm">
              {penilai && <BarisTautan href="/tim/k3" judul="Nilai K3 staf" />}
              <BarisTautan href="/tim/k4" judul="Periksa usulan K4" />
              <BarisTautan href="/tim/uji-petik" judul="Uji petik arsip" />
            </ul>
          </section>
        )}

        <section id="staf" className="scroll-mt-6 space-y-1.5">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Staf</h2>
          {t.stafRingkas.length ? (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {t.stafRingkas.map((x) => (
                <li key={x.pegawaiId} className="border-b border-border/60 last:border-0">
                  <Link href={`/tim/staf/${x.pegawaiId}`} className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">{x.nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {x.unitLain.length ? `Juga di ${x.unitLain.map((u) => unitPendek(u).split(" ")[0]).join(", ")} · ` : ""}
                        {x.pekanIni} tugas pekan ini{x.k1 !== null ? ` · K1 ${angka(x.k1)}` : ""}
                      </span>
                    </span>
                    {x.lewat ? <span className="text-xs font-semibold text-flame-600 dark:text-flame-100">{x.lewat} terlambat</span> : <span className="text-xs font-semibold text-mint-700 dark:text-mint-100">Lancar</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">Belum ada staf di unit Anda bulan ini. Anggota unit diatur Admin sesuai SK.</p>
          )}
        </section>
      </div>
    </div>
  );
}

async function SegmenTimRutin({ sesi, sub, tab }: { sesi: Sesi; sub: string; tab: React.ReactNode }) {
  const t = await muatTimRutin(sesi);
  return (
    <div className="mx-auto max-w-xl pb-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
          <h1 className="text-xl font-bold text-heading">Tugas</h1>
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" />
        </Link>
      </header>
      {tab}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Link href="/tim/verifikasi" className="flex flex-col gap-px rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
            <span className="text-xl font-bold tabular-nums">{t.perluDiperiksa}</span>
            <span className="text-xs font-medium">Perlu diperiksa</span>
          </Link>
          <a href="#staf" className="flex flex-col gap-px rounded-xl bg-flame-500/10 px-3 py-2.5 text-flame-700 dark:text-flame-100">
            <span className="text-xl font-bold tabular-nums">{t.terlambat}</span>
            <span className="text-xs font-medium">Terlambat</span>
          </a>
          <a href="#staf" className="flex flex-col gap-px rounded-xl bg-gold-400/25 px-3 py-2.5 text-gold-700 dark:text-gold-100">
            <span className="text-xl font-bold tabular-nums">{t.belumMulai}</span>
            <span className="text-xs font-medium">Belum mulai</span>
          </a>
        </div>

        {t.usulan > 0 && (
          <Link href="/tim/usulan" className="flex items-center gap-3 rounded-2xl border border-gold-400/60 bg-gold-400/15 px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-heading">{t.usulan} usulan tugas rutin dari staf</span>
              <span className="block text-[12.5px] text-gold-700 dark:text-gold-100">Setujui lalu pilih set tugas tujuannya</span>
            </span>
            <span className="inline-flex h-9 items-center rounded-xl bg-heading px-3 text-[13px] font-semibold text-white dark:bg-primary">Tinjau</span>
          </Link>
        )}

        <nav aria-label="Fungsi koordinator" className="grid grid-cols-2 gap-2.5">
          <Ubin href="/tim/verifikasi" ikon={ClipboardCheck} judul="Verifikasi" sub={t.perluDiperiksa ? `${t.perluDiperiksa} menunggu` : "Tidak ada antrean"} />
          <Ubin href="/tim/set-tugas" ikon={Folder} judul="Set Tugas" sub={`${t.jumlahSet} set`} />
          <Ubin href="/tim/atur-tugas" ikon={CalendarDays} judul="Atur Tugas Staf" sub="Set tugas per pekan" />
          <Ubin href="/tim/tugas" ikon={Send} judul="Delegasi" sub="Beri tugas sekali" />
        </nav>

        <section id="staf" className="scroll-mt-6 space-y-1.5">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Staf hari ini · {t.staf.length}</h2>
          {t.staf.length ? (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {t.staf.map((x) => (
                <li key={x.penugasanId} className="border-b border-border/60 last:border-0">
                  <Link href={`/tim/staf/${x.pegawaiId}`} className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">{x.nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">{x.set ? `${x.set} · ${x.selesai}/${x.total}` : "Belum ada set tugas"}</span>
                    </span>
                    {x.lewat ? (
                      <span className="text-xs font-semibold text-flame-600 dark:text-flame-100">{x.lewat} terlambat</span>
                    ) : x.belumMulai ? (
                      <span className="text-xs font-semibold text-gold-700 dark:text-gold-100">Belum mulai</span>
                    ) : (
                      <span className="text-xs font-semibold text-mint-700 dark:text-mint-100">Lancar</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">Belum ada staf tugas rutin di unit Anda. Anggota unit diatur Admin sesuai SK.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Ubin({ href, ikon: Ikon, judul, sub, peringatan = false }: { href: string; ikon: LucideIcon; judul: string; sub: string; peringatan?: boolean }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 transition hover:border-primary/40">
      <Ikon className="size-6 text-primary" aria-hidden />
      <span className="text-[15px] font-semibold text-heading">{judul}</span>
      <span className={cn("text-[12.5px]", peringatan ? "font-medium text-flame-600 dark:text-flame-100" : "text-muted-foreground")}>{sub}</span>
    </Link>
  );
}

function BarisTautan({ href, judul }: { href: string; judul: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center justify-between">
        {judul} <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
