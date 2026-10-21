"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ajukanDtr, centangDtr, setujuiCekDtr, setujuiDtr } from "@/app/aksi/dtr";
import type { HasilAksi } from "@/lib/aksi";
import { cn } from "@/lib/utils";
import { kelasPilihan } from "./kolom";

function useAksi() {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const jalankan = (f: () => Promise<HasilAksi>) =>
    mulai(async () => {
      const r = await f();
      if (r.ok) toast.success(r.pesan);
      else toast.error(r.pesan);
      router.refresh();
    });
  return { proses, jalankan };
}

export function FormDtr({ penugasanId, awal }: { penugasanId: string; awal: { uraian: string; frekuensi: "harian" | "mingguan" }[] }) {
  const [tugas, setTugas] = useState(awal.length ? awal : [{ uraian: "", frekuensi: "harian" as const }, { uraian: "", frekuensi: "harian" as const }, { uraian: "", frekuensi: "mingguan" as const }]);
  const { proses, jalankan } = useAksi();
  const ubah = (i: number, patch: Partial<(typeof tugas)[number]>) => setTugas((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => ajukanDtr(penugasanId, tugas));
      }}
      className="space-y-3"
    >
      {tugas.map((t, i) => (
        <div key={i} className="flex gap-2">
          <Input value={t.uraian} onChange={(e) => ubah(i, { uraian: e.target.value })} placeholder={`Tugas rutin ${i + 1}, mis. Patroli malam area gedung`} aria-label={`Tugas ${i + 1}`} className="flex-1" />
          <select value={t.frekuensi} onChange={(e) => ubah(i, { frekuensi: e.target.value as "harian" | "mingguan" })} className={cn(kelasPilihan, "w-32")} aria-label="Frekuensi">
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
          </select>
          {tugas.length > 3 && (
            <Button type="button" variant="ghost" size="icon" aria-label="Hapus tugas" onClick={() => setTugas((x) => x.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        {tugas.length < 5 && (
          <Button type="button" variant="outline" onClick={() => setTugas((x) => [...x, { uraian: "", frekuensi: "harian" }])}>
            <Plus className="size-4" /> Tambah tugas
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={proses}>
          Ajukan DTR
        </Button>
      </div>
    </form>
  );
}

/** Kotak centang besar satu tugas DTR. */
export function CentangDtr({ tugasId, tanggal, uraian, sub, selesai, disetujui }: { tugasId: string; tanggal: string; uraian: string; sub: string; selesai: boolean; disetujui: boolean }) {
  const { proses, jalankan } = useAksi();
  return (
    <button
      type="button"
      disabled={proses || disetujui}
      onClick={() => jalankan(() => centangDtr(tugasId, tanggal, !selesai))}
      aria-pressed={selesai}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition active:scale-[0.99] disabled:active:scale-100",
        selesai ? "border-mint-500/40 bg-mint-500/8" : "border-border/70",
      )}
    >
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2", selesai ? "border-mint-500 bg-mint-500 text-white" : "border-muted-foreground/40")}>
        {selesai && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-medium", selesai ? "text-heading" : "text-heading")}>{uraian}</span>
        <span className="block text-xs text-muted-foreground">{disetujui ? `${sub} · disetujui atasan` : sub}</span>
      </span>
    </button>
  );
}

export function TombolSetujuiDtr({ penugasanId, periode, jenis, label }: { penugasanId: string; periode: string; jenis: "dtr" | "cek"; label: string }) {
  const { proses, jalankan } = useAksi();
  return (
    <Button size="sm" disabled={proses} onClick={() => jalankan(() => (jenis === "dtr" ? setujuiDtr(penugasanId, periode) : setujuiCekDtr(penugasanId, periode)))}>
      <Check className="size-4" /> {label}
    </Button>
  );
}
