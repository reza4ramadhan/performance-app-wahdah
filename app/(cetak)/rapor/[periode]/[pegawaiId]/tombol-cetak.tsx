"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TombolCetak() {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="size-4" /> Cetak / simpan PDF
    </Button>
  );
}
