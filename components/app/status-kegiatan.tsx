"use client";

// Konfirmasi rencana per kegiatan (rombak v2, mockup Kor-3): Jalan · Geser (tanggal baru) · Tunda · Batal (alasan).
// Status langsung tersimpan; checklist staf dibuat begitu kegiatan berstatus Jalan atau Geser.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ubahStatusKegiatan } from "@/app/aksi/tim";
import { cn } from "@/lib/utils";

type Status = "rencana" | "jalan" | "geser" | "tunda" | "batal";

const GAYA: Record<Exclude<Status, "rencana">, string> = {
  jalan: "border-2 border-mint-600 bg-mint-500/12 font-semibold text-mint-700 dark:text-mint-100",
  geser: "border-2 border-gold-500 bg-gold-400/20 font-semibold text-gold-700 dark:text-gold-100",
  tunda: "border-2 border-muted-foreground bg-muted font-semibold",
  batal: "border-2 border-flame-600 bg-flame-500/10 font-semibold text-flame-700 dark:text-flame-100",
};
const LABEL: Record<Exclude<Status, "rencana">, string> = { jalan: "Jalan", geser: "Geser", tunda: "Tunda", batal: "Batal" };

export function StatusKegiatan({ id, status, tanggal, alasan, min, max }: { id: string; status: Status; tanggal: string; alasan: string | null; min: string; max: string }) {
  const [pilih, setPilih] = useState<Status>(status);
  const [tgl, setTgl] = useState(tanggal);
  const [teks, setTeks] = useState(alasan ?? "");
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const kirim = (input: Record<string, string>) =>
    mulai(async () => {
      const r = await ubahStatusKegiatan(id, input);
      if (r.ok) toast.success(r.pesan);
      else {
        toast.error(r.galat ? Object.values(r.galat)[0] : r.pesan);
        setPilih(status);
      }
      router.refresh();
    });

  if (status === "tunda") return <p className="text-[12.5px] font-medium text-muted-foreground">Ditunda: masuk rencana bulan berikutnya.</p>;

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Status kegiatan" className="grid grid-cols-4 gap-1.5">
        {(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={pilih === s}
            disabled={proses}
            className={cn("h-9 rounded-xl text-[13px] transition disabled:opacity-60", pilih === s ? GAYA[s] : "border border-input bg-card")}
            onClick={() => {
              setPilih(s);
              // Jalan & Tunda langsung tersimpan; Geser & Batal butuh isian dulu.
              if (s === "jalan" && status !== "jalan") kirim({ status: "jalan" });
              if (s === "tunda" && window.confirm("Tunda kegiatan ini ke bulan berikutnya? Checklist yang belum selesai keluar dari target.")) kirim({ status: "tunda" });
              else if (s === "tunda") setPilih(status);
            }}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>
      {pilih === "geser" && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            kirim({ status: "geser", tanggal: tgl });
          }}
        >
          <label className="shrink-0 text-[13px] font-semibold" htmlFor={`tgl-${id}`}>
            Tanggal baru
          </label>
          <Input id={`tgl-${id}`} type="date" value={tgl} min={min} max={max} onChange={(e) => setTgl(e.target.value)} className="h-10 flex-1" required />
          <Button type="submit" size="sm" disabled={proses || (status === "geser" && tgl === tanggal)}>
            Simpan
          </Button>
        </form>
      )}
      {pilih === "batal" && (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            kirim({ status: "batal", alasan: teks });
          }}
        >
          <label className="block text-[13px] font-semibold" htmlFor={`alasan-${id}`}>
            Alasan batal
          </label>
          <div className="flex gap-2">
            <Input id={`alasan-${id}`} value={teks} onChange={(e) => setTeks(e.target.value)} required minLength={3} className="h-10 flex-1" placeholder="mis. Digabung ke kegiatan lain" />
            <Button type="submit" size="sm" variant="destructive" disabled={proses || teks.trim().length < 3 || (status === "batal" && teks === alasan)}>
              Simpan
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
