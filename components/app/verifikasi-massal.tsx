"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PutusanItem } from "./aksi-item";
import { Lencana } from "./ui";

export type ItemAntrean = { id: string; judul: string; pemilik: string; kode: string; pendek: string; diajukan: string; selesai: string; linkBukti: string | null; lambat: boolean };

/** Daftar item menunggu verifikasi dengan centang massal (plan.md Bagian 8 butir 9). */
export function VerifikasiMassal({ items }: { items: ItemAntrean[] }) {
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const semua = pilih.size === items.length && items.length > 0;
  const ubah = (id: string) =>
    setPilih((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <label className="mb-2 flex min-h-11 items-center gap-3 px-1 text-sm font-medium">
        <Checkbox checked={semua} onCheckedChange={() => setPilih(semua ? new Set() : new Set(items.map((i) => i.id)))} className="size-5" />
        Pilih semua ({items.length})
      </label>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
            <Checkbox checked={pilih.has(i.id)} onCheckedChange={() => ubah(i.id)} aria-label={`Pilih ${i.judul}`} className="mt-0.5 size-5" />
            <div className="min-w-0 flex-1">
              <Link href={`/item/${i.id}`} className="block truncate text-[15px] font-semibold text-heading hover:underline">
                {i.judul}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {i.pemilik} · {i.kode} {i.pendek} · selesai {i.selesai}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {i.lambat && <Lencana nada="gold">Diajukan &gt; 1 hari kerja lalu</Lencana>}
                {i.linkBukti ? (
                  <a href={i.linkBukti} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary">
                    Buka bukti <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <Lencana nada="flame">Tanpa bukti</Lencana>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pilih.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-64">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-3 shadow-xl">
            <PutusanItem ids={[...pilih]} />
          </div>
        </div>
      )}
    </>
  );
}
