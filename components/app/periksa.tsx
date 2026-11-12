"use client";

// Mode periksa KSBK: satu pekerjaan staf per layar, Setujui atau Tolak (dengan alasan singkat), lalu lanjut.

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { verifikasiTugas } from "@/app/aksi/tugas";
import { verifikasiItem } from "@/app/aksi/verifikasi";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

export type KartuPeriksa = {
  jenis: "item" | "tugas";
  id: string;
  judul: string;
  staf: string;
  /** Jenis pekerjaan singkat, mis. "Surat", "SPP", "Tugas khusus". */
  label: string;
  /** "11 Nov" */
  selesai: string | null;
  /** Selesai sebelum tenggat? null bila tidak ada tenggat. */
  tepat: boolean | null;
  linkBukti: string | null;
  milikSendiri: boolean;
};

const ALASAN = {
  item: ["Bukti tidak bisa dibuka", "Bukti tidak sesuai", "Tanggal salah"],
  tugas: ["Hasil belum sesuai", "Bukti tidak bisa dibuka"],
};

export function Periksa({ daftar: awal }: { daftar: KartuPeriksa[] }) {
  // Daftar dibekukan saat dibuka: setiap keputusan menyegarkan halaman dari server (antrean menyusut), dan
  // tanpa pembekuan posisi `i` akan melompati satu pekerjaan.
  const [daftar] = useState(awal);
  const [i, setI] = useState(0);
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [hasil, setHasil] = useState({ setuju: 0, tolak: 0, lewati: 0 });
  const [proses, mulai] = useTransition();
  const total = daftar.length;
  const x = daftar[i];

  const lanjut = (jenis: keyof typeof hasil) => {
    setHasil((h) => ({ ...h, [jenis]: h[jenis] + 1 }));
    setTolak(false);
    setAlasan("");
    setI((n) => n + 1);
  };
  const putus = (keputusan: "setuju" | "tolak", teks = alasan) =>
    mulai(async () => {
      const aksi = x.jenis === "item" ? verifikasiItem : verifikasiTugas;
      const r = await aksi([x.id], keputusan, keputusan === "tolak" ? teks : undefined);
      if (!r.ok) return void toast.error(r.pesan);
      lanjut(keputusan);
    });

  if (!x)
    return (
      <div className="flex min-h-[85dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid size-22 place-items-center rounded-full bg-mint-700 text-white">
          <Check className="size-11" strokeWidth={2.6} />
        </span>
        <h1 className="text-[28px] font-extrabold tracking-tight text-heading">{total ? "Semua sudah diperiksa" : "Tidak ada yang perlu diperiksa"}</h1>
        {total > 0 && (
          <p className="text-[15px] text-muted-foreground">
            {[hasil.setuju && `${hasil.setuju} disetujui`, hasil.tolak && `${hasil.tolak} dikembalikan`, hasil.lewati && `${hasil.lewati} dilewati`].filter(Boolean).join(", ")}
          </p>
        )}
        <Link href="/" className="mt-2 flex min-h-14 items-center rounded-[1.125rem] bg-primary px-7 text-base font-bold text-primary-foreground">
          Kembali ke Beranda
        </Link>
      </div>
    );

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-3.5 pt-3">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Tutup" className="grid size-11 place-items-center rounded-full border border-border bg-card text-heading">
            <X className="size-5" strokeWidth={2.2} />
          </Link>
          <p className="text-[15px] font-bold text-heading tabular-nums" aria-live="polite">
            {i + 1} dari {total}
          </p>
          <button type="button" onClick={() => lanjut("lewati")} disabled={proses} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted-foreground">
            Lewati
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i + 1} aria-label="Kemajuan periksa">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((i + 1) / total) * 100}%` }} />
        </div>
      </header>

      <div key={x.id} className="flex flex-1 flex-col gap-4 pt-6">
        <div className="flex items-center gap-3">
          <Avatar nama={x.staf} ukuran="lg" />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-heading">{x.milikSendiri ? "Item Anda" : x.staf}</p>
            <p className="text-[13px] text-muted-foreground">{x.label}</p>
          </div>
        </div>

        <section className="flex flex-col gap-5 rounded-[1.75rem] border border-border/70 bg-card px-5.5 py-6 shadow-[0_1px_2px_rgb(16_60_70/0.04),0_12px_32px_-18px_rgb(16_60_70/0.25)]">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight break-words text-heading">{x.judul}</h1>
          <div className="flex flex-col gap-3">
            {x.selesai && (
              <p className="flex items-center gap-2.5 text-[15px]">
                <CalendarDays className="size-5 text-muted-foreground" />
                <span className="flex-1">Selesai {x.selesai}</span>
                {x.tepat !== null && (
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", x.tepat ? "bg-mint-100 text-mint-700 dark:bg-mint-500/20 dark:text-mint-100" : "bg-flame-100 text-flame-700 dark:bg-flame-500/20 dark:text-flame-100")}>
                    {x.tepat ? "Tepat waktu" : "Lewat tenggat"}
                  </span>
                )}
              </p>
            )}
            {x.linkBukti ? (
              <a href={x.linkBukti} target="_blank" rel="noopener noreferrer" className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-muted text-[15px] font-bold text-brand-700 dark:text-brand-200">
                <ExternalLink className="size-4.5" /> Buka bukti
              </a>
            ) : (
              <p className="flex min-h-13 items-center justify-center rounded-2xl bg-flame-100 text-[15px] font-bold text-flame-700 dark:bg-flame-500/20 dark:text-flame-100">Tanpa bukti</p>
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-background pt-4">
        {tolak && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-muted-foreground">Alasan</p>
            <div className="flex flex-wrap gap-2">
              {ALASAN[x.jenis].map((a) => (
                <button key={a} type="button" disabled={proses} onClick={() => putus("tolak", a)} className="min-h-11 rounded-full border border-flame-500/40 bg-flame-50 px-4 text-sm font-semibold text-flame-700 dark:bg-flame-500/15 dark:text-flame-100">
                  {a}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (alasan.trim()) putus("tolak");
              }}
            >
              <input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan lain" aria-label="Alasan lain" className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-[15px]" />
              <button type="submit" disabled={proses || !alasan.trim()} className="min-h-11 rounded-xl bg-flame-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                Tolak
              </button>
            </form>
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2.5">
          <button
            type="button"
            onClick={() => setTolak((v) => !v)}
            disabled={proses}
            aria-expanded={tolak}
            className={cn("flex min-h-15 items-center justify-center gap-1.5 rounded-[1.25rem] border-2 text-base font-bold", tolak ? "border-flame-600 bg-flame-600 text-white" : "border-flame-500 bg-card text-flame-700 dark:text-flame-100")}
          >
            <X className="size-4.5" strokeWidth={2.6} /> Tolak
          </button>
          <button
            type="button"
            onClick={() => putus("setuju")}
            disabled={proses}
            className="flex min-h-15 items-center justify-center gap-2 rounded-[1.25rem] bg-primary text-[17px] font-bold text-primary-foreground shadow-[0_10px_24px_-12px_rgb(12_120_131/0.7)] disabled:opacity-60"
          >
            <Check className="size-5" strokeWidth={2.8} /> {proses ? "Menyimpan…" : "Setujui"}
          </button>
        </div>
      </div>
    </div>
  );
}
