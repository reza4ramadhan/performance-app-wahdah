"use client";

import { useEffect, useState } from "react";
import type { GrupMenu } from "@/lib/menu";
import { SheetCatat, useKirimDraf, type PenugasanCatat, type PresetCatat } from "./catat";
import { NavBawah, Sidebar } from "./navigasi";
import { DaftarkanSW } from "./pwa";

export const EVENT_CATAT = "ikp:catat";

/** Buka sheet + Catat dari tombol mana pun, opsional dengan penugasan/indikator/kegiatan terpilih. */
export function bukaCatat(preset?: PresetCatat) {
  window.dispatchEvent(new CustomEvent<PresetCatat | undefined>(EVENT_CATAT, { detail: preset }));
}

export function Cangkang(p: {
  grup: GrupMenu[];
  kelola: boolean;
  labelKelola: string;
  nama: string;
  peran: string;
  penugasan: PenugasanCatat[];
  hariIni: string;
  minTanggal: string;
}) {
  const [buka, setBuka] = useState(false);
  // Setiap kali dibuka, sheet dipasang ulang agar isian mulai bersih.
  const [putaran, setPutaran] = useState(0);
  const [preset, setPreset] = useState<PresetCatat | undefined>();
  const bukaSheet = () => {
    setPreset(undefined);
    setPutaran((x) => x + 1);
    setBuka(true);
  };
  useKirimDraf();
  useEffect(() => {
    const h = (e: Event) => {
      setPreset((e as CustomEvent<PresetCatat | undefined>).detail);
      setPutaran((x) => x + 1);
      setBuka(true);
    };
    window.addEventListener(EVENT_CATAT, h);
    return () => window.removeEventListener(EVENT_CATAT, h);
  }, []);
  return (
    <>
      <DaftarkanSW />
      <Sidebar grup={p.grup} nama={p.nama} peran={p.peran} />
      <NavBawah kelola={p.kelola} labelKelola={p.labelKelola} onCatat={bukaSheet} />
      <SheetCatat key={putaran} buka={buka} setBuka={setBuka} penugasan={p.penugasan} hariIni={p.hariIni} minTanggal={p.minTanggal} preset={preset} />
    </>
  );
}
