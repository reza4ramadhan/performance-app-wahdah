// Beranda amanah KSBK: satu langkah berikutnya di atas (input kegiatan SKUO → setujui pekerjaan staf → usulan
// tugas → pekerjaan lewat tenggat → semua beres), lalu K1 Anda (= rata-rata K1 staf) dan daftar staf.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlarmClock, CalendarPlus, Check, ChevronRight, CircleCheck, ClipboardList, FileText, Plus } from "lucide-react";
import { SapaanHariIni } from "@/components/app/hari-ini";
import { IKON_MENU } from "@/components/app/ikon-menu";
import { bingkaiKaca, chipKaca, LapisanKaca } from "@/components/app/ornamen";
import { TombolCatat } from "@/components/app/tombol-catat";
import { Avatar, Kartu, PetakIkon } from "@/components/app/ui";
import { getDb } from "@/lib/db";
import { kegiatanWajibKosong } from "@/lib/data/kegiatan";
import { kontrolStaf, pitaK1, type Pita, type StafKontrol } from "@/lib/data/kontrol-staf";
import { bilangan, inisial } from "@/lib/format";
import { KONTROL_KSBK } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { Sesi } from "@/lib/sesi";
import { labelPeriode, labelTanggal } from "@/lib/waktu";

const satuDesimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const WARNA_BATANG: Record<Pita, string> = { baik: "bg-mint-500", sedang: "bg-gold-400", rendah: "bg-flame-500", kosong: "bg-white/25" };

type Nada = "flame" | "gold" | "teal";
type Langkah = {
  kunci: string;
  nada: Nada;
  ikon: LucideIcon;
  judul: string;
  /** Keterangan sangat singkat di pojok kartu, mis. "Lewat 7 hari". */
  pil?: string;
  /** Inisial staf terkait, ditampilkan bertumpuk. */
  staf?: string[];
  tombol: string;
  href: string;
};

/** `cahaya`: dua cahaya buram efek kaca [kanan atas, kiri bawah]. */
const GAYA: Record<Nada, { kartu: string; cahaya: [string, string]; pil: string; tombol: string; kecil: string }> = {
  flame: { kartu: "bg-flame-600 text-white", cahaya: ["bg-gold-400/35", "bg-flame-700/60"], pil: "bg-white text-flame-700", tombol: "bg-white text-flame-700 focus-visible:outline-white", kecil: "bg-flame-100 text-flame-700 dark:bg-flame-500/20 dark:text-flame-100" },
  gold: { kartu: "bg-gold-400 text-ink", cahaya: ["bg-white/55", "bg-flame-500/25"], pil: "bg-ink text-white", tombol: "bg-ink text-white focus-visible:outline-ink", kecil: "bg-gold-100 text-gold-700 dark:bg-gold-400/20 dark:text-gold-100" },
  teal: { kartu: "bg-brand-600 text-white", cahaya: ["bg-brand-300/45", "bg-brand-900/55"], pil: "bg-white text-brand-700", tombol: "bg-white text-brand-700 focus-visible:outline-white", kecil: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200" },
};

export async function HariIniKsbk({ sesi, hariIni: today, sp }: { sesi: Sesi; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const db = await getDb();
  const bidang = sesi.amanahPn.filter((p) => p.peranKerja === "KSBK");
  const [k, kosongKegiatan] = await Promise.all([kontrolStaf(sesi), kegiatanWajibKosong(db, bidang.map((p) => p.unitId), today)]);
  const { staf, acuan } = k;
  const pnKsbk = bidang[0]?.id;

  // ── Urutan langkah: yang paling mendesak di atas ──
  const langkah: Langkah[] = [];
  for (const x of kosongKegiatan) {
    const lewat = x.sisaHari < 0;
    const namaBidang = bidang.length > 1 ? ` ${bidang.find((p) => p.unitId === x.unitId)?.unitNama ?? ""}` : "";
    langkah.push({
      kunci: `kegiatan-${x.unitId}-${x.periode}`,
      nada: lewat ? "flame" : "gold",
      ikon: CalendarPlus,
      judul: `Input kegiatan SKUO ${labelPeriode(x.periode).split(" ")[0]}${namaBidang}`,
      pil: lewat ? `Lewat ${-x.sisaHari} hari` : x.sisaHari === 0 ? "Batas hari ini" : `Batas ${labelTanggal(x.batas)}`,
      tombol: "Input sekarang",
      href: `/tim/kegiatan?unit=${x.unitId}&periode=${x.periode}`,
    });
  }
  const nPeriksa = k.antrean.length + k.tugasMenunggu.length;
  if (nPeriksa) {
    const pemilik = [...new Set([...k.antrean.map((i) => i.pemilikNama), ...k.tugasMenunggu.map((t) => t.stafNama)])];
    langkah.push({ kunci: "periksa", nada: "teal", ikon: CircleCheck, judul: `Setujui ${nPeriksa} pekerjaan staf`, staf: pemilik, tombol: "Mulai periksa", href: "/tim/periksa" });
  }
  if (k.usulanMenunggu) {
    langkah.push({ kunci: "usulan", nada: "teal", ikon: ClipboardList, judul: `Putuskan ${k.usulanMenunggu} usulan tugas`, tombol: "Buka usulan", href: "/tim/tugas" });
  }
  const telat = staf.filter((t) => t.lewat > 0);
  const nTelat = telat.reduce((a, t) => a + t.lewat, 0);
  if (nTelat) {
    langkah.push({
      kunci: "telat",
      nada: "flame",
      ikon: AlarmClock,
      judul: `Tindak lanjuti ${nTelat} pekerjaan telat`,
      staf: telat.map((t) => t.nama),
      tombol: telat.length === 1 ? `Lihat ${telat[0].nama.split(" ")[0]}` : "Lihat staf",
      href: telat.length === 1 ? `/tim/staf/${telat[0].pegawaiId}` : "#staf",
    });
  }
  const [utama, berikut] = langkah;

  return (
    <>
      <SapaanHariIni sesi={sesi} hariIni={today} sp={sp} ringkas />

      <div className="space-y-4 lg:max-w-2xl">
        {utama ? <KartuLangkah l={utama} /> : <KartuBeres />}
        {berikut && <BarisBerikut l={berikut} />}

        {/* Laporan bidang hanya bila KSBK-3 diaktifkan lagi oleh Admin. */}
        {pnKsbk && k.param.get("KSBK-3")?.aktif && (
          <Kartu className="flex items-center gap-3 p-3">
            <PetakIkon ikon={FileText} nada="netral" />
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-heading">Laporan bidang</span>
            <TombolCatat label="Catat" varian="outline" preset={{ penugasanId: pnKsbk, kode: "KSBK-3" }} />
          </Kartu>
        )}

        <PanelK1 k1={k.k1} staf={staf} acuan={acuan} besar={!utama} />

        <section id="staf" aria-labelledby="judul-staf" className="scroll-mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="judul-staf" className="text-base font-bold text-heading">
              Staf
            </h2>
            <span className="text-[13px] text-muted-foreground">{staf.length} orang</span>
          </div>
          {staf.length ? (
            <ul className="rounded-[1.25rem] border border-border/70 bg-card px-3.5 py-1">
              {staf.map((t) => (
                <li key={t.pegawaiId} className="border-b border-border/60 last:border-0">
                  <BarisStaf t={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[1.25rem] border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Belum ada staf. Admin perlu menetapkan Anda sebagai koordinator SBK.</p>
          )}
        </section>

        {/* Menu pendukung; di desktop sudah ada di sidebar. */}
        <nav aria-label="Kontrol lainnya" className="pt-2 lg:hidden">
          <h2 className="mb-2 text-base font-bold text-heading">Lainnya</h2>
          <ul className="grid grid-cols-4 gap-1">
            {KONTROL_KSBK.map((m) => {
              const Ikon = IKON_MENU[m.ikon];
              return (
                <li key={m.href}>
                  <Link href={m.href} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-[11px] leading-tight font-medium text-foreground active:bg-muted">
                    <span className="grid size-11 place-items-center rounded-2xl bg-card text-muted-foreground ring-1 ring-border/70">
                      <Ikon className="size-5" strokeWidth={1.8} />
                    </span>
                    {m.pendek ?? m.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

/** Satu langkah berikutnya: ikon, keterangan singkat, judul besar, satu tombol. */
function KartuLangkah({ l }: { l: Langkah }) {
  const g = GAYA[l.nada];
  const Ikon = l.ikon;
  return (
    <section aria-labelledby="judul-langkah" className={cn("relative isolate flex flex-col gap-4 overflow-hidden rounded-[1.75rem] p-5", g.kartu, bingkaiKaca)}>
      <LapisanKaca cahaya={g.cahaya} />
      <div className="flex items-center justify-between gap-3">
        <span className={cn("grid size-13 place-items-center rounded-[1.125rem]", chipKaca)}>
          <Ikon className="size-7" strokeWidth={2} />
        </span>
        {l.staf ? <Tumpukan nama={l.staf} nada={l.nada} /> : l.pil ? <span className={cn("rounded-full px-3 py-1.5 text-[13px] font-bold", g.pil)}>{l.pil}</span> : null}
      </div>
      <h2 id="judul-langkah" className="text-[28px] leading-[1.15] font-extrabold tracking-tight text-balance">
        {l.judul}
      </h2>
      <Link
        href={l.href}
        className={cn("flex min-h-14 items-center justify-center gap-2 rounded-[1.125rem] text-base font-bold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2", g.tombol)}
      >
        {l.kunci.startsWith("kegiatan") && <Plus className="size-5" strokeWidth={2.6} />}
        {l.tombol}
        {!l.kunci.startsWith("kegiatan") && <ChevronRight className="size-5" strokeWidth={2.4} />}
      </Link>
    </section>
  );
}

/** Inisial staf bertumpuk (maks. 3 + sisa). */
function Tumpukan({ nama, nada }: { nama: string[]; nada: Nada }) {
  const cincin = { flame: "ring-flame-600", gold: "ring-gold-400", teal: "ring-brand-600" }[nada];
  return (
    <span className="flex items-center" aria-label={`Dari ${nama.length} staf`}>
      {nama.slice(0, 3).map((n, i) => (
        <span key={n} className={cn("rounded-full ring-2", cincin, i > 0 && "-ml-1.5")}>
          <Avatar nama={n} ukuran="sm" />
        </span>
      ))}
      {nama.length > 3 && <span className={cn("-ml-1.5 grid size-8 place-items-center rounded-full bg-white text-[11px] font-extrabold text-brand-700 ring-2", cincin)}>+{nama.length - 3}</span>}
    </span>
  );
}

function KartuBeres() {
  return (
    <section className="relative isolate flex items-center gap-4 overflow-hidden rounded-[1.75rem] bg-mint-100 p-5 text-mint-700 ring-1 ring-mint-500/20 ring-inset dark:bg-mint-700/30 dark:text-mint-100">
      <LapisanKaca cahaya={["bg-white/80", "bg-mint-500/30"]} />
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-mint-700 text-white">
        <Check className="size-7" strokeWidth={2.8} />
      </span>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-mint-700 dark:text-mint-100">Semua beres</h2>
        <p className="text-sm text-mint-700/90 dark:text-mint-100/80">Tidak ada yang menunggu Anda</p>
      </div>
    </section>
  );
}

/** Langkah sesudahnya, satu baris. */
function BarisBerikut({ l }: { l: Langkah }) {
  const Ikon = l.ikon;
  return (
    <Link href={l.href} className="flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-border/70 bg-card px-3.5 py-3 transition active:bg-muted">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-[0.875rem]", GAYA[l.nada].kecil)}>
        <Ikon className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">Setelah itu</span>
        <span className="block truncate text-[15px] font-bold text-heading">{l.judul}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** K1 Anda = rata-rata K1 staf; batang per staf, garis putus-putus emas = rata-ratanya. */
function PanelK1({ k1, staf, acuan, besar }: { k1: number | null; staf: StafKontrol[]; acuan: number; besar: boolean }) {
  const urut = [...staf].sort((a, b) => (b.k1 ?? -1) - (a.k1 ?? -1));
  const label = `K1 staf: ${urut.map((t) => `${t.nama} ${t.k1 === null ? "belum ada" : bilangan(t.k1)}`).join(", ")}. Rata-rata ${k1 === null ? "belum ada" : satuDesimal.format(k1)}`;
  const grafik = (tinggi: string) => (
    <span role="img" aria-label={label} className={cn("relative flex items-end gap-1.5", tinggi)}>
      {k1 !== null && <span aria-hidden className="absolute inset-x-0 z-10 border-t-2 border-dashed border-gold-400" style={{ bottom: `${Math.min(100, k1)}%` }} />}
      {urut.map((t, i) => (
        <span
          key={t.pegawaiId}
          className={cn("tumbuh max-w-8 min-w-0 flex-1 rounded-t-[5px]", WARNA_BATANG[pitaK1(t.k1, acuan)])}
          style={{ height: `${t.k1 === null ? 5 : Math.max(4, Math.min(100, t.k1))}%`, animationDelay: `${i * 40}ms` }}
        />
      ))}
    </span>
  );
  const angkaK1 = k1 === null ? "—" : satuDesimal.format(k1);

  if (!besar)
    return (
      <Link href="/progres" aria-label={`K1 Anda ${angkaK1}. Lihat rincian`} className={cn("relative isolate flex items-end justify-between gap-4 overflow-hidden rounded-3xl bg-brand-800 px-5 py-4.5 text-white transition active:scale-[0.99] dark:bg-brand-900", bingkaiKaca)}>
        <OrnamenK1 />
        <span className="flex flex-col gap-1">
          <span className="text-[13px] text-white/80">K1 Anda</span>
          <span className="text-[40px] leading-none font-extrabold tracking-tight tabular-nums">{angkaK1}</span>
        </span>
        {urut.length > 0 && <span className="flex w-44 justify-end">{grafik("h-14 w-full")}</span>}
      </Link>
    );

  return (
    <section aria-labelledby="judul-k1" className={cn("relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl bg-brand-800 p-5 text-white dark:bg-brand-900", bingkaiKaca)}>
      <OrnamenK1 />
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="judul-k1" className="text-[13px] font-normal text-white/80">
            K1 Anda
          </h2>
          <span className="text-5xl leading-none font-extrabold tracking-tight tabular-nums">{angkaK1}</span>
        </div>
        <Link href="/progres" className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-white/85 hover:text-white">
          Rincian <ChevronRight className="size-4" />
        </Link>
      </div>
      {urut.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {grafik("h-18")}
          <span aria-hidden className="flex gap-1.5 text-center text-[11px] font-semibold text-white/75">
            {urut.map((t) => (
              <span key={t.pegawaiId} className="max-w-8 min-w-0 flex-1 truncate">
                {inisial(t.nama)}
              </span>
            ))}
          </span>
        </div>
      )}
    </section>
  );
}

/** Efek kaca panel K1: cahaya toska di kanan atas, toska pekat di kiri bawah untuk kedalaman. */
function OrnamenK1() {
  return <LapisanKaca cahaya={["bg-brand-400/35", "bg-brand-950/70"]} />;
}

/** Satu baris staf: nama lengkap, satu keterangan singkat, angka K1. Menaut ke halaman detail staf. */
function BarisStaf({ t }: { t: StafKontrol }) {
  return (
    <Link href={`/tim/staf/${t.pegawaiId}`} className="flex min-h-14 items-center gap-3 py-2">
      <span className="relative">
        <Avatar nama={t.nama} ukuran="sm" className="size-9" />
        {!t.isiHariIni && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-gold-500 ring-2 ring-card" title="Belum mengisi hari ini" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-heading">{t.nama}</span>
      {t.menunggu > 0 ? (
        <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-gold-700 dark:bg-gold-400/20 dark:text-gold-100">{t.menunggu} setujui</span>
      ) : t.lewat > 0 ? (
        <span className="shrink-0 rounded-full bg-flame-100 px-2.5 py-0.5 text-xs font-bold text-flame-700 dark:bg-flame-500/20 dark:text-flame-100">{t.lewat} telat</span>
      ) : null}
      <span className={cn("w-8 shrink-0 text-right text-[15px] font-extrabold tabular-nums", t.k1 === null ? "text-muted-foreground" : "text-heading")}>
        {t.k1 === null ? "—" : bilangan(t.k1)}
      </span>
    </Link>
  );
}
