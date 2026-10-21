"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HasilAksi } from "@/lib/aksi";

/** Tombol untuk Server Action yang sudah di-bind (mis. hapusKegiatan.bind(null, id)). */
export function TombolAksi({
  aksi,
  children,
  konfirmasi,
  varian = "outline",
  ukuran = "default",
  className,
  label,
}: {
  aksi: () => Promise<HasilAksi>;
  children: React.ReactNode;
  konfirmasi?: string;
  varian?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  ukuran?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}) {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={varian}
      size={ukuran}
      className={className}
      aria-label={label}
      disabled={proses}
      onClick={() => {
        if (konfirmasi && !window.confirm(konfirmasi)) return;
        mulai(async () => {
          const r = await aksi();
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
          router.refresh();
        });
      }}
    >
      {children}
    </Button>
  );
}
