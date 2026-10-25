"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CircleCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { masuk } from "@/app/aksi/akun";

/** Konfirmasi setelah ganti password (aksi gantiPassword mengarahkan ke /masuk?diganti=1). */
export function PesanDiganti() {
  if (useSearchParams().get("diganti") !== "1") return null;
  return (
    <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-mint-500/12 px-3.5 py-2.5 text-sm font-medium text-mint-700 dark:text-mint-100">
      <CircleCheck className="mt-0.5 size-4 shrink-0" /> Password berhasil diganti. Silakan masuk dengan password baru.
    </p>
  );
}

export function FormMasuk() {
  const [hasil, jalankan, proses] = useActionState(masuk, null);
  const [lihat, setLihat] = useState(false);
  const berhasil = hasil?.ok === true;
  // Pemuatan penuh membuang cache router dari sesi sebelumnya (lihat aksi `masuk`).
  useEffect(() => {
    if (berhasil) window.location.replace("/");
  }, [berhasil]);
  return (
    <form action={jalankan} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">NIP atau No. HP</span>
        <Input name="identitas" autoComplete="username" inputMode="text" required placeholder="mis. 2002 atau 0812…" className="h-12" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Password</span>
        <span className="relative block">
          <Input name="password" type={lihat ? "text" : "password"} autoComplete="current-password" required className="h-12 pr-12" />
          <button
            type="button"
            onClick={() => setLihat((v) => !v)}
            aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground"
          >
            {lihat ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </span>
      </label>
      {hasil && !hasil.ok && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {hasil.pesan}
        </p>
      )}
      <Button type="submit" size="lg" disabled={proses || berhasil} className="h-13 w-full rounded-full bg-ink text-base text-white hover:bg-ink/90 dark:bg-primary dark:text-primary-foreground">
        {proses ? "Memeriksa…" : berhasil ? "Membuka…" : "Masuk"} <ArrowRight className="size-5" />
      </Button>
    </form>
  );
}
