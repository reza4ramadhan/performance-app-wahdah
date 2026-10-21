"use client";

// Jenis + Induk unit: pilihan induk menyesuaikan jenis (SKUO hanya di bawah bidang).

import { useState } from "react";
import { Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";

type Opsi = { id: string; nama: string; jenis: string };

/** Jenis induk yang sah per jenis unit; tidak tercantum = induk bebas. */
const INDUK_WAJIB: Record<string, string> = { skuo: "bidang" };

export function JenisInduk({ jenisLabel, unit, awal }: { jenisLabel: Record<string, string>; unit: Opsi[]; awal?: { id: string; jenis: string; indukId: string | null } }) {
  const [jenis, setJenis] = useState(awal?.jenis ?? "bidang");
  const [indukId, setIndukId] = useState(awal?.indukId ?? "");
  const syarat = INDUK_WAJIB[jenis];
  const pilihan = unit.filter((x) => x.id !== awal?.id && (!syarat || x.jenis === syarat));
  // Induk yang tidak cocok dengan jenis baru dikosongkan agar tidak ikut terkirim.
  const induk = pilihan.some((x) => x.id === indukId) ? indukId : "";

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Jenis</span>
        <select name="jenis" className={kelasPilihan} value={jenis} onChange={(e) => setJenis(e.target.value)}>
          {Object.entries(jenisLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">{syarat ? "Induk (bidang)" : "Induk"}</span>
        <select name="indukId" className={kelasPilihan} value={induk} onChange={(e) => setIndukId(e.target.value)} required={Boolean(syarat)}>
          <option value="">{syarat ? "Pilih bidang…" : "—"}</option>
          {pilihan.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nama}
            </option>
          ))}
        </select>
        <Galat nama="indukId" />
      </label>
    </div>
  );
}
