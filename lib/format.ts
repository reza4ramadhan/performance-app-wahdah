// Format angka Indonesia: 89,35 dan Rp1.340.250 (PRD Bagian 6).

const duaDesimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

type Mungkin = number | null | undefined;
const kosong = (n: Mungkin): n is null | undefined => n === null || n === undefined;

export const angka = (n: Mungkin) => (kosong(n) ? "—" : duaDesimal.format(n));
export const persen = (n: Mungkin) => (kosong(n) ? "—" : `${duaDesimal.format(n)}%`);
export const rupiah = (n: Mungkin) => (kosong(n) ? "—" : `Rp${bulat.format(n)}`);

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-10" → "Oktober 2026" */
export function labelPeriode(id: string) {
  const [tahun, bulan] = id.split("-");
  return `${BULAN[Number(bulan) - 1]} ${tahun}`;
}
