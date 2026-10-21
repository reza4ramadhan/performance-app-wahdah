"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Check, CircleCheck, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gantiPassword, keluar } from "@/app/aksi/akun";
import { cn } from "@/lib/utils";

const JEDA_DETIK = 3;

const kolom = [
  ["lama", "Password saat ini", "current-password"],
  ["baru", "Password baru", "new-password"],
  ["ulang", "Ulangi password baru", "new-password"],
] as const;

type Nama = (typeof kolom)[number][0];

export function FormGanti({ nama, harusGanti }: { nama: string; harusGanti: boolean }) {
  // Simpan teks pembuka saat pertama dimuat: setelah berhasil, sesi di server berubah
  // (harusGantiPassword = false) dan props ikut berubah saat halaman disegarkan.
  const [awal] = useState({ nama, harusGanti });
  const [hasil, jalankan, proses] = useActionState(gantiPassword, null);
  const [nilai, setNilai] = useState<Record<Nama, string>>({ lama: "", baru: "", ulang: "" });
  const [lihat, setLihat] = useState<Record<Nama, boolean>>({ lama: false, baru: false, ulang: false });
  const [sisa, setSisa] = useState(JEDA_DETIK);

  const berhasil = hasil?.ok === true;
  const galat = hasil && !hasil.ok ? (hasil.galat ?? {}) : {};
  const cocok = nilai.ulang.length > 0 && nilai.baru === nilai.ulang;
  const tidakCocok = nilai.ulang.length > 0 && nilai.baru !== nilai.ulang;

  useEffect(() => {
    if (!hasil) return;
    if (hasil.ok) toast.success("Password berhasil diganti. Silakan masuk kembali dengan password baru.");
    else if (!hasil.galat) toast.error(hasil.pesan);
  }, [hasil]);

  // Setelah berhasil: hitung mundur lalu keluar dan arahkan ke halaman masuk.
  useEffect(() => {
    if (!berhasil) return;
    if (sisa <= 0) {
      startTransition(() => keluar());
      return;
    }
    const t = setTimeout(() => setSisa((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [berhasil, sisa]);

  if (berhasil) {
    return (
      <div role="status" className="mt-8">
        <span className="grid size-14 place-items-center rounded-full bg-mint-500/15 text-mint-600 dark:text-mint-100">
          <CircleCheck className="size-8" />
        </span>
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight text-heading">Password berhasil diganti</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Silakan masuk kembali dengan password baru. Anda akan diarahkan ke halaman masuk dalam {Math.max(sisa, 0)} detik…
        </p>
        <Button type="button" size="lg" className="mt-8 w-full" onClick={() => setSisa(0)}>
          Masuk sekarang
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="mt-8 text-[28px] font-extrabold leading-tight tracking-tight text-heading">{awal.harusGanti ? "Buat password baru" : "Ganti password"}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {awal.harusGanti
          ? `Assalamu'alaikum, ${awal.nama}. Untuk keamanan, ganti password sementara dari Admin sebelum mulai.`
          : "Minimal 8 karakter. Setelah disimpan, Anda perlu masuk kembali dengan password baru."}
      </p>
      <form
        action={jalankan}
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          if (tidakCocok) e.preventDefault();
        }}
      >
        {kolom.map(([n, label, ac]) => {
          const salah = (n === "ulang" && tidakCocok) || Boolean(galat[n]);
          return (
            <label key={n} className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">{label}</span>
              <span className="relative block">
                <Input
                  name={n}
                  type={lihat[n] ? "text" : "password"}
                  autoComplete={ac}
                  required
                  minLength={n === "lama" ? 1 : 8}
                  value={nilai[n]}
                  onChange={(e) => setNilai((v) => ({ ...v, [n]: e.target.value }))}
                  aria-invalid={salah || undefined}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setLihat((v) => ({ ...v, [n]: !v[n] }))}
                  aria-label={lihat[n] ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground"
                >
                  {lihat[n] ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </span>
              {n === "ulang" && (cocok || tidakCocok) ? (
                <span
                  aria-live="polite"
                  className={cn("mt-1 flex items-center gap-1 text-xs font-medium", cocok ? "text-mint-600 dark:text-mint-100" : "text-destructive")}
                >
                  {cocok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {cocok ? "Password cocok." : "Password tidak sama dengan password baru."}
                </span>
              ) : (
                galat[n] && <span className="mt-1 block text-xs font-medium text-destructive">{galat[n]}</span>
              )}
            </label>
          );
        })}
        {hasil && !hasil.ok && hasil.galat && <p className="mt-3 text-sm font-medium text-destructive">{hasil.pesan}</p>}
        <Button type="submit" size="lg" disabled={proses || tidakCocok} className="mt-4 w-full">
          {proses ? "Memproses…" : "Simpan password"}
        </Button>
      </form>
    </>
  );
}
