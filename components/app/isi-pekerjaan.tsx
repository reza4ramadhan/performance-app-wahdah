"use client";

// Baris pekerjaan di kartu Kegiatan SKUO: ketuk untuk langsung mengisi lewat bottom sheet, tanpa pindah halaman.
// Item yang sudah disetujui hanya membuka rinciannya.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleDashed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isiItemKegiatan, ubahItem } from "@/app/aksi/item";
import { indikatorDari } from "@/lib/ikp/katalog";
import type { StatusItem } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { IKON_STATUS } from "./baris-item";
import { FieldItem, keIsian, nilaiAwal, type NilaiForm } from "./form-item";
import { Lencana, LencanaStatus } from "./ui";

export type ItemPekerjaan = {
  id: string;
  status: StatusItem;
  sisa: { teks: string; nada: "netral" | "gold" | "flame" } | null;
  alasanTolak: string | null;
  awal: Partial<NilaiForm>;
};

type Props = {
  label: string;
  ket?: string;
  kode: string;
  /** Nomor pengingat (SBK-3). */
  ke?: string;
  kegiatan: { id: string; nama: string; tanggal: string };
  item?: ItemPekerjaan;
  hariIni: string;
  minTanggal: string;
};

export function BarisPekerjaan(p: Props) {
  const [buka, setBuka] = useState(false);
  const { Ikon, warna } = p.item ? IKON_STATUS[p.item.status] : { Ikon: CircleDashed, warna: "text-muted-foreground/50" };
  const kelas = "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left transition hover:bg-muted/60 active:bg-muted";
  const isi = (
    <>
      <Ikon className={cn("size-5 shrink-0", warna)} strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
        {p.label}
        {p.ket && <span className="font-normal text-muted-foreground"> · {p.ket}</span>}
      </span>
      {p.item ? p.item.sisa ? <Lencana nada={p.item.sisa.nada}>{p.item.sisa.teks}</Lencana> : <LencanaStatus status={p.item.status} /> : <Lencana>Belum ada</Lencana>}
    </>
  );

  if (p.item?.status === "disetujui")
    return (
      <Link href={`/item/${p.item.id}`} className={kelas}>
        {isi}
      </Link>
    );

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={kelas} aria-haspopup="dialog">
        {isi}
      </button>
      <Sheet open={buka} onOpenChange={setBuka}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-0 rounded-t-3xl p-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-3xl">
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/25 lg:hidden" />
          <SheetHeader className="px-5 pt-3 pb-2">
            <SheetTitle className="text-lg font-bold text-heading">
              {p.label}
              {p.ket && <span className="font-normal text-muted-foreground"> · {p.ket}</span>}
            </SheetTitle>
            <SheetDescription>{p.kegiatan.nama}</SheetDescription>
          </SheetHeader>
          {/* Isi sheet dipasang ulang setiap dibuka, jadi isian selalu mulai dari data terbaru. */}
          <FormPekerjaan {...p} tutup={() => setBuka(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormPekerjaan({ kode, ke, kegiatan, item, hariIni, minTanggal, tutup }: Props & { tutup: () => void }) {
  const def = indikatorDari(kode)!;
  const bentuk = def.item!;
  const [nilai, setNilai] = useState<NilaiForm>(() => {
    const awal = nilaiAwal(bentuk, hariIni, { kegiatanId: kegiatan.id, ...item?.awal });
    // Pekerjaan otomatis yang belum selesai dibuka langsung dalam mode "Sudah selesai": itu tujuan staf membukanya.
    return def.otomatis && !awal.sudahSelesai ? { ...awal, sudahSelesai: true, selesai: hariIni } : awal;
  });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [proses, mulai] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        mulai(async () => {
          const isian = keIsian(bentuk, nilai);
          const r = item ? await ubahItem(item.id, isian) : await isiItemKegiatan(kegiatan.id, kode, ke ?? null, isian);
          if (!r.ok) {
            setGalat(r.galat ?? {});
            toast.error(r.pesan);
            return;
          }
          toast.success(r.pesan);
          tutup();
          router.refresh();
        });
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        <p className="text-xs text-muted-foreground">{def.nama}</p>
        {item?.status === "ditolak" && item.alasanTolak && (
          <p className="rounded-2xl bg-flame-500/10 px-4 py-3 text-sm text-flame-700 dark:text-flame-100">
            <strong>Ditolak:</strong> {item.alasanTolak}. Perbaiki lalu ajukan lagi.
          </p>
        )}
        <FieldItem bentuk={bentuk} nilai={nilai} ubah={setNilai} galat={galat} pilihan={{ kegiatan: [kegiatan], skuo: [] }} hariIni={hariIni} minTanggal={minTanggal} kunciKegiatan />
        {item && (
          <Link href={`/item/${item.id}`} className="flex items-center gap-1 text-sm font-medium text-primary">
            Lihat rincian & riwayat <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="border-t border-border bg-card px-5 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <Button type="submit" size="lg" className="w-full" disabled={proses}>
          {proses ? "Menyimpan…" : nilai.sudahSelesai ? "Simpan & ajukan verifikasi" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
