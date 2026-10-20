import type { HasilPegawai } from "@/lib/kpi/engine";

/** "SBK · Bidang 1, SBK · Bidang 2" — atau "Pimpinan" untuk yang hanya K2. */
export function labelPenugasan(h: HasilPegawai, namaUnit: Map<string, string>) {
  if (h.hanyaK2) return "Pimpinan — hanya K2";
  if (!h.penugasan.length) return "Belum ada penugasan";
  return [...new Set(h.penugasan.map((p) => `${p.peran} · ${namaUnit.get(p.unitId)}`))].join(", ");
}

/** Kalimat singkat tentang apa yang perlu ditindaklanjuti; null bila tidak ada. */
export function tindakan(h: HasilPegawai) {
  if (h.hanyaK2) return null;
  if (h.kekurangan.length) return { nada: "gold" as const, teks: h.kekurangan[0].replace(" dari semua koordinator", "") };
  if (!h.syarat.lolos) return { nada: "flame" as const, teks: h.syarat.alasan[0] };
  return null;
}
