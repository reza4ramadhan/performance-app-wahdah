"use client";

// Satu layar per staf: 6 segmen 1–5 (plan.md Bagian 8 butir 13). Skor 1, 2, 5 wajib contoh.

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { simpanK3 } from "@/app/aksi/tim";
import type { HasilAksi } from "@/lib/aksi";
import { LABEL_NILAI_K3, NILAI_K3, type NilaiK3, type SkorK3 } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { kelasTeks } from "./kolom";

const ARTI = ["", "Sangat kurang", "Kurang", "Cukup", "Baik", "Istimewa"];

export function FormK3({
  pegawaiId,
  periodeId,
  awal,
  adaLog,
  terkunci,
}: {
  pegawaiId: string;
  periodeId: string;
  awal?: { skor: SkorK3; contoh: Partial<Record<NilaiK3, string>> };
  adaLog: boolean;
  terkunci: boolean;
}) {
  const [skor, setSkor] = useState<SkorK3>(awal?.skor ?? (Object.fromEntries(NILAI_K3.map((n) => [n, 3])) as SkorK3));
  const [hasil, jalankan, proses] = useActionState(async (p: HasilAksi | null, fd: FormData) => {
    const r = await simpanK3(p, fd);
    if (r.ok) toast.success(r.pesan);
    else if (!r.galat) toast.error(r.pesan);
    return r;
  }, null);
  const galat = hasil && !hasil.ok ? (hasil.galat ?? {}) : {};
  const rata = NILAI_K3.reduce((a, n) => a + skor[n], 0) / NILAI_K3.length;

  return (
    <form action={jalankan} className="space-y-3">
      <input type="hidden" name="pegawaiId" value={pegawaiId} />
      <input type="hidden" name="periodeId" value={periodeId} />
      {NILAI_K3.map((n) => {
        const maks = n === "pengembanganDiri" && !adaLog ? 2 : 5;
        // Log kosong sudah menjadi contoh untuk skor pengembangan diri ≤ 2.
        const wajib = [1, 2, 5].includes(skor[n]) && !(maks === 2 && skor[n] <= 2);
        return (
          <fieldset key={n} disabled={terkunci} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <legend className="text-[15px] font-semibold text-heading">{LABEL_NILAI_K3[n]}</legend>
              <span className="text-xs text-muted-foreground">{ARTI[skor[n]]}</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={LABEL_NILAI_K3[n]}>
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v} className={cn("cursor-pointer", v > maks && "pointer-events-none opacity-35")}>
                  <input type="radio" name={`skor-${n}`} value={v} checked={skor[n] === v} disabled={v > maks} onChange={() => setSkor((x) => ({ ...x, [n]: v }))} className="peer sr-only" />
                  <span className="grid h-11 place-items-center rounded-xl border border-border text-base font-semibold text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40">
                    {v}
                  </span>
                </label>
              ))}
            </div>
            {maks < 5 && <p className="mt-1.5 text-xs font-medium text-gold-700 dark:text-gold-100">Log pengembangan diri bulan ini kosong: maksimal 2.</p>}
            {galat[`skor-${n}`] && <p className="mt-1 text-xs font-medium text-destructive">{galat[`skor-${n}`]}</p>}
            <label className="mt-2 block">
              <span className="sr-only">Contoh perilaku {LABEL_NILAI_K3[n]}</span>
              <textarea
                name={`contoh-${n}`}
                defaultValue={awal?.contoh[n]}
                rows={wajib ? 2 : 1}
                placeholder={wajib ? `Contoh perilaku (wajib untuk skor ${skor[n]})` : "Contoh perilaku (opsional)"}
                className={cn(kelasTeks, "min-h-11", wajib && "border-flame-500/40")}
                aria-invalid={!!galat[`contoh-${n}`]}
              />
              {galat[`contoh-${n}`] && <span className="mt-1 block text-xs font-medium text-destructive">{galat[`contoh-${n}`]}</span>}
            </label>
          </fieldset>
        );
      })}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <p className="mb-2 text-center text-sm text-muted-foreground">
          K3 = rata-rata {rata.toFixed(2).replace(".", ",")} × 20 = <strong className="text-heading">{(rata * 20).toFixed(2).replace(".", ",")}</strong>
        </p>
        <div className="flex gap-2">
          <Button type="submit" name="kirim" value="0" variant="outline" className="flex-1" disabled={proses || terkunci}>
            Simpan draf
          </Button>
          <Button type="submit" name="kirim" value="1" className="flex-1" disabled={proses || terkunci}>
            Kirim penilaian
          </Button>
        </div>
      </div>
    </form>
  );
}
