// Grafik satu seri, satu warna (brand). Nilai selalu tertulis di setiap batang, sehingga
// tidak bergantung pada warna; tooltip lewat title; ada tabel sr-only untuk pembaca layar.

import { angka } from "@/lib/format";

type Baris = { label: React.ReactNode; kunci: string; nilai: number; ket?: string };

/** Batang mendatar — jumlah per kategori. */
export function BatangMendatar({ data, lebarLabel = 130 }: { data: Baris[]; lebarLabel?: number }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.kunci} className="grid items-center gap-3" style={{ gridTemplateColumns: `${lebarLabel}px 1fr 2rem` }} title={d.ket}>
          <span className="min-w-0">{d.label}</span>
          <span className="h-6 rounded-md bg-surface-2">
            {d.nilai > 0 && <span className="block h-6 rounded-r-md bg-brand-500" style={{ width: `${(d.nilai / maks) * 100}%` }} />}
          </span>
          <span className="text-right text-sm font-semibold tabular-nums text-ink">{d.nilai}</span>
        </li>
      ))}
    </ul>
  );
}

/** Batang tegak dengan sumbu 0–100. */
export function BatangTegak({ data, judul, catatan }: { data: { label: string; nilai: number; ket: string }[]; judul: string; catatan?: string }) {
  const TINGGI = 210;
  const maks = Math.max(100, ...data.map((d) => d.nilai));
  const garis = [0, 25, 50, 75, 100];
  const posisi = (v: number) => `${(v / maks) * 100}%`;
  return (
    <figure className="pt-5">
      <div className="flex gap-2">
        <div aria-hidden className="relative w-7 shrink-0 text-right text-[11px] tabular-nums text-muted" style={{ height: TINGGI }}>
          {garis.map((g) => (
            <span key={g} className="absolute right-0 translate-y-1/2" style={{ bottom: posisi(g) }}>
              {g}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ height: TINGGI }}>
            {garis.map((g) => (
              <span key={g} className={`absolute inset-x-0 border-t ${g === 0 ? "border-line" : "border-dashed border-line/70"}`} style={{ bottom: posisi(g) }} />
            ))}
          </div>
          <div className="relative flex justify-around gap-2">
            {data.map((d) => (
              <div key={d.label} className="group flex min-w-0 max-w-28 flex-1 flex-col items-center" title={d.ket}>
                <div className="flex w-full items-end justify-center" style={{ height: TINGGI }}>
                  <div className="relative w-full max-w-11 rounded-t-sm bg-brand-500 transition group-hover:bg-brand-600" style={{ height: posisi(d.nilai) }}>
                    <span className="absolute inset-x-0 -top-5 text-center text-xs font-semibold tabular-nums text-ink">{angka(d.nilai)}</span>
                  </div>
                </div>
                <span className="mt-2 text-center text-xs leading-tight text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {catatan && <figcaption className="mt-3 text-xs text-muted">{catatan}</figcaption>}
      <table className="sr-only">
        <caption>{judul}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.ket}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
