"use client";

// Komponen klien Set Tugas (rombak v2, mockup KR-3/KR-4/KR-5): buat/ganti nama, duplikat, ubah tugas dalam set,
// aturan tengah malam (Admin), dan pilihan set per staf di Atur Tugas Staf.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aturGantiHari, aturSetStaf, duplikatSetTugas, hapusItemSet, putuskanUsulanRutin, simpanSetTugas } from "@/app/aksi/set-tugas";
import type { HasilAksi } from "@/lib/aksi";
import { LABEL_HARI } from "@/lib/set-tugas";
import { cn } from "@/lib/utils";
import { FormItemSet, type AwalItemSet } from "./form-rutin";

function useAksi() {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const jalankan = (aksi: () => Promise<HasilAksi>, lalu?: (r: Extract<HasilAksi, { ok: true }>) => void) =>
    mulai(async () => {
      const r = await aksi();
      if (r.ok) {
        toast.success(r.pesan);
        lalu?.(r);
      } else toast.error(r.galat ? Object.values(r.galat)[0] : r.pesan);
      router.refresh();
    });
  return { proses, jalankan, router };
}

export function SetBaru({ unitId }: { unitId: string }) {
  const [nama, setNama] = useState("");
  const { proses, jalankan, router } = useAksi();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => simpanSetTugas(null, unitId, nama), (r) => r.id && router.push(`/tim/set-tugas/${r.id}`));
      }}
    >
      <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama set baru, mis. Kebersihan harian" aria-label="Nama set tugas baru" required minLength={3} />
      <Button type="submit" disabled={proses}>
        <Plus className="size-4" /> Buat
      </Button>
    </form>
  );
}

export function NamaSet({ id, nama: awal }: { id: string; nama: string }) {
  const [nama, setNama] = useState(awal);
  const { proses, jalankan } = useAksi();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => simpanSetTugas(id, "", nama));
      }}
    >
      <Input value={nama} onChange={(e) => setNama(e.target.value)} aria-label="Nama set tugas" required minLength={3} />
      <Button type="submit" variant="outline" disabled={proses || nama === awal}>
        Simpan
      </Button>
    </form>
  );
}

export function TombolDuplikat({ id }: { id: string }) {
  const { proses, jalankan, router } = useAksi();
  return (
    <Button variant="outline" disabled={proses} onClick={() => jalankan(() => duplikatSetTugas(id), (r) => r.id && router.push(`/tim/set-tugas/${r.id}`))}>
      <Copy className="size-4" /> Duplikat
    </Button>
  );
}

/** Satu tugas dalam set: ketuk untuk ubah; hapus berlaku mulai besok. */
export function BarisItemSet({ setId, item }: { setId: string; item: AwalItemSet }) {
  const [buka, setBuka] = useState(false);
  const { proses, jalankan } = useAksi();
  const frek = item.frekuensi === "harian" ? "Setiap hari kerja" : `Setiap ${LABEL_HARI[item.hari ?? 1]}`;
  return (
    <li className="border-b border-border/60 last:border-0">
      <button type="button" onClick={() => setBuka((x) => !x)} aria-expanded={buka} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="w-11 shrink-0 text-[12.5px] font-semibold text-muted-foreground tabular-nums">{item.jamTenggat.replace(":", ".")}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-heading">{item.judul}</span>
          <span className="block text-xs text-muted-foreground">
            {frek}
            {item.linkWajib ? " · link wajib" : ""}
          </span>
        </span>
        <ChevronRight className={cn("size-4 text-muted-foreground transition", buka && "rotate-90")} aria-hidden />
      </button>
      {buka && (
        <div className="space-y-3 border-t border-border px-3.5 py-3">
          <FormItemSet setId={setId} awal={item} setelah={() => setBuka(false)} />
          <Button variant="ghost" size="sm" className="text-destructive" disabled={proses} onClick={() => window.confirm("Hapus tugas ini dari set mulai besok?") && jalankan(() => hapusItemSet(setId, item.id))}>
            <Trash2 className="size-4" /> Hapus dari set
          </Button>
        </div>
      )}
    </li>
  );
}

export function TambahItemSet({ setId }: { setId: string }) {
  const [buka, setBuka] = useState(false);
  if (!buka)
    return (
      <Button variant="outline" className="w-full border-dashed text-primary" onClick={() => setBuka(true)}>
        <Plus className="size-4" /> Tambah tugas
      </Button>
    );
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <FormItemSet setId={setId} setelah={() => setBuka(false)} />
    </div>
  );
}

/** Aturan tugas lewat tengah malam (hanya Admin). */
export function GantiHari({ id, jam: awal }: { id: string; jam: string | null }) {
  const [jam, setJam] = useState(awal ?? "");
  const { proses, jalankan } = useAksi();
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => aturGantiHari(id, jam || null));
      }}
    >
      <label className="flex-1">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Tugas sebelum jam ini masuk hari berikutnya</span>
        <Input type="time" value={jam} onChange={(e) => setJam(e.target.value)} />
      </label>
      <Button type="submit" variant="outline" disabled={proses || jam === (awal ?? "")}>
        Simpan
      </Button>
    </form>
  );
}

/** Atur Tugas Staf: pilih set untuk satu staf; tersimpan langsung. */
export function PilihSetStaf({ penugasanId, set, nilai, pekan, berubah }: { penugasanId: string; set: { id: string; nama: string }[]; nilai: string | null; pekan: "ini" | "depan"; berubah: boolean }) {
  const [v, setV] = useState(nilai ?? "");
  const { proses, jalankan } = useAksi();
  return (
    <select
      value={v}
      disabled={proses}
      aria-label="Set tugas"
      onChange={(e) => {
        setV(e.target.value);
        jalankan(() => aturSetStaf(penugasanId, e.target.value || null, pekan));
      }}
      className={cn("h-10 max-w-[12rem] rounded-xl border px-2.5 text-[13px]", berubah ? "border-2 border-gold-500 font-semibold" : "border-input", "bg-card")}
    >
      <option value="">Tanpa set</option>
      {set.map((x) => (
        <option key={x.id} value={x.id}>
          {x.nama}
        </option>
      ))}
    </select>
  );
}

/** Putusan usulan rutin: pilih set tujuan lalu Setujui, atau Tolak dengan alasan. */
export function PutusanUsulanRutin({ id, set, awal }: { id: string; set: { id: string; nama: string }[]; awal: string | null }) {
  const [tujuan, setTujuan] = useState(awal ?? set[0]?.id ?? "");
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const { proses, jalankan } = useAksi();
  return (
    <div className="space-y-2.5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Masukkan ke set tugas</span>
        <select value={tujuan} onChange={(e) => setTujuan(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
          {set.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nama}
              {x.id === awal ? " (usulan staf)" : ""}
            </option>
          ))}
        </select>
      </label>
      {tolak ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            jalankan(() => putuskanUsulanRutin(id, "tolak", { alasan }));
          }}
        >
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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={proses} onClick={() => setTolak(true)}>
            Tolak
          </Button>
          <Button disabled={proses || !tujuan} onClick={() => jalankan(() => putuskanUsulanRutin(id, "setuju", { setTugasId: tujuan }))}>
            Setujui
          </Button>
        </div>
      )}
    </div>
  );
}
