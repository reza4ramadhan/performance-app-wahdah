"use client";

// Tandai selesai tugas rutin / delegasi (rombak v2, mockup Rtn-1 & Rtn-3): centang cepat langsung dari daftar
// untuk tugas yang tidak meminta link bukti; selainnya lewat form singkat (link + catatan).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { perbaruiTugas } from "@/app/aksi/tugas";
import { cn } from "@/lib/utils";
import { kelasTeks } from "./kolom";

export function CentangCepat({ id, judul }: { id: string; judul: string }) {
  const [proses, mulai] = useTransition();
  const [ok, setOk] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={`Centang selesai: ${judul}`}
      disabled={proses || ok}
      onClick={() =>
        mulai(async () => {
          const r = await perbaruiTugas(id, { status: "selesai", catatan: "", linkBukti: "" });
          if (r.ok) {
            setOk(true);
            toast.success("Ditandai selesai. Menunggu diperiksa.");
          } else toast.error(r.pesan);
          router.refresh();
        })
      }
      className="-m-2 grid size-11 shrink-0 place-items-center"
    >
      <span className={cn("grid size-7 place-items-center rounded-full border-2 border-primary bg-card transition", (ok || proses) && "bg-primary text-primary-foreground")}>{(ok || proses) && <Check className="size-4" strokeWidth={3} />}</span>
    </button>
  );
}

export function FormSelesaiTugas({ id, linkWajib, tenggat, lewat }: { id: string; linkWajib: boolean; tenggat: string; lewat: boolean }) {
  const [link, setLink] = useState("");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [proses, mulai] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mulai(async () => {
          const r = await perbaruiTugas(id, { status: "selesai", catatan, linkBukti: link });
          if (!r.ok) {
            setGalat(r.galat ?? {});
            return void toast.error(r.pesan);
          }
          toast.success(r.pesan);
          router.push("/");
        });
      }}
    >
      <p className={cn("rounded-xl px-3 py-2.5 text-[13.5px]", lewat ? "bg-flame-500/10 text-flame-700 dark:text-flame-100" : "bg-mint-500/12 text-mint-700 dark:text-mint-100")}>
        Waktu selesai dicatat otomatis saat disimpan · tenggat {tenggat}
        {lewat ? " (sudah lewat)" : ""}.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">
          Link bukti {linkWajib ? <span className="text-flame-600">*</span> : <span className="font-normal text-muted-foreground">(opsional)</span>}
        </span>
        <Input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} required={linkWajib} placeholder="https://drive.google.com/…" aria-invalid={!!galat.linkBukti} />
        {galat.linkBukti && <span className="mt-1 block text-xs text-flame-600">{galat.linkBukti}</span>}
        {linkWajib && <span className="mt-1 block text-xs text-muted-foreground">Diminta koordinator untuk tugas ini. Atur akses: siapa saja yang punya link.</span>}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">
          Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} />
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={proses}>
        <Check className="size-5" /> {proses ? "Menyimpan…" : "Simpan dan ajukan"}
      </Button>
    </form>
  );
}
