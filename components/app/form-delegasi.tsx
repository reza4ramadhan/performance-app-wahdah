"use client";

// Form Delegasi (rombak v2, mockup Kor-4): pilih satu atau beberapa staf — tampil beban tugasnya pekan ini dari
// semua unit — lalu judul, tenggat (tanggal + jam), dan apakah link bukti wajib.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { kirimDelegasi } from "@/app/aksi/tugas";
import { cn } from "@/lib/utils";
import { FormAksi, Galat } from "./form-aksi";

export type StafDelegasi = { penugasanId: string; nama: string; beban: number; unitLain: string[] };

export function FormDelegasi({ staf, hariIni }: { staf: StafDelegasi[]; hariIni: string }) {
  const [pilih, setPilih] = useState<string[]>(staf.length === 1 ? [staf[0].penugasanId] : []);
  const [putaran, setPutaran] = useState(0);
  return (
    <FormAksi key={putaran} aksi={kirimDelegasi} tombol={pilih.length > 1 ? `Kirim tugas ke ${pilih.length} staf` : "Kirim tugas"} tombolPenuh className="space-y-3" setelahBerhasil={() => (setPilih([]), setPutaran((x) => x + 1))}>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-heading">Untuk</legend>
        <div className="space-y-1.5">
          {staf.map((t) => {
            const on = pilih.includes(t.penugasanId);
            const berat = t.beban >= 8;
            return (
              <label key={t.penugasanId} className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5", on ? "border-2 border-primary bg-primary/8" : "border border-input")}>
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    name="penugasanId"
                    value={t.penugasanId}
                    checked={on}
                    onChange={(e) => setPilih((x) => (e.target.checked ? [...x, t.penugasanId] : x.filter((y) => y !== t.penugasanId)))}
                    className="size-4 accent-primary"
                  />
                  <span className={cn("truncate text-[13.5px]", on && "font-semibold")}>{t.nama}</span>
                </span>
                <span className={cn("shrink-0 text-xs", berat ? "font-semibold text-gold-700 dark:text-gold-100" : "text-muted-foreground")}>
                  {t.beban} tugas pekan ini{t.unitLain.length ? ` · juga ${t.unitLain.join(", ")}` : ""}
                </span>
              </label>
            );
          })}
        </div>
        <Galat nama="penugasanId" />
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Tugas</span>
        <Input name="judul" required minLength={3} placeholder="mis. Pastikan jadwal Desember ke pengurus" />
        <Galat nama="judul" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-heading">Tenggat</span>
          <Input name="tanggal" type="date" required min={hariIni} defaultValue={hariIni} />
          <Galat nama="tanggal" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-heading">Jam</span>
          <Input name="jamTenggat" type="time" required defaultValue="15:00" />
          <Galat nama="jamTenggat" />
        </label>
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-sm font-semibold text-heading">Link bukti wajib</span>
        <input type="checkbox" role="switch" name="linkWajib" className="peer sr-only" />
        <span aria-hidden className="relative h-7 w-12 rounded-full bg-input transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-[3px] after:left-[3px] after:size-[22px] after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>
    </FormAksi>
  );
}
