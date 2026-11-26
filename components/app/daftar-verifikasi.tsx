"use client";

// Verifikasi koordinator (rombak v2, mockup Kor-2): daftar pekerjaan staf dengan Setujui / Tolak (alasan wajib)
// per baris, dan "Setujui semua yang tepat waktu" untuk yang selesai sebelum tenggat.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifikasiTugas } from "@/app/aksi/tugas";
import { setujuiSemuaTepatWaktu, verifikasiItem } from "@/app/aksi/verifikasi";
import type { HasilAksi } from "@/lib/aksi";
import { cn } from "@/lib/utils";

export type BarisVerifikasi = {
  jenis: "item" | "tugas";
  id: string;
  judul: string;
  /** "Daurah Pelajar · Luthfi" */
  ket: string;
  linkBukti: string | null;
  /** true tepat, false terlambat, null tanpa tenggat. */
  tepat: boolean | null;
  /** "Terlambat 1 hari kerja" */
  label: string;
  href: string;
};

const ALASAN = ["Bukti tidak bisa dibuka", "Bukti tidak sesuai", "Tanggal salah"];

function useAksi() {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const jalankan = (aksi: () => Promise<HasilAksi>, lalu?: () => void) =>
    mulai(async () => {
      const r = await aksi();
      if (r.ok) {
        toast.success(r.pesan);
        lalu?.();
      } else toast.error(r.pesan);
      router.refresh();
    });
  return { proses, jalankan };
}

export function SetujuiSemua({ n }: { n: number }) {
  const { proses, jalankan } = useAksi();
  if (!n) return null;
  return (
    <Button size="lg" className="w-full" disabled={proses} onClick={() => jalankan(setujuiSemuaTepatWaktu)}>
      <Check className="size-4" strokeWidth={2.6} /> {proses ? "Menyetujui…" : `Setujui semua yang tepat waktu (${n})`}
    </Button>
  );
}

export function BarisPeriksa({ b }: { b: BarisVerifikasi }) {
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const { proses, jalankan } = useAksi();
  const aksi = b.jenis === "item" ? verifikasiItem : verifikasiTugas;
  return (
    <li className="rounded-2xl border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <a href={b.href} className="truncate text-sm font-semibold text-heading">
            {b.judul}
          </a>
          <span className="truncate text-xs text-muted-foreground">
            {b.ket}
            {b.linkBukti && (
              <>
                {" · "}
                <a href={b.linkBukti} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary">
                  Lihat bukti <ExternalLink className="size-3" aria-hidden />
                </a>
              </>
            )}
          </span>
          <span className={cn("text-[11.5px] font-semibold", b.tepat === false ? "text-flame-600 dark:text-flame-100" : "text-mint-700 dark:text-mint-100")}>{b.label}</span>
        </span>
        {!tolak && (
          <>
            <button type="button" aria-label={`Tolak: ${b.judul}`} disabled={proses} onClick={() => setTolak(true)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-flame-600 disabled:opacity-50">
              <X className="size-4" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label={`Setujui: ${b.judul}`}
              disabled={proses}
              onClick={() => jalankan(() => aksi([b.id], "setuju"))}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Check className="size-4" strokeWidth={2.6} />
            </button>
          </>
        )}
      </div>
      {tolak && (
        <form
          className="mt-2.5 space-y-2 border-t border-border pt-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            jalankan(() => aksi([b.id], "tolak", alasan), () => setTolak(false));
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {ALASAN.map((a) => (
              <button key={a} type="button" onClick={() => setAlasan(a)} className={cn("h-8 rounded-full border px-3 text-xs", alasan === a ? "border-primary bg-primary/10 font-semibold" : "border-border")}>
                {a}
              </button>
            ))}
          </div>
          <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan penolakan (wajib)" required minLength={3} aria-label="Alasan penolakan" />
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={proses || alasan.trim().length < 3}>
              Tolak
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setTolak(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
