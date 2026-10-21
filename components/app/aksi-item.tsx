"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hapusItem, ubahItem } from "@/app/aksi/item";
import { verifikasiItem } from "@/app/aksi/verifikasi";
import { indikatorDari } from "@/lib/ikp/katalog";
import { FieldItem, keIsian, nilaiAwal, type NilaiForm, type Pilihan } from "./form-item";
import { kelasTeks } from "./kolom";

/** Pemilik: ubah / ajukan / hapus. */
export function UbahItem({
  id,
  kode,
  awal,
  pilihan,
  hariIni,
  minTanggal,
  bisaHapus,
  bukaAwal,
}: {
  id: string;
  kode: string;
  awal: Partial<NilaiForm>;
  pilihan: Pilihan;
  hariIni: string;
  minTanggal: string;
  bisaHapus: boolean;
  bukaAwal: boolean;
}) {
  const bentuk = indikatorDari(kode)!.item!;
  const [buka, setBuka] = useState(bukaAwal);
  const [nilai, setNilai] = useState(() => nilaiAwal(bentuk, hariIni, awal));
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [proses, mulai] = useTransition();
  const router = useRouter();

  if (!buka)
    return (
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setBuka(true)}>
          <Pencil className="size-4" /> {awal.sudahSelesai ? "Ubah" : "Tandai selesai / ubah"}
        </Button>
        {bisaHapus && <TombolHapusItem id={id} />}
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mulai(async () => {
          const r = await ubahItem(id, keIsian(bentuk, nilai));
          if (!r.ok) {
            setGalat(r.galat ?? {});
            toast.error(r.pesan);
            return;
          }
          toast.success(r.pesan);
          setBuka(false);
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <FieldItem bentuk={bentuk} nilai={nilai} ubah={setNilai} galat={galat} pilihan={pilihan} hariIni={hariIni} minTanggal={minTanggal} />
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={proses}>
          {proses ? "Menyimpan…" : nilai.sudahSelesai ? "Simpan & ajukan verifikasi" : "Simpan"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={() => setBuka(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function TombolHapusItem({ id }: { id: string }) {
  const [proses, mulai] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Hapus item"
      disabled={proses}
      onClick={() => {
        if (!window.confirm("Hapus item ini?")) return;
        mulai(async () => {
          const r = await hapusItem(id);
          if (!r.ok) return void toast.error(r.pesan);
          toast.success(r.pesan);
          router.push("/item");
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

/** Verifikator: setujui atau tolak dengan alasan. */
export function PutusanItem({ ids, ringkas = false }: { ids: string[]; ringkas?: boolean }) {
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const kirim = (k: "setuju" | "tolak") =>
    mulai(async () => {
      const r = await verifikasiItem(ids, k, alasan);
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      setTolak(false);
      setAlasan("");
      router.refresh();
    });

  if (tolak)
    return (
      <div className="space-y-2">
        <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} placeholder="Alasan penolakan, mis. link bukti tidak bisa dibuka" className={kelasTeks} aria-label="Alasan penolakan" />
        <div className="flex flex-wrap gap-2">
          {["Link bukti tidak bisa dibuka", "Bukti tidak sesuai", "Tanggal tidak sesuai"].map((a) => (
            <button key={a} type="button" onClick={() => setAlasan(a)} className="min-h-9 rounded-full border border-border px-3 text-xs font-medium hover:border-primary/40">
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" disabled={proses || !alasan.trim()} onClick={() => kirim("tolak")}>
            Tolak {ids.length > 1 ? `${ids.length} item` : ""}
          </Button>
          <Button variant="outline" onClick={() => setTolak(false)}>
            Batal
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex gap-2">
      <Button className={ringkas ? "" : "flex-1"} disabled={proses || !ids.length} onClick={() => kirim("setuju")}>
        <Check className="size-4" /> Setujui {ids.length > 1 ? `${ids.length} item` : ""}
      </Button>
      <Button variant="outline" className={ringkas ? "" : "flex-1"} disabled={proses || !ids.length} onClick={() => setTolak(true)}>
        <X className="size-4" /> Tolak
      </Button>
    </div>
  );
}
