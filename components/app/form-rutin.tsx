"use client";

// Form tugas rutin: isian tugas dalam Set Tugas (koordinator, mockup KR-4) dan usulan tugas rutin (staf, Rtn-5).

import { useState } from "react";
import { Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ajukanUsulanRutin, simpanItemSet } from "@/app/aksi/set-tugas";
import { LABEL_HARI } from "@/lib/set-tugas";
import { cn } from "@/lib/utils";
import { FormAksi, Galat } from "./form-aksi";
import { kelasTeks } from "./kolom";

const pilihan = (on: boolean) => cn("h-11 rounded-xl text-[13px]", on ? "border-2 border-primary bg-primary/10 font-semibold text-brand-700 dark:text-brand-200" : "border border-input bg-card");

/** Frekuensi (Setiap hari kerja / Sepekan sekali + hari) dan jam tenggat. */
function IsianJadwal({ awal }: { awal?: { frekuensi: "harian" | "pekanan"; hari: number | null; jamTenggat: string } }) {
  const [frek, setFrek] = useState<"harian" | "pekanan">(awal?.frekuensi ?? "harian");
  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-heading">Frekuensi</legend>
        <input type="hidden" name="frekuensi" value={frek} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={frek === "harian"} className={pilihan(frek === "harian")} onClick={() => setFrek("harian")}>
            Setiap hari kerja
          </button>
          <button type="button" aria-pressed={frek === "pekanan"} className={pilihan(frek === "pekanan")} onClick={() => setFrek("pekanan")}>
            Sepekan sekali
          </button>
        </div>
      </fieldset>
      {frek === "pekanan" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-heading">Hari</span>
          <select name="hari" defaultValue={awal?.hari ?? 1} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
            {LABEL_HARI.map((h, i) => (
              <option key={h} value={i}>
                {h}
              </option>
            ))}
          </select>
          <Galat nama="hari" />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Jam tenggat</span>
        <Input name="jamTenggat" type="time" required defaultValue={awal?.jamTenggat ?? "08:00"} />
        <Galat nama="jamTenggat" />
      </label>
    </>
  );
}

export type AwalItemSet = { id: string; judul: string; uraian: string | null; frekuensi: "harian" | "pekanan"; hari: number | null; jamTenggat: string; linkWajib: boolean };

/** Tambah/ubah satu tugas dalam Set Tugas. */
export function FormItemSet({ setId, awal, setelah }: { setId: string; awal?: AwalItemSet; setelah?: () => void }) {
  return (
    <FormAksi aksi={simpanItemSet.bind(null, setId, awal?.id ?? null)} tombol={awal ? "Simpan perubahan" : "Tambah tugas"} tombolPenuh className="space-y-3" setelahBerhasil={setelah}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Judul tugas</span>
        <Input name="judul" required minLength={3} defaultValue={awal?.judul} placeholder="mis. Patroli area kantor" />
        <Galat nama="judul" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">
          Uraian <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <textarea name="uraian" rows={2} className={kelasTeks} defaultValue={awal?.uraian ?? ""} />
      </label>
      <IsianJadwal awal={awal} />
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-sm font-semibold text-heading">Link bukti wajib</span>
        <input type="checkbox" name="linkWajib" defaultChecked={awal?.linkWajib} className="size-5 accent-primary" />
      </label>
    </FormAksi>
  );
}

/** Usulan tugas rutin dari staf ke set tugas unitnya. */
export function FormUsulanRutin({ penugasanId, set, koordinator }: { penugasanId: string; set: { id: string; nama: string; n: number; aktif: boolean }[]; koordinator: string }) {
  const [pilih, setPilih] = useState(set.find((x) => x.aktif)?.id ?? set[0]?.id ?? "");
  const [putaran, setPutaran] = useState(0);
  return (
    <FormAksi key={putaran} aksi={ajukanUsulanRutin} tombol="Kirim usulan" tombolPenuh className="space-y-3" setelahBerhasil={() => setPutaran((x) => x + 1)}>
      <p className="text-[13px] leading-relaxed text-muted-foreground">Usulan dikirim ke {koordinator}. Bila disetujui, tugas ini masuk ke set tugas yang dipilih dan berlaku mulai besok.</p>
      <input type="hidden" name="penugasanId" value={penugasanId} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Judul tugas</span>
        <Input name="judul" required minLength={3} placeholder="mis. Cek APAR di tiap lantai" />
        <Galat nama="judul" />
      </label>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-heading">Masukkan ke set tugas</legend>
        <input type="hidden" name="setTugasId" value={pilih} />
        <div className="space-y-2">
          {set.map((x) => (
            <button key={x.id} type="button" aria-pressed={pilih === x.id} onClick={() => setPilih(x.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left", pilih === x.id ? "border-2 border-primary bg-primary/8" : "border border-input")}>
              <Folder className={cn("size-5", pilih === x.id ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", pilih === x.id && "font-semibold")}>{x.nama}</span>
                <span className="block text-xs text-muted-foreground">
                  {x.n} tugas{x.aktif ? " · aktif pekan ini" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
        <span className="mt-1 block text-xs text-muted-foreground">Koordinator tetap bisa memindahkan usulan ke set tugas lain.</span>
        <Galat nama="setTugasId" />
      </fieldset>
      <IsianJadwal />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Alasan</span>
        <textarea name="alasan" required minLength={5} rows={2} className={kelasTeks} />
        <Galat nama="alasan" />
      </label>
    </FormAksi>
  );
}
