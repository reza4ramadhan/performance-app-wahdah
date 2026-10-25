"use client";

// Isian item: field khusus indikator (≤ 5), tanggal default hari ini, link bukti wajib saat selesai.

import { CalendarClock, CircleCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { BentukItem } from "@/lib/ikp/katalog";
import { cn } from "@/lib/utils";
import { Chip, Kolom } from "./kolom";
import { PilihCari } from "./pilih-cari";

export type NilaiForm = {
  kegiatanId: string;
  masuk: string;
  selesai: string;
  linkBukti: string;
  data: Record<string, string>;
  sudahSelesai: boolean;
};

export type Pilihan = { kegiatan: { id: string; nama: string; tanggal: string }[]; skuo: { id: string; nama: string }[] };

const sekarangLokal = (hariIni: string) => {
  const d = new Date();
  return `${hariIni}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function nilaiAwal(bentuk: BentukItem, hariIni: string, awal?: Partial<NilaiForm>): NilaiForm {
  const def = (jenis: "tanggal" | "waktu") => (jenis === "tanggal" ? hariIni : sekarangLokal(hariIni));
  return {
    kegiatanId: awal?.kegiatanId ?? "",
    masuk: awal?.masuk ?? (bentuk.masuk ? def(bentuk.masuk.jenis) : ""),
    selesai: awal?.selesai ?? "",
    linkBukti: awal?.linkBukti ?? "",
    data: awal?.data ?? {},
    sudahSelesai: awal?.sudahSelesai ?? false,
  };
}

export function FieldItem({
  bentuk,
  nilai,
  ubah,
  galat,
  pilihan,
  hariIni,
  minTanggal,
  kunciKegiatan = false,
}: {
  bentuk: BentukItem;
  nilai: NilaiForm;
  ubah: (v: NilaiForm) => void;
  galat: Record<string, string>;
  pilihan: Pilihan | null;
  hariIni: string;
  minTanggal: string;
  /** Item otomatis: kegiatan tidak bisa diganti. */
  kunciKegiatan?: boolean;
}) {
  const set = (patch: Partial<NilaiForm>) => ubah({ ...nilai, ...patch });
  const tipeInput = (jenis: "tanggal" | "waktu") => (jenis === "tanggal" ? "date" : "datetime-local");
  const batasMin = (jenis: "tanggal" | "waktu") => (jenis === "tanggal" ? minTanggal : `${minTanggal}T00:00`);
  const batasMaks = (jenis: "tanggal" | "waktu") => (jenis === "tanggal" ? hariIni : `${hariIni}T23:59`);

  return (
    <div className="space-y-4">
      {bentuk.kegiatan !== "tidak" && (
        <Kolom label={bentuk.kegiatan === "opsional" ? "Kegiatan (opsional)" : "Kegiatan"} galat={galat.kegiatanId} bantuan={pilihan && !pilihan.kegiatan.length ? "Belum ada kegiatan bidang. Minta KSBK menginput kegiatan bulanan." : undefined}>
          <PilihCari
            opsi={(pilihan?.kegiatan ?? []).map((k) => ({ id: k.id, nama: `${k.tanggal.slice(8)}/${k.tanggal.slice(5, 7)} · ${k.nama}` }))}
            nilai={nilai.kegiatanId}
            saatBerubah={(x) => set({ kegiatanId: x })}
            kosong={bentuk.kegiatan === "opsional" ? "Tanpa kegiatan" : null}
            placeholder={!pilihan ? "Memuat…" : "Pilih kegiatan…"}
            aria-invalid={!!galat.kegiatanId}
            disabled={!pilihan || kunciKegiatan}
          />
        </Kolom>
      )}

      {bentuk.field.map((f) => {
        const v = nilai.data[f.nama] ?? "";
        const setV = (x: string) => set({ data: { ...nilai.data, [f.nama]: x } });
        const g = galat[`data.${f.nama}`];
        if (f.jenis === "pilihan")
          return (
            <div key={f.nama}>
              <p className="mb-1.5 text-sm font-medium text-heading">{f.label}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={f.label}>
                {f.opsi.map((o) => (
                  <Chip key={o} aktif={v === o} onClick={() => setV(o)} role="radio" aria-checked={v === o}>
                    {o}
                  </Chip>
                ))}
              </div>
              {g && <p className="mt-1 text-xs font-medium text-destructive">{g}</p>}
            </div>
          );
        if (f.jenis === "skuo")
          return (
            <Kolom key={f.nama} label={f.label} galat={g}>
              <Input list={`skuo-${f.nama}`} value={v} onChange={(e) => setV(e.target.value)} placeholder="Ketik atau pilih" autoComplete="off" />
              <datalist id={`skuo-${f.nama}`}>
                {pilihan?.skuo.map((s) => (
                  <option key={s.id} value={s.nama} />
                ))}
              </datalist>
            </Kolom>
          );
        return (
          <Kolom key={f.nama} label={f.label} galat={g}>
            <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={f.contoh} aria-invalid={!!g} />
          </Kolom>
        );
      })}

      {bentuk.masuk && (
        <Kolom label={bentuk.masuk.label} galat={galat.masuk}>
          <Input type={tipeInput(bentuk.masuk.jenis)} value={nilai.masuk} min={batasMin(bentuk.masuk.jenis)} max={batasMaks(bentuk.masuk.jenis)} onChange={(e) => set({ masuk: e.target.value })} aria-invalid={!!galat.masuk} />
        </Kolom>
      )}

      <div className="rounded-2xl border border-border bg-muted/40 p-1">
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Status item">
          {[
            { v: false, label: "Masih dikerjakan", Ikon: CalendarClock },
            { v: true, label: "Sudah selesai", Ikon: CircleCheck },
          ].map(({ v, label, Ikon }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={nilai.sudahSelesai === v}
              // Saat ditandai selesai, tanggal selesai default hari ini.
              onClick={() => set({ sudahSelesai: v, selesai: v ? nilai.selesai || (bentuk.selesai.jenis === "tanggal" ? hariIni : sekarangLokal(hariIni)) : "" })}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition",
                nilai.sudahSelesai === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
              )}
            >
              <Ikon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {nilai.sudahSelesai && (
        <>
          <Kolom label={bentuk.selesai.label} galat={galat.selesai}>
            <Input type={tipeInput(bentuk.selesai.jenis)} value={nilai.selesai} min={batasMin(bentuk.selesai.jenis)} max={batasMaks(bentuk.selesai.jenis)} onChange={(e) => set({ selesai: e.target.value })} aria-invalid={!!galat.selesai} />
          </Kolom>
          <Kolom label="Link bukti" galat={galat.linkBukti} bantuan="Bagikan dengan akses “siapa saja yang punya link” agar verifikator bisa membuka.">
            <Input type="url" inputMode="url" value={nilai.linkBukti} onChange={(e) => set({ linkBukti: e.target.value })} placeholder="https://drive.google.com/…" aria-invalid={!!galat.linkBukti} />
          </Kolom>
        </>
      )}
    </div>
  );
}

/** Ubah nilai form menjadi payload Server Action. */
export function keIsian(bentuk: BentukItem, n: NilaiForm) {
  return {
    kegiatanId: bentuk.kegiatan !== "tidak" ? n.kegiatanId || null : null,
    masuk: bentuk.masuk ? n.masuk : null,
    selesai: n.sudahSelesai ? n.selesai : null,
    linkBukti: n.sudahSelesai ? n.linkBukti : n.linkBukti || null,
    data: n.data,
  };
}
