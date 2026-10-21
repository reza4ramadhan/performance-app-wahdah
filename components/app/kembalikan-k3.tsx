"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { kembalikanK3 } from "@/app/aksi/periode";
import { kelasTeks } from "./kolom";

export function KembalikanK3({ id }: { id: string }) {
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [proses, mulai] = useTransition();
  const router = useRouter();
  if (!buka)
    return (
      <Button size="sm" variant="outline" onClick={() => setBuka(true)}>
        <Undo2 className="size-4" /> Kembalikan
      </Button>
    );
  return (
    <div className="mt-2 w-full space-y-2">
      <textarea autoFocus value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} placeholder="mis. Skor 5 untuk Inovatif perlu contoh yang lebih spesifik" aria-label="Catatan kalibrasi" />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={proses || !catatan.trim()}
          onClick={() =>
            mulai(async () => {
              const r = await kembalikanK3(id, catatan);
              if (r.ok) toast.success(r.pesan);
              else toast.error(r.pesan);
              router.refresh();
            })
          }
        >
          Kembalikan ke penilai
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setBuka(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
