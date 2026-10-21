"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pratinjauAbsensi, simpanAbsensi } from "@/app/aksi/absensi";
import { cn } from "@/lib/utils";

export function UnggahAbsensi({ periode }: { periode: string }) {
  const [hasil, jalankan, membaca] = useActionState(pratinjauAbsensi, null);
  const [menyimpan, mulai] = useTransition();
  const router = useRouter();
  const sah = hasil?.baris.filter((b) => !b.galat.length) ?? [];

  return (
    <div className="space-y-4">
      <form action={jalankan} className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition hover:border-primary/40">
          <Upload className="size-7 text-primary" />
          <span className="font-medium text-heading">Pilih berkas CSV atau Excel (.xlsx)</span>
          <span className="text-xs text-muted-foreground">Kolom: nip (atau no_hp), hari_kerja_wajib, hadir, hadir_tepat_waktu, izin_sakit, sanksi_berat</span>
          <input type="file" name="berkas" accept=".csv,.xlsx,text/csv" required className="mt-1 max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary" />
        </label>
        <Button type="submit" disabled={membaca} className="w-full">
          {membaca ? "Membaca…" : "Pratinjau"}
        </Button>
      </form>

      {hasil && (
        <section className="space-y-3">
          <p className={cn("rounded-xl px-4 py-3 text-sm font-medium", hasil.ok ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive")}>{hasil.pesan}</p>
          {hasil.baris.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Baris</th>
                    <th className="px-3 py-2">Pegawai</th>
                    <th className="px-3 py-2 text-right">Wajib</th>
                    <th className="px-3 py-2 text-right">Hadir</th>
                    <th className="px-3 py-2 text-right">Tepat</th>
                    <th className="px-3 py-2 text-right">Izin</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hasil.baris.map((b) => (
                    <tr key={b.baris} className={b.galat.length ? "bg-destructive/5" : ""}>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{b.baris}</td>
                      <td className="px-3 py-2">
                        {b.nama ?? "—"} <span className="text-xs text-muted-foreground">{b.identitas}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.hariKerjaWajib}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.hadir}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.hadirTepatWaktu}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.izinSakit}</td>
                      <td className="px-3 py-2">
                        {b.galat.length ? (
                          <span className="inline-flex items-start gap-1 text-xs text-destructive">
                            <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {b.galat.join("; ")}
                          </span>
                        ) : (
                          <CircleCheck className="size-4 text-mint-500" aria-label="Sah" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sah.length > 0 && (
            <Button
              size="lg"
              className="w-full"
              disabled={menyimpan}
              onClick={() =>
                mulai(async () => {
                  const r = await simpanAbsensi(periode, sah);
                  if (r.ok) toast.success(r.pesan);
                  else toast.error(r.pesan);
                  router.refresh();
                })
              }
            >
              Simpan {sah.length} baris yang sah
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
