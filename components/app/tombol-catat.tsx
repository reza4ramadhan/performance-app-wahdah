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
