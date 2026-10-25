"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { periksaK4, tetapkanK4, tolakK4Waka } from "@/app/aksi/k4";
import type { HasilAksi } from "@/lib/aksi";
import { POIN_K4, type TingkatK4 } from "@/lib/ikp/tipe";
import { kelasTeks } from "./kolom";
import { PilihCari } from "./pilih-cari";

function useJalankan() {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  return {
    proses,
    jalankan: (f: () => Promise<HasilAksi>) =>
      mulai(async () => {
        const r = await f();
        if (r.ok) toast.success(r.pesan);
        else toast.error(r.pesan);
        router.refresh();
      }),
  };
}

export function PeriksaK4({ id }: { id: string }) {
  const [catatan, setCatatan] = useState("");
  const { proses, jalankan } = useJalankan();
  return (
    <div className="mt-3 space-y-2">
      <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} placeholder="Catatan (wajib bila ditolak)" aria-label="Catatan" />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={proses} onClick={() => jalankan(() => periksaK4(id, true, catatan))}>
          Teruskan ke WaKa
        </Button>
        <Button variant="outline" disabled={proses} onClick={() => jalankan(() => periksaK4(id, false, catatan))}>
          Tolak
        </Button>
      </div>
    </div>
  );
}

const OPSI = (Object.entries(POIN_K4) as [TingkatK4, readonly number[]][]).flatMap(([t, ps]) => ps.map((p) => ({ nilai: `${t}:${p}`, label: `Tingkat ${t} · ${p} poin` })));

export function TetapkanK4({ id, usulan }: { id: string; usulan: TingkatK4 }) {
  const [pilih, setPilih] = useState(`${usulan}:${POIN_K4[usulan][0]}`);
  const [catatan, setCatatan] = useState("");
  const { proses, jalankan } = useJalankan();
  const [t, p] = pilih.split(":") as [TingkatK4, string];
  return (
    <div className="mt-3 space-y-2">
      <PilihCari opsi={OPSI.map((o) => ({ id: o.nilai, nama: o.label }))} nilai={pilih} saatBerubah={setPilih} kosong={null} aria-label="Tingkat dan poin" />
      <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} placeholder="Catatan (wajib bila ditolak)" aria-label="Catatan" />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={proses} onClick={() => jalankan(() => tetapkanK4(id, t, Number(p), catatan))}>
          Tetapkan
        </Button>
        <Button variant="outline" disabled={proses} onClick={() => jalankan(() => tolakK4Waka(id, catatan))}>
          Tolak
        </Button>
      </div>
    </div>
  );
}
