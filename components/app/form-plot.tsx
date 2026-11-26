"use client";

// Ubah plot satu departemen (rombak v2, mockup Kor-5): centang staf yang melayani, tandai PJ utama.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { simpanPlot } from "@/app/aksi/tim";
import { cn } from "@/lib/utils";

export function FormPlot({ unitId, skuoId, staf, awal, utamaAwal }: { unitId: string; skuoId: string; staf: { id: string; nama: string }[]; awal: string[]; utamaAwal: string | null }) {
  const [pilih, setPilih] = useState(awal);
  const [utama, setUtama] = useState(utamaAwal);
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const utamaEfektif = utama && pilih.includes(utama) ? utama : pilih.length === 1 ? pilih[0] : null;
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        mulai(async () => {
          const r = await simpanPlot(unitId, skuoId, pilih, utamaEfektif);
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
          router.refresh();
        });
      }}
    >
      <ul className="space-y-1.5">
        {staf.map((t) => {
          const on = pilih.includes(t.id);
          return (
            <li key={t.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2", on ? "border-2 border-primary bg-primary/8" : "border border-input")}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={on} onChange={(e) => setPilih((x) => (e.target.checked ? [...x, t.id] : x.filter((y) => y !== t.id)))} className="size-4 accent-primary" />
                <span className={cn("truncate text-[13.5px]", on && "font-semibold")}>{t.nama}</span>
              </label>
              {on && (
                <button
                  type="button"
                  aria-pressed={utamaEfektif === t.id}
                  onClick={() => setUtama(t.id)}
                  className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs", utamaEfektif === t.id ? "bg-primary/15 font-semibold text-brand-700 dark:text-brand-200" : "border border-border text-muted-foreground")}
                >
                  <Star className={cn("size-3", utamaEfektif === t.id && "fill-current")} aria-hidden /> PJ utama
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="submit" size="sm" disabled={proses || (pilih.length > 1 && !utamaEfektif)}>
        {proses ? "Menyimpan…" : "Simpan plot"}
      </Button>
      {pilih.length > 1 && !utamaEfektif && <p className="text-xs text-flame-600">Pilih PJ utama.</p>}
    </form>
  );
}
