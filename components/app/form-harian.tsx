"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hapusJurnal, hapusPengembanganDiri, simpanJurnal, simpanJurnalSekaligus, simpanPengembanganDiri, ubahJurnal } from "@/app/aksi/harian";
import { FormAksi, Galat } from "./form-aksi";
import { kelasTeks } from "./kolom";
import { PilihCari } from "./pilih-cari";
import { Kartu } from "./ui";

const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1.5 block text-sm font-medium text-heading">{children}</span>;

type Unit = { id: string; nama: string };
type IsiJurnal = { uraian: string; jamMulai: string | null; jamSelesai: string | null; unitId: string | null; pemberiTugas: string | null; link: string | null };

/** Field satu poin jurnal. `ke`: urutan baris di isian sekaligus (galat bernama `uraian.0`, dst.). */
function IsianPoinJurnal({ unit, ke, awal, jamMulaiAwal }: { unit: Unit[]; ke?: number; awal?: IsiJurnal; jamMulaiAwal?: string }) {
  const g = (nama: string) => (ke === undefined ? nama : `${nama}.${ke}`);
  const mulai = useRef<HTMLInputElement>(null);
  const akhir = useRef<HTMLInputElement>(null);
  // Dicek di peramban juga: React mengosongkan form setelah aksi, jadi galat server berarti mengetik ulang.
  const cekJam = () => {
    const [a, b] = [mulai.current, akhir.current];
    b?.setCustomValidity(a?.value && b.value && b.value <= a.value ? "Jam selesai harus setelah jam mulai." : "");
  };
  return (
    <>
      <label className="block">
        <Label>Uraian pekerjaan</Label>
        <textarea name="uraian" required minLength={3} maxLength={500} rows={2} className={kelasTeks} defaultValue={awal?.uraian} placeholder="mis. Membantu persiapan rapat pimpinan" />
        <Galat nama={g("uraian")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <Label>Jam mulai</Label>
          <Input ref={mulai} type="time" name="jamMulai" required defaultValue={awal?.jamMulai ?? jamMulaiAwal} onChange={cekJam} />
          <Galat nama={g("jamMulai")} />
        </label>
        <label className="block">
          <Label>Jam selesai</Label>
          <Input ref={akhir} type="time" name="jamSelesai" required defaultValue={awal?.jamSelesai ?? undefined} onChange={cekJam} />
          <Galat nama={g("jamSelesai")} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {unit.length > 0 && (
          <label className="block">
            <Label>Bidang/SKUO</Label>
            <PilihCari name="unitId" opsi={unit} nilaiAwal={awal?.unitId} />
          </label>
        )}
        <label className={unit.length ? "block" : "col-span-2 block"}>
          <Label>Pemberi tugas</Label>
          <Input name="pemberiTugas" defaultValue={awal?.pemberiTugas ?? undefined} placeholder="mis. Ketua Bidang" />
        </label>
      </div>
      <label className="block">
        <Label>Link (opsional)</Label>
        <Input name="link" type="url" inputMode="url" defaultValue={awal?.link ?? undefined} placeholder="https://…" />
        <Galat nama={g("link")} />
      </label>
    </>
  );
}

function IsianTanggal({ tanggal, minTanggal, maksTanggal }: { tanggal: string; minTanggal?: string; maksTanggal: string }) {
  return minTanggal ? (
    <label className="block">
      <Label>Tanggal</Label>
      <Input type="date" name="tanggal" defaultValue={tanggal} min={minTanggal} max={maksTanggal} />
      <Galat nama="tanggal" />
    </label>
  ) : (
    <input type="hidden" name="tanggal" value={tanggal} />
  );
}

export function FormJurnalCepat({ tanggal, unit = [], minTanggal }: { tanggal: string; unit?: Unit[]; minTanggal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanJurnal} tombol="Simpan jurnal" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => ref.current?.querySelector("form")?.reset()}>
        <IsianTanggal tanggal={tanggal} minTanggal={minTanggal} maksTanggal={tanggal} />
        <IsianPoinJurnal unit={unit} />
      </FormAksi>
    </div>
  );
}

/** Banyak poin jurnal untuk satu tanggal; poin baru mulai dari jam selesai poin sebelumnya. */
export function FormJurnalSekaligus({ tanggal, unit, minTanggal }: { tanggal: string; unit: Unit[]; minTanggal: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const urut = useRef(1);
  const [baris, setBaris] = useState([{ k: 0, mulai: "" }]);
  const router = useRouter();
  const selesai = useCallback(() => {
    const tgl = ref.current?.querySelector<HTMLInputElement>("input[name=tanggal]")?.value ?? tanggal;
    router.push(`/jurnal?periode=${tgl.slice(0, 7)}`);
  }, [router, tanggal]);
  const tambah = () => {
    const akhir = [...(ref.current?.querySelectorAll<HTMLInputElement>("input[name=jamSelesai]") ?? [])].at(-1)?.value ?? "";
    setBaris((b) => [...b, { k: urut.current++, mulai: akhir }]);
  };
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanJurnalSekaligus} tombol={`Simpan ${baris.length} poin jurnal`} tombolPenuh className="space-y-4" setelahBerhasil={selesai}>
        <Kartu>
          <IsianTanggal tanggal={tanggal} minTanggal={minTanggal} maksTanggal={tanggal} />
        </Kartu>
        {baris.map((b, i) => (
          <Kartu key={b.k} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-heading">Poin {i + 1}</h2>
              {baris.length > 1 && (
                <button
                  type="button"
                  aria-label={`Hapus poin ${i + 1}`}
                  onClick={() => setBaris((xs) => xs.filter((x) => x.k !== b.k))}
                  className="grid size-11 place-items-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <IsianPoinJurnal unit={unit} ke={i} jamMulaiAwal={b.mulai} />
          </Kartu>
        ))}
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={tambah} disabled={baris.length >= 30}>
          <Plus className="size-4" /> Tambah poin
        </Button>
      </FormAksi>
    </div>
  );
}

/** Baris jurnal milik sendiri: tombol ubah dan hapus selama masih dalam jendela edit. */
export function BarisJurnalSaya({ jurnal, tanggal, unit, minTanggal, maksTanggal, children }: { jurnal: IsiJurnal & { id: string }; tanggal: string; unit: Unit[]; minTanggal: string; maksTanggal: string; children: React.ReactNode }) {
  const [ubah, setUbah] = useState(false);
  const tutup = useCallback(() => setUbah(false), []);
  if (!ubah)
    return (
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          aria-label="Ubah"
          onClick={() => setUbah(true)}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="size-4" />
        </button>
        <TombolHapus id={jurnal.id} jenis="jurnal" />
      </div>
    );
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-heading">Ubah jurnal</h3>
        <button type="button" onClick={tutup} className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          Batal
        </button>
      </div>
      <FormAksi aksi={ubahJurnal} tombol="Simpan perubahan" tombolPenuh className="space-y-3" setelahBerhasil={tutup}>
        <input type="hidden" name="id" value={jurnal.id} />
        <IsianTanggal tanggal={tanggal} minTanggal={minTanggal} maksTanggal={maksTanggal} />
        <IsianPoinJurnal unit={unit} awal={jurnal} />
      </FormAksi>
    </div>
  );
}

export function FormPdCepat({ tanggal, minTanggal }: { tanggal: string; minTanggal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanPengembanganDiri} tombol="Simpan catatan" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => ref.current?.querySelector("form")?.reset()}>
        {minTanggal ? (
          <label className="block">
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" defaultValue={tanggal} min={minTanggal} max={tanggal} />
            <Galat nama="tanggal" />
          </label>
        ) : (
          <input type="hidden" name="tanggal" value={tanggal} />
        )}
        <label className="block">
          <Label>Judul bacaan / materi</Label>
          <Input name="judul" required placeholder="mis. Kajian Riyadhus Shalihin" />
          <Galat nama="judul" />
        </label>
        <label className="block">
          <Label>Durasi (menit)</Label>
          <Input name="durasiMenit" type="number" inputMode="numeric" min={5} max={600} step={5} required defaultValue={30} />
          <Galat nama="durasiMenit" />
        </label>
        <label className="block">
          <Label>Ringkasan satu kalimat</Label>
          <Input name="ringkasan" required placeholder="Apa yang dipelajari?" />
          <Galat nama="ringkasan" />
        </label>
      </FormAksi>
    </div>
  );
}

export function TombolHapus({ id, jenis }: { id: string; jenis: "jurnal" | "pd" }) {
  const [proses, mulai] = useTransition();
  return (
    <button
      type="button"
      disabled={proses}
      aria-label="Hapus"
      onClick={() => {
        if (!window.confirm("Hapus catatan ini?")) return;
        mulai(async () => {
          const r = await (jenis === "jurnal" ? hapusJurnal(id) : hapusPengembanganDiri(id));
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
        });
      }}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
