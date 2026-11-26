"use client";

// Pending SPB (docs/rombak-v2/02 butir 1.8, mockup Adm-10 & Adm-11): staf menandai dana belum cair;
// koordinator unit mengonfirmasi tanggal dana cair (sementara menggantikan Bendahara).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { konfirmasiDanaCair, tandaiPendingSpb } from "@/app/aksi/item";
import type { HasilAksi } from "@/lib/aksi";
import { kelasTeks } from "./kolom";

function useAksi() {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const jalankan = (aksi: () => Promise<HasilAksi>, lalu?: () => void) =>
    mulai(async () => {
      const r = await aksi();
      if (r.ok) {
        toast.success(r.pesan);
        lalu?.();
      } else toast.error(r.pesan);
      router.refresh();
    });
  return { proses, jalankan };
}

/** Staf: tandai SPB pending, atau cabut tandanya. */
export function PendingSpb({ id, pending }: { id: string; pending: boolean }) {
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const { proses, jalankan } = useAksi();

  if (pending)
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm">
          <Hourglass className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
          <span>
            <strong className="text-heading">Pending: dana belum cair.</strong> Tenggat berhenti dan tidak dihitung terlambat sampai koordinator mengonfirmasi tanggal pencairan. Sejak tanggal cair, tenggat berjalan lagi: 7 hari.
          </span>
        </p>
        <Button variant="outline" size="sm" disabled={proses} onClick={() => jalankan(() => tandaiPendingSpb(id, "", true))}>
          Cabut pending (dana sudah cair)
        </Button>
      </div>
    );

  if (!buka)
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-heading">Dana SPP belum cair?</p>
          <p className="text-xs text-muted-foreground">Tandai pending. Tenggat berhenti sampai tanggal cair dikonfirmasi.</p>
        </div>
        <Button variant="outline" onClick={() => setBuka(true)}>
          Pending
        </Button>
      </div>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => tandaiPendingSpb(id, catatan), () => setBuka(false));
      }}
    >
      <p className="text-[15px] font-semibold text-heading">Pending: dana belum cair</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Tenggat SPB berhenti; tugas pindah ke bagian Pending dana dan tidak dihitung terlambat.</li>
        <li>Koordinator unit mengonfirmasi tanggal pencairan dana.</li>
        <li>Sejak tanggal cair, tenggat berjalan lagi: 7 hari.</li>
      </ol>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Catatan (opsional)</span>
        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} placeholder="mis. Dana DPP belum tersedia" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={proses}>
          {proses ? "Menyimpan…" : "Simpan sebagai pending"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setBuka(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

/** Koordinator: konfirmasi tanggal dana cair untuk SPB staf yang pending. */
export function KonfirmasiDanaCair({ id, hariIni }: { id: string; hariIni: string }) {
  const [tanggal, setTanggal] = useState(hariIni);
  const { proses, jalankan } = useAksi();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => konfirmasiDanaCair(id, tanggal));
      }}
    >
      <p className="text-sm text-muted-foreground">Staf menandai SPB ini pending karena dana belum cair. Isi tanggal pencairan; tenggat SPB berjalan lagi 7 hari sejak tanggal itu.</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Tanggal dana cair</span>
        <Input type="date" value={tanggal} max={hariIni} onChange={(e) => setTanggal(e.target.value)} required />
      </label>
      <Button type="submit" disabled={proses}>
        {proses ? "Menyimpan…" : "Konfirmasi dana cair"}
      </Button>
    </form>
  );
}
