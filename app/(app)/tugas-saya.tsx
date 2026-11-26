// Tab Tugas · Saya untuk staf (docs/rombak-v2/02 bagian A.1, mockup Adm-1): ringkasan Terlambat · Hari ini · Pekan ini,
// chip skor K1 berjalan, filter unit bagi yang rangkap, lalu daftar gabungan checklist kegiatan, delegasi, dan item
// yang dicatat sendiri. + Catat hanya untuk Staf Administrasi.

import Link from "next/link";
import { ChevronRight, CircleCheck, Clock3 } from "lucide-react";
import { TombolCatatMengambang } from "@/components/app/tombol-catat";
import { Avatar } from "@/components/app/ui";
import { hasilPeriode } from "@/lib/data/ikp";
import { muatTugasSaya } from "@/lib/data/tugas-saya";
import { angka } from "@/lib/format";
import type { Sesi } from "@/lib/sesi";
import { kelompokkanTugasSaya, rentangPekan, unitDari, unitPendek, type BarisTugasSaya } from "@/lib/tugas-saya";
import { cn } from "@/lib/utils";
import { keUtc, labelTanggal, labelTanggalPanjang, periodeDari } from "@/lib/waktu";

export async function TugasSaya({ sesi, hariIni, sp }: { sesi: Sesi; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const [{ baris }, { hasil }] = await Promise.all([muatTugasSaya(sesi), hasilPeriode(periodeDari(hariIni))]);
  const k1 = hasil.find((h) => h.pegawaiId === sesi.pegawaiId)?.k1 ?? null;
  const unit = unitDari(baris.length ? baris : sesi.penugasan.map((p) => ({ unitId: p.unitId, unitNama: p.unitNama })));
  const rangkap = new Set(sesi.penugasan.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK").map((p) => p.unitId)).size > 1;
  const pilihUnit = typeof sp.unit === "string" && unit.some((u) => u.id === sp.unit) ? sp.unit : null;
  const kelompok = kelompokkanTugasSaya(pilihUnit ? baris.filter((b) => b.unitId === pilihUnit) : baris, hariIni, keUtc(rentangPekan(hariIni).awal, sesi.kantor));
  const catat = sesi.penugasan.some((p) => p.peranKerja === "SBK");
  const labelUnit = rangkap ? (b: BarisTugasSaya) => unitPendek(b.unitNama) : () => null;

  return (
    <div className="mx-auto max-w-xl pb-24 lg:pb-0">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-muted-foreground">{labelTanggalPanjang(hariIni)}</p>
          <h1 className="text-xl font-bold text-heading">Tugas saya</h1>
          <Link href="/progres" className="mt-0.5 inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-border bg-card px-2.5 text-[12.5px]">
            <span className="text-muted-foreground">Skor K1 berjalan</span>
            <strong className="text-primary">{k1 === null ? "belum ada" : angka(k1)}</strong>
            <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
          </Link>
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" />
        </Link>
      </header>

      {sp.akses === "ditolak" && <p className="mb-4 rounded-xl bg-flame-500/10 px-4 py-3 text-sm font-medium text-flame-700 dark:text-flame-100">Halaman itu tidak tersedia untuk peran Anda.</p>}

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Angka n={kelompok.terlambat.length} label="Terlambat" nada="flame" />
        <Angka n={kelompok.hariIni.length} label="Hari ini" nada="brand" />
        <Angka n={kelompok.pekanIni.length + kelompok.hariIni.length + kelompok.terlambat.length} label="Pekan ini" nada="netral" />
      </div>

      {rangkap && (
        <nav aria-label="Filter unit" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: null, nama: "Semua" }, ...unit].map((u) => {
            const on = u.id === pilihUnit;
            return (
              <Link
                key={u.id ?? "semua"}
                href={u.id ? `/?unit=${u.id}` : "/"}
                aria-current={on ? "true" : undefined}
                className={cn("inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[13px]", on ? "bg-heading font-semibold text-white dark:bg-primary" : "border border-border bg-card font-medium")}
              >
                {u.id ? unitPendek(u.nama) : u.nama}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="space-y-2">
        {kelompok.perbaiki.length > 0 && (
          <Bagian judul="Perlu diperbaiki" nada="flame">
            {kelompok.perbaiki.map((b) => (
              <Link key={b.id} href={b.href} className="flex flex-col gap-1.5 rounded-2xl border border-flame-500/30 bg-card px-3.5 py-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-heading">{b.judul}</span>
                  <span className="shrink-0 rounded-md bg-flame-500/12 px-2 py-0.5 text-[11.5px] font-semibold text-flame-700 dark:text-flame-100">Ditolak</span>
                </span>
                <span className="text-[12.5px] text-flame-700 dark:text-flame-100">
                  {b.alasanTolak ? `“${b.alasanTolak}”` : "Perbaiki lalu ajukan lagi."}
                  {labelUnit(b) && ` · ${labelUnit(b)}`}
                </span>
              </Link>
            ))}
          </Bagian>
        )}

        {kelompok.terlambat.length > 0 && (
          <Bagian judul="Terlambat" nada="flame">
            {kelompok.terlambat.map((b) => (
              <Baris key={b.id} b={b} unit={labelUnit(b)} hariIni={hariIni} />
            ))}
          </Bagian>
        )}

        <Bagian judul="Hari ini">
          {kelompok.hariIni.length ? (
            kelompok.hariIni.map((b) => <Baris key={b.id} b={b} unit={labelUnit(b)} hariIni={hariIni} />)
          ) : (
            <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              <CircleCheck className="size-4 text-mint-500" aria-hidden /> Tidak ada tugas bertenggat hari ini.
            </p>
          )}
        </Bagian>

        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
          {kelompok.pending.length > 0 && <Lipat judul="Pending dana" ringkas={`${kelompok.pending.length} SPB`} titik baris={kelompok.pending} unit={labelUnit} hariIni={hariIni} />}
          <Lipat judul="Pekan ini" ringkas={`${kelompok.pekanIni.length} tugas`} baris={kelompok.pekanIni} unit={labelUnit} hariIni={hariIni} />
          <Lipat judul="Nanti" ringkas={`${kelompok.nanti.length} tugas`} baris={kelompok.nanti} unit={labelUnit} hariIni={hariIni} />
          <Lipat
            judul="Selesai minggu ini"
            ringkas={`${kelompok.selesai.menunggu.length} menunggu · ${kelompok.selesai.disetujui.length} disetujui`}
            baris={[...kelompok.selesai.menunggu, ...kelompok.selesai.disetujui]}
            unit={labelUnit}
            hariIni={hariIni}
          />
        </div>

        {sesi.penugasan.some((p) => p.peranKerja === "SK") && (
          <Link href="/tugas/usulan" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            Usulkan tugas rutin
          </Link>
        )}
      </div>

      {catat && <TombolCatatMengambang />}
    </div>
  );
}

function Angka({ n, label, nada }: { n: number; label: string; nada: "flame" | "brand" | "netral" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-px rounded-xl px-3 py-2.5",
        nada === "flame" && "bg-flame-500/10 text-flame-700 dark:text-flame-100",
        nada === "brand" && "bg-primary/10 text-brand-700 dark:text-brand-200",
        nada === "netral" && "border border-border bg-card",
      )}
    >
      <span className="text-xl font-bold tabular-nums">{n}</span>
      <span className={cn("text-xs font-medium", nada === "netral" && "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function Bagian({ judul, nada, children }: { judul: string; nada?: "flame"; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={cn("mt-2 text-[12.5px] font-semibold tracking-wide uppercase", nada === "flame" ? "text-flame-700 dark:text-flame-100" : "text-muted-foreground")}>{judul}</h2>
      {children}
    </section>
  );
}

function sisa(b: BarisTugasSaya, hariIni: string) {
  if (b.status === "menunggu") return { teks: "Menunggu diperiksa", nada: "gold" as const };
  if (b.status === "disetujui") return { teks: "Disetujui", nada: "mint" as const };
  if (b.pending) return { teks: "Dana belum cair", nada: "gold" as const };
  if (!b.tenggat) return { teks: "Tanpa tenggat", nada: "netral" as const };
  if (b.lewat || b.tenggat < hariIni) return { teks: `Lewat · ${labelTanggal(b.tenggat)}`, nada: "flame" as const };
  if (b.tenggat === hariIni) return { teks: b.jam ? `s.d. ${b.jam}` : "Hari ini", nada: "gold" as const };
  return { teks: `s.d. ${labelTanggal(b.tenggat)}${b.jam ? ` ${b.jam}` : ""}`, nada: "netral" as const };
}

/** Satu tugas: lingkaran Tandai selesai (membuka form selesai), judul + konteks, dan sisa waktu. */
function Baris({ b, unit, hariIni }: { b: BarisTugasSaya; unit: string | null; hariIni: string }) {
  const s = sisa(b, hariIni);
  const buka = b.status === "buka" || b.status === "ditolak";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
      {buka ? (
        <Link href={b.jenis === "item" ? `${b.href}?selesai=1` : b.href} aria-label={`Tandai selesai: ${b.judul}`} className="grid size-11 shrink-0 place-items-center -m-2">
          <span className="size-7 rounded-full border-2 border-primary bg-card" />
        </Link>
      ) : b.status === "disetujui" ? (
        <CircleCheck className="size-7 shrink-0 text-mint-500" aria-hidden />
      ) : (
        <Clock3 className="size-7 shrink-0 text-gold-500" aria-hidden />
      )}
      <Link href={b.href} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-heading">{b.judul}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {b.jenis === "delegasi" && <span className="font-semibold text-indigo-700 dark:text-indigo-200">Delegasi · </span>}
          {[b.konteks, unit].filter(Boolean).join(" · ") || "—"}
        </span>
      </Link>
      <span
        className={cn(
          "shrink-0 text-right text-xs font-semibold",
          s.nada === "flame" && "text-flame-600 dark:text-flame-100",
          s.nada === "gold" && "text-gold-700 dark:text-gold-100",
          s.nada === "mint" && "text-mint-700 dark:text-mint-100",
          s.nada === "netral" && "font-medium text-muted-foreground",
        )}
      >
        {s.teks}
      </span>
    </div>
  );
}

/** Bagian yang dilipat (Pending dana, Pekan ini, Nanti, Selesai minggu ini). */
function Lipat({ judul, ringkas, baris, unit, hariIni, titik = false }: { judul: string; ringkas: string; baris: BarisTugasSaya[]; unit: (b: BarisTugasSaya) => string | null; hariIni: string; titik?: boolean }) {
  return (
    <details className="group border-b border-border/60 last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3.5 text-sm font-medium">
        <span className="flex items-center gap-2">
          {titik && <span aria-hidden className="size-2 rounded-full bg-gold-500" />}
          {judul}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {ringkas} <ChevronRight className="size-4 transition group-open:rotate-90" aria-hidden />
        </span>
      </summary>
      <div className="space-y-2 px-2 pb-2">
        {baris.length ? baris.map((b) => <Baris key={b.id} b={b} unit={unit(b)} hariIni={hariIni} />) : <p className="px-2 pb-2 text-sm text-muted-foreground">Kosong.</p>}
      </div>
    </details>
  );
}
