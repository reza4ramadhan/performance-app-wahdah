"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { hapusJurnal, hapusPengembanganDiri, simpanJurnal, simpanPengembanganDiri } from "@/app/aksi/harian";
import { FormAksi, Galat } from "./form-aksi";
import { kelasTeks } from "./kolom";
import { PilihCari } from "./pilih-cari";

const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1.5 block text-sm font-medium text-heading">{children}</span>;

export function FormJurnalCepat({ tanggal, unit = [], minTanggal }: { tanggal: string; unit?: { id: string; nama: string }[]; minTanggal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanJurnal} tombol="Simpan jurnal" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => ref.current?.querySelector("form")?.reset()}>
        {minTanggal ? (
          <label className="block">
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" defaultValue={tanggal} min={minTanggal} max={tanggal} />
            <Galat nama="tanggal" />
          </label>
        ) : (
          <input type="hidden" name="tanggal" value={tanggal} />
        )}
        <label className="block">
          <Label>Uraian pekerjaan</Label>
          <textarea name="uraian" required rows={2} className={kelasTeks} placeholder="mis. Membantu persiapan rapat pimpinan" />
          <Galat nama="uraian" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {unit.length > 0 && (
            <label className="block">
              <Label>Bidang/SKUO</Label>
              <PilihCari name="unitId" opsi={unit} />
            </label>
          )}
          <label className={unit.length ? "block" : "col-span-2 block"}>
            <Label>Pemberi tugas</Label>
            <Input name="pemberiTugas" placeholder="mis. Ketua Bidang" />
          </label>
        </div>
        <label className="block">
          <Label>Link (opsional)</Label>
          <Input name="link" type="url" inputMode="url" placeholder="https://…" />
          <Galat nama="link" />
        </label>
      </FormAksi>
    </div>
  );
}

export function FormPdCepat({ tanggal, minTanggal }: { tanggal: string; minTanggal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanPengembanganDiri} tombol="Simpan catatan" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => ref.current?.querySelector("form")?.reset()}>
        {minTanggal ? (
          <label className="block">
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" defaultValue={tanggal} min={minTanggal} max={tanggal} />
            <Galat nama="tanggal" />
          </label>
        ) : (
          <input type="hidden" name="tanggal" value={tanggal} />
        )}
        <label className="block">
          <Label>Judul bacaan / materi</Label>
          <Input name="judul" required placeholder="mis. Kajian Riyadhus Shalihin" />
          <Galat nama="judul" />
        </label>
        <label className="block">
          <Label>Durasi (menit)</Label>
          <Input name="durasiMenit" type="number" inputMode="numeric" min={5} max={600} step={5} required defaultValue={30} />
          <Galat nama="durasiMenit" />
        </label>
        <label className="block">
          <Label>Ringkasan satu kalimat</Label>
          <Input name="ringkasan" required placeholder="Apa yang dipelajari?" />
          <Galat nama="ringkasan" />
        </label>
      </FormAksi>
    </div>
  );
}

export function TombolHapus({ id, jenis }: { id: string; jenis: "jurnal" | "pd" }) {
  const [proses, mulai] = useTransition();
  return (
    <button
      type="button"
      disabled={proses}
      aria-label="Hapus"
      onClick={() => {
        if (!window.confirm("Hapus catatan ini?")) return;
        mulai(async () => {
          const r = await (jenis === "jurnal" ? hapusJurnal(id) : hapusPengembanganDiri(id));
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
        });
      }}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
