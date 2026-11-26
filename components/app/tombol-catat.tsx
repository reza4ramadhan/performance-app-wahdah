"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bukaCatat } from "./cangkang";
import type { PresetCatat } from "./catat";

export function TombolCatat({ besar = false, label = "Catat", preset, varian = "default" }: { besar?: boolean; label?: string; preset?: PresetCatat; varian?: "default" | "outline" | "ghost" }) {
  return (
    <Button type="button" variant={varian} size={besar ? "lg" : preset ? "sm" : "default"} onClick={() => bukaCatat(preset)} className={besar ? "w-full" : ""}>
      <Plus className={preset ? "size-4" : "size-5"} strokeWidth={2.4} /> {label}
    </Button>
  );
}

/** Tombol "+ Catat" melayang di atas navigasi bawah (tab Tugas Staf Administrasi). */
export function TombolCatatMengambang() {
  return (
    <button
      type="button"
      onClick={() => bukaCatat()}
      className="fixed right-4 z-30 inline-flex h-13 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 lg:static lg:h-11 lg:shadow-none"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
    >
      <Plus className="size-5" strokeWidth={2.4} aria-hidden /> Catat
    </button>
  );
}
