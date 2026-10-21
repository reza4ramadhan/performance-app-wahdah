"use client";

// Form dengan Server Action + useActionState; menampilkan pesan dan galat per field.

import { createContext, use, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HasilAksi } from "@/lib/aksi";
import { cn } from "@/lib/utils";

type Aksi = (prev: HasilAksi | null, fd: FormData) => Promise<HasilAksi | null>;

const KonteksGalat = createContext<Record<string, string>>({});
/** Galat field dari hasil aksi terakhir. */
export const useGalat = () => use(KonteksGalat);

export function FormAksi({
  aksi,
  tombol,
  children,
  className,
  tombolPenuh = false,
  varian = "default",
  konfirmasi,
  toastBerhasil = true,
  setelahBerhasil,
  pesanTetap = false,
}: {
  aksi: Aksi;
  tombol: string;
  children?: React.ReactNode;
  className?: string;
  tombolPenuh?: boolean;
  varian?: "default" | "outline" | "destructive" | "secondary";
  konfirmasi?: string;
  toastBerhasil?: boolean;
  setelahBerhasil?: () => void;
  /** Tampilkan pesan berhasil di bawah form (mis. password sementara) selain toast. */
  pesanTetap?: boolean;
}) {
  const [hasil, jalankan, proses] = useActionState(aksi, null);
  useEffect(() => {
    if (!hasil) return;
    if (hasil.ok) {
      if (toastBerhasil) toast.success(hasil.pesan);
      setelahBerhasil?.();
    } else if (!hasil.galat) toast.error(hasil.pesan);
  }, [hasil, toastBerhasil, setelahBerhasil]);

  return (
    <KonteksGalat value={hasil && !hasil.ok ? (hasil.galat ?? {}) : {}}>
      <form
        action={jalankan}
        className={className}
        onSubmit={(e) => {
          if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault();
        }}
      >
        {children}
        {hasil && !hasil.ok && hasil.galat && <p className="mt-3 text-sm font-medium text-destructive">{hasil.pesan}</p>}
        {hasil?.ok && pesanTetap && (
          <p role="status" className="mt-3 rounded-xl bg-mint-500/12 px-3.5 py-2.5 text-sm font-medium text-mint-700 select-all dark:text-mint-100">
            {hasil.pesan}
          </p>
        )}
        <Button type="submit" variant={varian} size={tombolPenuh ? "lg" : "default"} disabled={proses} className={cn("mt-4", tombolPenuh && "w-full")}>
          {proses ? "Memproses…" : tombol}
        </Button>
      </form>
    </KonteksGalat>
  );
}

/** Pesan galat untuk satu field dari FormAksi terdekat. */
export function Galat({ nama }: { nama: string }) {
  const g = useGalat()[nama];
  return g ? <span className="mt-1 block text-xs font-medium text-destructive">{g}</span> : null;
}
