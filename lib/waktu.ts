// Tanggal & hari kerja (plan.md Bagian 6 & 10).
// Semua tanggal kalender ditulis sebagai string "YYYY-MM-DD" di zona kantor pegawai.
// Waktu kejadian disimpan sebagai Date (UTC) di basis data.

export type Kantor = "makassar" | "jakarta";

/** Selisih jam terhadap UTC. Indonesia tidak memakai DST, jadi cukup angka tetap. */
export const OFFSET_JAM: Record<Kantor, number> = { makassar: 8, jakarta: 7 };
export const LABEL_ZONA: Record<Kantor, string> = { makassar: "WITA", jakarta: "WIB" };

const MS_HARI = 86_400_000;

const keDateUtc = (tgl: string) => new Date(`${tgl}T00:00:00Z`);
const dariDateUtc = (d: Date) => d.toISOString().slice(0, 10);

/** Tanggal kalender di zona kantor untuk sebuah instan waktu. */
export function tanggalLokal(waktu: Date, kantor: Kantor): string {
  return dariDateUtc(new Date(waktu.getTime() + OFFSET_JAM[kantor] * 3_600_000));
}

/** "HH:mm" di zona kantor. */
export function jamLokal(waktu: Date, kantor: Kantor): string {
  return new Date(waktu.getTime() + OFFSET_JAM[kantor] * 3_600_000).toISOString().slice(11, 16);
}

export function hariIni(kantor: Kantor, sekarang = new Date()) {
  return tanggalLokal(sekarang, kantor);
}

/** Tanggal (+ jam opsional) di zona kantor → instan UTC. */
export function keUtc(tanggal: string, kantor: Kantor, jam = "00:00"): Date {
  const [j, m] = jam.split(":").map(Number);
  return new Date(keDateUtc(tanggal).getTime() + ((j - OFFSET_JAM[kantor]) * 60 + m) * 60_000);
}

export function tambahHari(tgl: string, n: number) {
  return dariDateUtc(new Date(keDateUtc(tgl).getTime() + n * MS_HARI));
}

/** 0 = Minggu … 6 = Sabtu */
const hariDalamPekan = (tgl: string) => keDateUtc(tgl).getUTCDay();

export function isHariKerja(tgl: string, libur: ReadonlySet<string>) {
  const h = hariDalamPekan(tgl);
  return h !== 0 && h !== 6 && !libur.has(tgl);
}

/**
 * Jumlah hari kerja yang dilewati dari `dari` ke `sampai`.
 * Hari yang sama = 0, hari kerja berikutnya = 1. Bila `sampai` sebelum `dari` hasilnya negatif.
 * Dipakai untuk aturan "selesai ≤ N hari kerja".
 */
export function hariKerjaAntara(dari: string, sampai: string, libur: ReadonlySet<string>): number {
  if (sampai === dari) return 0;
  const maju = sampai > dari;
  let n = 0;
  for (let t = dari; t !== sampai; ) {
    t = tambahHari(t, maju ? 1 : -1);
    if (isHariKerja(t, libur)) n++;
  }
  return maju ? n : -n;
}

/** Tanggal setelah maju (n > 0) atau mundur (n < 0) sejumlah hari kerja. */
export function geserHariKerja(tgl: string, n: number, libur: ReadonlySet<string>) {
  let t = tgl;
  const arah = Math.sign(n);
  for (let sisa = Math.abs(n); sisa > 0; ) {
    t = tambahHari(t, arah);
    if (isHariKerja(t, libur)) sisa--;
  }
  return t;
}

// ── Periode (bulan kalender) ──────────────────────────────────────────────────

/** "2026-10-21" → "2026-10" */
export const periodeDari = (tgl: string) => tgl.slice(0, 7);

export function rentangPeriode(periode: string) {
  const [y, m] = periode.split("-").map(Number);
  const akhir = dariDateUtc(new Date(Date.UTC(y, m, 0)));
  return { awal: `${periode}-01`, akhir };
}

export function periodeBerikut(periode: string, n = 1) {
  const [y, m] = periode.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return dariDateUtc(d).slice(0, 7);
}

/** Semua hari kerja dalam periode, dibatasi sampai `sampai` (inklusif) bila diisi. */
export function hariKerjaPeriode(periode: string, libur: ReadonlySet<string>, sampai?: string) {
  const { awal, akhir } = rentangPeriode(periode);
  const batas = sampai && sampai < akhir ? sampai : akhir;
  const hasil: string[] = [];
  for (let t = awal; t <= batas; t = tambahHari(t, 1)) if (isHariKerja(t, libur)) hasil.push(t);
  return hasil;
}

/** Senin pekan ISO dari sebuah tanggal — kunci untuk tugas DTR mingguan. */
export function seninPekan(tgl: string) {
  const h = hariDalamPekan(tgl);
  return tambahHari(tgl, h === 0 ? -6 : 1 - h);
}

// ── Format tampilan ───────────────────────────────────────────────────────────

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const labelPeriode = (periode: string) => {
  const [y, m] = periode.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
};

/** "21 Okt" atau "21 Okt 2026" */
export function labelTanggal(tgl: string, denganTahun = false) {
  const [y, m, d] = tgl.split("-").map(Number);
  return `${d} ${BULAN_PENDEK[m - 1]}${denganTahun ? ` ${y}` : ""}`;
}

/** "Rabu, 21 Oktober 2026" */
export function labelTanggalPanjang(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return `${HARI[hariDalamPekan(tgl)]}, ${d} ${BULAN[m - 1]} ${y}`;
}
