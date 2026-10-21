"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bukaCatat } from "./cangkang";

export function TombolCatat({ besar = false, label = "Catat" }: { besar?: boolean; label?: string }) {
  return (
    <Button type="button" size={besar ? "lg" : "default"} onClick={bukaCatat} className={besar ? "w-full" : ""}>
      <Plus className="size-5" strokeWidth={2.4} /> {label}
    </Button>
  );
}
