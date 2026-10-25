"use client";

// Peran kerja + Unit: Kepala Kantor dan WaKa membawahi seluruh kantor, jadi unit tidak perlu dipilih.

import { useState } from "react";
import { Galat } from "@/components/app/form-aksi";
import { PilihCari } from "@/components/app/pilih-cari";

const PIMPINAN = ["KAKAN", "WAKA"];

export function PeranUnit({
  peran,
  unit,
  peranAwal = "SBK",
  unitAwal,
}: {
  peran: { nilai: string; label: string }[];
  unit: { id: string; nama: string }[];
  peranAwal?: string;
  unitAwal?: string;
}) {
  const [peranKerja, setPeranKerja] = useState(peranAwal);
  const pimpinan = PIMPINAN.includes(peranKerja);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Peran kerja</span>
        <PilihCari name="peranKerja" opsi={peran.map((p) => ({ id: p.nilai, nama: p.label }))} nilaiAwal={peranAwal} kosong={null} saatBerubah={setPeranKerja} />
      </label>
      {pimpinan ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-heading">Unit</span>
          <p className="flex min-h-11 items-center text-sm text-muted-foreground">Seluruh kantor</p>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">Unit</span>
          <PilihCari name="unitId" opsi={unit} nilaiAwal={unitAwal} kosong="Pilih…" />
          <Galat nama="unitId" />
        </label>
      )}
    </div>
  );
}
