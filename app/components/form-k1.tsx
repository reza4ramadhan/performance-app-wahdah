"use client";

import { useState } from "react";
import { simpanRealisasi } from "../actions";
import { angka } from "@/lib/format";
import { AksiForm } from "./aksi-form";
import { Lencana, kelasInput } from "./ui";

export type BarisK1 = {
  /** Akhiran nama field: `|<kode>|<sub>` */
  akhiran: string;
  label: string;
  nama: string;
  target: number;
  sumberData: string;
  verifikasiKeuangan: boolean;
  penyebutKecil: boolean;
  awal?: { pembilang: number; penyebut: number; bukti?: string; terverifikasi?: boolean };
};

export function FormK1({
  periodeId,
  penugasanId,
  baris,
  turunan,
  batas,
  terkunci,
}: {
  periodeId: string;
  penugasanId: string;
  baris: BarisK1[];
  turunan: { kode: string; nama: string }[];
  batas: number;
  terkunci: boolean;
}) {
  return (
    <AksiForm action={simpanRealisasi} tombol="Simpan capaian" nonaktif={terkunci}>
      <input type="hidden" name="periodeId" value={periodeId} />
      <input type="hidden" name="penugasanId" value={penugasanId} />
      <div className="divide-y divide-line">
        {baris.map((b) => (
          <Baris key={b.akhiran} b={b} batas={batas} terkunci={terkunci} />
        ))}
        {turunan.map((t) => (
          <div key={t.kode} className="flex flex-wrap items-center gap-2 py-4 text-sm text-muted">
            <span className="font-mono text-xs">{t.kode}</span> {t.nama}
            <Lencana nada="brand">Otomatis dari K1 staf</Lencana>
          </div>
        ))}
      </div>
    </AksiForm>
  );
}

function Baris({ b, batas, terkunci }: { b: BarisK1; batas: number; terkunci: boolean }) {
  const [pembilang, setPembilang] = useState(b.awal?.pembilang?.toString() ?? "");
  const [penyebut, setPenyebut] = useState(b.awal?.penyebut?.toString() ?? "");

  const p = Number(pembilang.replace(",", "."));
  const q = Number(penyebut.replace(",", "."));
  let pratinjau: { teks: string; nada: "netral" | "brand" | "gold" | "flame" };
  if (pembilang === "" && penyebut === "") pratinjau = { teks: "Belum diisi", nada: "netral" };
  else if (pembilang === "" || penyebut === "" || !Number.isFinite(p) || !Number.isFinite(q)) pratinjau = { teks: "Isi keduanya", nada: "flame" };
  else if (q === 0) pratinjau = { teks: "Penyebut nol · dikecualikan", nada: "gold" };
  else {
    const realisasi = (p / q) * 100;
    pratinjau = { teks: `${angka(realisasi)}% → skor ${angka(Math.min(batas, (realisasi / b.target) * 100))}`, nada: "brand" };
  }

  return (
    <fieldset className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_96px_96px] lg:grid-cols-[minmax(0,1fr)_96px_96px_minmax(0,0.9fr)]" disabled={terkunci}>
      <legend className="sr-only">
        {b.label} {b.nama}
      </legend>
      <div className="min-w-0 sm:col-span-3 lg:col-span-1">
        <p className="text-sm font-medium text-ink">
          <span className="mr-1.5 font-mono text-xs text-muted">{b.label}</span>
          {b.nama}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Target {b.target}% · {b.sumberData}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Lencana nada={pratinjau.nada}>{pratinjau.teks}</Lencana>
          {b.penyebutKecil && <Lencana nada="gold">Penyebut kecil</Lencana>}
        </div>
      </div>
      <label className="text-xs text-muted">
        Pembilang
        <input name={`pembilang${b.akhiran}`} value={pembilang} onChange={(e) => setPembilang(e.target.value)} inputMode="decimal" className={`${kelasInput} tabular-nums`} />
      </label>
      <label className="text-xs text-muted">
        Penyebut
        <input name={`penyebut${b.akhiran}`} value={penyebut} onChange={(e) => setPenyebut(e.target.value)} inputMode="decimal" className={`${kelasInput} tabular-nums`} />
      </label>
      <div className="space-y-2 sm:col-span-3 lg:col-span-1">
        <label className="block text-xs text-muted">
          Bukti (tautan atau keterangan)
          <input name={`bukti${b.akhiran}`} defaultValue={b.awal?.bukti} placeholder="https://…" className={kelasInput} />
        </label>
        {b.verifikasiKeuangan && (
          <label className="flex items-center gap-2 text-xs text-body">
            <input type="checkbox" name={`verif${b.akhiran}`} defaultChecked={b.awal?.terverifikasi} className="size-4 accent-brand-600" />
            Terverifikasi Keuangan
          </label>
        )}
      </div>
    </fieldset>
  );
}
