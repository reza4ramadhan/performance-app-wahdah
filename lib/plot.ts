// Plot staf ke departemen (SKUO) — Manage tim koordinator unit A–M (docs/rombak-v2/04 butir 1.7).
// Fungsi murni: PJ kegiatan diambil dari plot yang berlaku pada tanggal kegiatan.

export type BarisPlot = { skuoId: string; pegawaiId: string; utama: boolean; aktif: boolean; berlakuMulai: string; dibuatPada: Date };

/**
 * Plot yang berlaku pada `tanggal`: per (skuo, pegawai) diambil baris terbaru yang `berlakuMulai` ≤ tanggal;
 * baris `aktif = false` mencabut plot. Perubahan plot di tengah bulan hanya memengaruhi kegiatan sesudah tanggal berlakunya.
 */
export function plotBerlaku(plot: readonly BarisPlot[], tanggal: string): BarisPlot[] {
  const terbaru = new Map<string, BarisPlot>();
  for (const p of plot) {
    if (p.berlakuMulai > tanggal) continue;
    const k = `${p.skuoId}|${p.pegawaiId}`;
    const lama = terbaru.get(k);
    if (!lama || p.berlakuMulai > lama.berlakuMulai || (p.berlakuMulai === lama.berlakuMulai && p.dibuatPada > lama.dibuatPada)) terbaru.set(k, p);
  }
  return [...terbaru.values()].filter((p) => p.aktif);
}

/**
 * PJ kegiatan sebuah departemen: staf ber-plot dengan tanda PJ utama, atau satu-satunya staf ber-plot.
 * Null bila belum ada plot, atau beberapa staf tanpa PJ utama (koordinator memilih sendiri).
 */
export function pjDariPlot(plot: readonly BarisPlot[], skuoId: string, tanggal: string): string | null {
  const di = plotBerlaku(plot, tanggal).filter((p) => p.skuoId === skuoId);
  const utama = di.filter((p) => p.utama);
  if (utama.length === 1) return utama[0].pegawaiId;
  return di.length === 1 ? di[0].pegawaiId : null;
}
