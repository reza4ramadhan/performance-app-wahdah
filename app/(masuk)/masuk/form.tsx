"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { masuk } from "@/app/aksi/akun";

export function FormMasuk() {
  const [hasil, jalankan, proses] = useActionState(masuk, null);
  const [lihat, setLihat] = useState(false);
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
      <Button type="submit" size="lg" disabled={proses} className="h-13 w-full rounded-full bg-ink text-base text-white hover:bg-ink/90 dark:bg-primary dark:text-primary-foreground">
        {proses ? "Memeriksa…" : "Masuk"} <ArrowRight className="size-5" />
      </Button>
    </form>
  );
}
