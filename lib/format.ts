// Format angka Indonesia (plan.md Bagian 7: tampilkan 2 desimal, simpan presisi penuh).

const duaDesimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

type Mungkin = number | null | undefined;
const kosong = (n: Mungkin): n is null | undefined => n === null || n === undefined || Number.isNaN(n);

/** 89,35 */
export const angka = (n: Mungkin) => (kosong(n) ? "—" : duaDesimal.format(n));
/** 89 */
export const bilangan = (n: Mungkin) => (kosong(n) ? "—" : bulat.format(n));
/** Pecahan 0,893 → "89%" */
export const persenBulat = (pecahan: Mungkin) => (kosong(pecahan) ? "—" : `${bulat.format(pecahan * 100)}%`);
/** Nilai 0–100 → "89,35%" */
export const persen = (n: Mungkin) => (kosong(n) ? "—" : `${duaDesimal.format(n)}%`);

/** "Ahmad Fauzan" → "AF" */
export const inisial = (nama: string) =>
  nama
    .replace(/^(Ust\.|Ustadz|Ustadzah)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join("")
    .toUpperCase();

/** Kelompokkan berurutan (pengganti Map.groupBy yang belum ada di Node 20). */
export function kelompokkan<T, K>(xs: T[], kunci: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of xs) {
    const k = kunci(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

/** Baris ringkas tugas khusus yang menunggu atasan: verifikasi jadwal dan persetujuan usulan. */
export function ringkasanTugasTim(tugas: number, usulan: number) {
  return [tugas && `${tugas} tugas ditandai selesai, menunggu verifikasi Anda`, usulan && `${usulan} usulan tugas menunggu persetujuan`].filter(Boolean).join(" · ");
}

/** "08:00", "10:30" → "08:00–10:30 (2 j 30 m)"; null bila jam belum diisi (jurnal lama). */
export function rentangJam(mulai: string | null, selesai: string | null) {
  if (!mulai || !selesai) return null;
  const menit = (j: string) => Number(j.slice(0, 2)) * 60 + Number(j.slice(3, 5));
  const d = menit(selesai) - menit(mulai);
  const durasi = [Math.floor(d / 60) && `${Math.floor(d / 60)} j`, d % 60 && `${d % 60} m`].filter(Boolean).join(" ");
  return `${mulai}–${selesai}${durasi ? ` (${durasi})` : ""}`;
}
