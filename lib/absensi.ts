// Impor rekap absensi (plan.md Bagian 8 butir 19). Format final menunggu contoh file Personalia (Bagian 13.6);
// sementara: satu baris per pegawai, dicocokkan dengan NIP atau No. HP.

export type BarisMentah = Record<string, string>;
export type PegawaiCocok = { id: string; nama: string; nip: string | null; noHp: string | null };

export type BarisAbsensi = {
  baris: number;
  identitas: string;
  pegawaiId: string | null;
  nama: string | null;
  hariKerjaWajib: number;
  hadir: number;
  hadirTepatWaktu: number;
  izinSakit: number;
  sanksiBerat: boolean;
  galat: string[];
};

/** Nama kolom yang diterima → kunci baku. */
const SINONIM: Record<string, string> = {
  nip: "nip",
  no_hp: "no_hp",
  nohp: "no_hp",
  hp: "no_hp",
  nama: "nama",
  hari_kerja_wajib: "hari_kerja_wajib",
  hari_kerja: "hari_kerja_wajib",
  hadir: "hadir",
  hadir_tepat_waktu: "hadir_tepat_waktu",
  tepat_waktu: "hadir_tepat_waktu",
  izin_sakit: "izin_sakit",
  izin_sakit_sah: "izin_sakit",
  sanksi_berat: "sanksi_berat",
  sanksi_disiplin_berat: "sanksi_berat",
};
export const KOLOM_WAJIB = ["hari_kerja_wajib", "hadir", "hadir_tepat_waktu"];

const baku = (k: string) => SINONIM[k.trim().toLowerCase().replace(/[\s.-]+/g, "_")] ?? k.trim().toLowerCase();
const nomor = (x: string) => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0");

/** CSV koma / titik koma, mendukung nilai berkutip. */
export function bacaCsv(teks: string): BarisMentah[] {
  const baris = teks.replace(/^﻿/, "").split(/\r?\n/).filter((b) => b.trim());
  if (!baris.length) return [];
  const pemisah = (baris[0].match(/;/g)?.length ?? 0) > (baris[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const pecah = (b: string) => {
    const hasil: string[] = [];
    let cur = "";
    let kutip = false;
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c === '"') {
        if (kutip && b[i + 1] === '"') {
          cur += '"';
          i++;
        } else kutip = !kutip;
      } else if (c === pemisah && !kutip) {
        hasil.push(cur);
        cur = "";
      } else cur += c;
    }
    hasil.push(cur);
    return hasil.map((x) => x.trim());
  };
  const judul = pecah(baris[0]).map(baku);
  return baris.slice(1).map((b) => Object.fromEntries(pecah(b).map((v, i) => [judul[i] ?? `kolom${i}`, v])));
}

export const normalkanKolom = (rows: BarisMentah[]) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [baku(k), String(v ?? "").trim()])));

export function validasiAbsensi(rows: BarisMentah[], pegawai: PegawaiCocok[]): { baris: BarisAbsensi[]; galatUmum: string[] } {
  const galatUmum: string[] = [];
  if (!rows.length) return { baris: [], galatUmum: ["Berkas kosong."] };
  const kolom = new Set(Object.keys(rows[0]));
  const hilang = KOLOM_WAJIB.filter((k) => !kolom.has(k));
  if (!kolom.has("nip") && !kolom.has("no_hp")) hilang.unshift("nip atau no_hp");
  if (hilang.length) return { baris: [], galatUmum: [`Kolom wajib tidak ada: ${hilang.join(", ")}.`] };

  const byNip = new Map(pegawai.filter((p) => p.nip).map((p) => [nomor(p.nip!), p]));
  const byHp = new Map(pegawai.filter((p) => p.noHp).map((p) => [nomor(p.noHp!), p]));
  const terlihat = new Set<string>();

  const baris = rows.map((r, i): BarisAbsensi => {
    const galat: string[] = [];
    const identitas = nomor(r.nip || r.no_hp || "");
    const pg = (r.nip && byNip.get(nomor(r.nip))) || (r.no_hp && byHp.get(nomor(r.no_hp))) || null;
    if (!identitas) galat.push("NIP/No. HP kosong");
    else if (!pg) galat.push("Pegawai tidak dikenal");
    else if (terlihat.has(pg.id)) galat.push("Pegawai muncul lebih dari sekali");
    if (pg) terlihat.add(pg.id);

    const angka = (k: string, wajib = true) => {
      const v = r[k] ?? "";
      if (v === "" && !wajib) return 0;
      const n = Number(v.replace(",", "."));
      if (v === "" || !Number.isInteger(n) || n < 0) {
        galat.push(`${k.replace(/_/g, " ")} harus bilangan bulat ≥ 0`);
        return 0;
      }
      return n;
    };
    const hariKerjaWajib = angka("hari_kerja_wajib");
    const hadir = angka("hadir");
    const hadirTepatWaktu = angka("hadir_tepat_waktu");
    const izinSakit = angka("izin_sakit", false);
    if (hariKerjaWajib > 31 || hariKerjaWajib === 0) galat.push("Hari kerja wajib tidak masuk akal");
    if (hadir > hariKerjaWajib) galat.push("Hadir melebihi hari kerja wajib");
    if (hadirTepatWaktu > hadir) galat.push("Tepat waktu melebihi hadir");
    if (hadir + izinSakit > hariKerjaWajib) galat.push("Hadir + izin/sakit melebihi hari kerja wajib");

    return {
      baris: i + 2,
      identitas,
      pegawaiId: pg?.id ?? null,
      nama: pg?.nama ?? r.nama ?? null,
      hariKerjaWajib,
      hadir,
      hadirTepatWaktu,
      izinSakit,
      sanksiBerat: ["1", "ya", "y", "true", "berat"].includes((r.sanksi_berat ?? "").toLowerCase()),
      galat,
    };
  });
  return { baris, galatUmum };
}
