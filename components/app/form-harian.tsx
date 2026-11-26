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
import { cn } from "@/lib/utils";
import { Kartu } from "./ui";

const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1.5 block text-sm font-medium text-heading">{children}</span>;

type Unit = { id: string; nama: string };
type IsiJurnal = { uraian: string; durasiMenit: number | null; link: string | null };

/** Pilihan durasi (rombak v2): 15 mnt, 30 mnt, 1 jam, 2 jam, atau isian lain (menit). Nilai dikirim lewat `name`. */
export function PilihDurasi({ name = "durasiMenit", awal, pilihan = [15, 30, 60, 120], label }: { name?: string; awal?: number | null; pilihan?: number[]; label: string }) {
  const [menit, setMenit] = useState<number | null>(awal ?? null);
  const [lain, setLain] = useState(awal != null && !pilihan.includes(awal));
  const teks = (m: number) => (m < 60 ? `${m} mnt` : `${m / 60} jam`);
  const kelas = (on: boolean) =>
    cn("h-10 rounded-xl border text-[13px] transition", on ? "border-2 border-primary bg-primary/10 font-semibold text-brand-700 dark:text-brand-200" : "border-input bg-card text-foreground");
  return (
    <div className="space-y-2">
      <div role="group" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pilihan.length + 1}, minmax(0, 1fr))` }}>
        {pilihan.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={!lain && menit === m}
            className={kelas(!lain && menit === m)}
            onClick={() => {
              setLain(false);
              setMenit(m);
            }}
          >
            {teks(m)}
          </button>
        ))}
        <button type="button" aria-pressed={lain} className={kelas(lain)} onClick={() => setLain(true)}>
          Lain
        </button>
      </div>
      {lain ? (
        <Input
          name={name}
          type="number"
          inputMode="numeric"
          min={5}
          max={720}
          step={5}
          required
          aria-label={`${label}, dalam menit`}
          placeholder="Menit, mis. 45"
          defaultValue={menit ?? undefined}
          onChange={(e) => setMenit(Number(e.target.value) || null)}
        />
      ) : (
        <input type="hidden" name={name} value={menit ?? ""} />
      )}
    </div>
  );
}

/** Field satu entri jurnal: uraian, durasi, link opsional. `ke`: urutan baris di isian sekaligus (galat bernama `uraian.0`, dst.). */
function IsianPoinJurnal({ ke, awal }: { ke?: number; awal?: IsiJurnal }) {
  const g = (nama: string) => (ke === undefined ? nama : `${nama}.${ke}`);
  const n = ke === undefined ? "" : ` ${ke + 1}`;
  return (
    <>
      <label className="block">
        <span className="sr-only">Uraian pekerjaan{n}</span>
        <textarea name="uraian" required minLength={3} maxLength={500} rows={2} className={kelasTeks} defaultValue={awal?.uraian} placeholder="Pekerjaan di luar indikator, mis. membantu persiapan rapat pimpinan" />
        <Galat nama={g("uraian")} />
      </label>
      <div>
        <PilihDurasi label={`Durasi pekerjaan${n}`} awal={awal?.durasiMenit ?? 30} />
        <Galat nama={g("durasiMenit")} />
      </div>
      <label className="block">
        <span className="sr-only">Link pekerjaan{n} (opsional)</span>
        <Input name="link" type="url" inputMode="url" defaultValue={awal?.link ?? undefined} placeholder="Link (opsional)" />
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

export function FormJurnalCepat({ tanggal, minTanggal }: { tanggal: string; unit?: Unit[]; minTanggal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <FormAksi aksi={simpanJurnal} tombol="Simpan jurnal" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => ref.current?.querySelector("form")?.reset()}>
        <IsianTanggal tanggal={tanggal} minTanggal={minTanggal} maksTanggal={tanggal} />
        <IsianPoinJurnal />
      </FormAksi>
    </div>
  );
}

/**
 * Jurnal kerja format isi sekaligus (rombak v2, mockup Adm-6): beberapa entri dalam satu form, tiap entri uraian +
 * durasi + link opsional. Setelah tersimpan form dikosongkan kembali ke satu baris.
 */
export function FormJurnalSekaligus({ tanggal, minTanggal }: { tanggal: string; unit?: Unit[]; minTanggal?: string }) {
  const urut = useRef(1);
  const [baris, setBaris] = useState([{ k: 0 }]);
  // Form dipasang ulang setelah berhasil agar isian dan jumlah baris kembali bersih.
  const [putaran, setPutaran] = useState(0);
  const router = useRouter();
  const selesai = useCallback(() => {
    setBaris([{ k: urut.current++ }]);
    setPutaran((x) => x + 1);
    router.refresh();
  }, [router]);
  const tambah = () => setBaris((b) => [...b, { k: urut.current++ }]);
  return (
    <div key={putaran}>
      <FormAksi aksi={simpanJurnalSekaligus} tombol={baris.length > 1 ? `Simpan ${baris.length} entri` : "Simpan"} tombolPenuh className="space-y-3" setelahBerhasil={selesai}>
        <IsianTanggal tanggal={tanggal} minTanggal={minTanggal} maksTanggal={tanggal} />
        {baris.map((b, i) => (
          <Kartu key={b.k} className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12.5px] font-semibold text-muted-foreground">Pekerjaan {i + 1}</h2>
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
            <IsianPoinJurnal ke={i} />
          </Kartu>
        ))}
        <Button type="button" variant="outline" className="w-full border-dashed text-primary" onClick={tambah} disabled={baris.length >= 30}>
          <Plus className="size-4" /> Tambah baris
        </Button>
      </FormAksi>
    </div>
  );
}

/** Baris jurnal milik sendiri: tombol ubah dan hapus selama masih dalam jendela edit. */
export function BarisJurnalSaya({ jurnal, tanggal, minTanggal, maksTanggal, children }: { jurnal: IsiJurnal & { id: string }; tanggal: string; unit?: Unit[]; minTanggal: string; maksTanggal: string; children: React.ReactNode }) {
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
        <IsianPoinJurnal awal={jurnal} />
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
        <div>
          <Label>Durasi</Label>
          <PilihDurasi label="Durasi belajar" awal={30} pilihan={[15, 30, 60]} />
          <Galat nama="durasiMenit" />
        </div>
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
