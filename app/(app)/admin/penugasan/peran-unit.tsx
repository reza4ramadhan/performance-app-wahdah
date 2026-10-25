"use client";

// Peran kerja + Unit: Kepala Kantor dan WaKa membawahi seluruh kantor, jadi unit tidak perlu dipilih.

import { useState } from "react";
import { Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";

const PIMPINAN = ["KAKAN", "WAKA"];

export function PeranUnit({ peran, unit }: { peran: { nilai: string; label: string }[]; unit: { id: string; nama: string }[] }) {
  const [peranKerja, setPeranKerja] = useState("SBK");
  const pimpinan = PIMPINAN.includes(peranKerja);

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Peran kerja</span>
        <select name="peranKerja" className={kelasPilihan} value={peranKerja} onChange={(e) => setPeranKerja(e.target.value)}>
          {peran.map((p) => (
            <option key={p.nilai} value={p.nilai}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {pimpinan ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-heading">Unit</span>
          <p className="flex min-h-11 items-center text-sm text-muted-foreground">Seluruh kantor</p>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">Unit</span>
          <select name="unitId" className={kelasPilihan} defaultValue="">
            <option value="">Pilih…</option>
            {unit.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
          <Galat nama="unitId" />
        </label>
      )}
    </div>
  );
}
