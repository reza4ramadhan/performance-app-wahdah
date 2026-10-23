// Rincian K1 per penugasan: Target, Realisasi, Capaian, Skor per indikator (dipakai Progres & Rapor).

import type { HasilIndikator } from "@/lib/ikp/k1";
import { angka, bilangan, persenBulat } from "@/lib/format";
import { indikatorDari } from "@/lib/ikp/katalog";
import { PARAMETER } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { Batang, Lencana } from "./ui";

export function DaftarIndikator({ indikator, ringkas = false }: { indikator: HasilIndikator[]; ringkas?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {indikator.map((i) => (
        <li key={i.kode} className="py-3 first:pt-0 last:pb-0">
          <BarisIndikator i={i} ringkas={ringkas} />
          {i.sub && (
            <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
              {i.sub.map((x) => (
                <li key={x.kode}>
                  <BarisIndikator i={x} ringkas kecil />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function BarisIndikator({ i, ringkas, kecil = false }: { i: HasilIndikator; ringkas: boolean; kecil?: boolean }) {
  const def = indikatorDari(i.kode);
  const turunan = i.kode === "KSBK-1" || i.kode === "KSBK-2";
  return (
    <div className={cn(i.dikecualikan && "opacity-70")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("min-w-0 font-medium text-heading", kecil ? "text-sm" : "text-[15px]")}>
          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{i.kode}</span>
          {i.nama}
        </p>
        <p className={cn("shrink-0 font-bold tabular-nums", i.dikecualikan ? "text-muted-foreground" : i.tambahan ? "text-mint-600" : "text-heading")}>
          {i.skor === null ? "—" : i.tambahan ? `+${angka(i.skor)}` : angka(i.skor)}
        </p>
      </div>
      {!i.dikecualikan && !i.tambahan && <Batang nilai={i.skor} className="mt-1.5" nada={i.skor !== null && i.skor < 70 ? "flame" : i.skor !== null && i.skor < 90 ? "gold" : "brand"} />}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {i.dikecualikan ? (
          <span>Dikeluarkan dari rata-rata: {i.alasan}</span>
        ) : i.tambahan ? (
          <span>
            Poin tambahan: {bilangan(i.realisasi)} × {angka(PARAMETER.tambahan.poin)} · maks. {bilangan(PARAMETER.tambahan.maks)}
          </span>
        ) : i.kode === "KSBK-2" ? (
          <span>
            Rata-rata K1 {bilangan(i.target)} staf: {angka(i.realisasi)} · acuan {bilangan(i.standar * 100)}
          </span>
        ) : turunan ? (
          <span>Rata-rata sub-indikator</span>
        ) : (
          <span>
            Target {bilangan(i.target)} · Realisasi {bilangan(i.realisasi)} · Capaian {persenBulat(i.capaian)} · Standar {persenBulat(i.standar)}
          </span>
        )}
        {i.volumeKecil && <Lencana nada="gold">Volume kecil</Lencana>}
      </div>
      {!ringkas && def?.aturan && !kecil && <p className="mt-1 text-xs text-muted-foreground/80">{def.aturan}</p>}
    </div>
  );
}
