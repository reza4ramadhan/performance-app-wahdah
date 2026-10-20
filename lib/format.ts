// Format angka Indonesia: 89,35 dan Rp1.340.250 (PRD Bagian 6).

const desimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const angka = (n: number | null | undefined) => (n === null || n === undefined ? "—" : desimal.format(n));

export const rupiah = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `Rp${bulat.format(n)}`);

export const persen = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${desimal.format(n)}%`);
