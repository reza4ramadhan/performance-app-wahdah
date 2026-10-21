"use client";

import { useEffect, useState } from "react";
import type { GrupMenu } from "@/lib/menu";
import { SheetCatat, useKirimDraf, type PenugasanCatat } from "./catat";
import { NavBawah, Sidebar } from "./navigasi";
import { DaftarkanSW } from "./pwa";

export const EVENT_CATAT = "ikp:catat";

/** Buka sheet + Catat dari tombol mana pun. */
export function bukaCatat() {
  window.dispatchEvent(new Event(EVENT_CATAT));
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
  const bukaSheet = () => {
    setPutaran((x) => x + 1);
    setBuka(true);
  };
  useKirimDraf();
  useEffect(() => {
    const h = () => {
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
      <SheetCatat key={putaran} buka={buka} setBuka={setBuka} penugasan={p.penugasan} hariIni={p.hariIni} minTanggal={p.minTanggal} />
    </>
  );
}
