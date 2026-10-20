"use server";

import { refresh } from "next/cache";
import { hitungPeriode, validasiSkorK3 } from "@/lib/kpi/engine";
import { NILAI_K3, type NilaiK3, type SkorK3 } from "@/lib/kpi/types";
import { URUTAN_STATUS, type Db } from "@/lib/data/schema";
import { cariPeriode, inputPeriode, periodeTerkunci, ubahDb } from "@/lib/data/store";

export type HasilAksi = { ok: boolean; pesan: string; galat?: string[] } | null;

// Belum ada login; semua perubahan tercatat atas nama ini sampai modul akun dibangun (plan.md 3.1).
const PELAKU = "pengguna-dev";

/** Galat yang ditampilkan ke pengguna; galat lain dilempar ke error boundary. */
class GalatAksi extends Error {
  constructor(pesan: string, readonly galat: string[] = []) {
    super(pesan);
  }
}

async function jalankan(fn: () => Promise<string>): Promise<HasilAksi> {
  try {
    const pesan = await fn();
    refresh();
    return { ok: true, pesan };
  } catch (e) {
    if (e instanceof GalatAksi) return { ok: false, pesan: e.message, galat: e.galat };
    throw e;
  }
}

function pastikanTerbuka(db: Db, periodeId: string) {
  if (periodeTerkunci(cariPeriode(db, periodeId))) throw new GalatAksi("Periode sudah disahkan dan terkunci.");
}

const teks = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function angkaOpsional(fd: FormData, k: string) {
  const v = teks(fd, k);
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new GalatAksi(`Nilai "${v}" bukan angka yang sah.`);
  return n;
}

// ── K1 ────────────────────────────────────────────────────────────────────────

/** Field form: `pembilang|<kode>|<sub>`, `penyebut|…`, `bukti|…`, `verif|…`. */
export async function simpanRealisasi(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = teks(fd, "periodeId");
  const penugasanId = teks(fd, "penugasanId");
  return jalankan(() =>
    ubahDb((db, audit) => {
      pastikanTerbuka(db, periodeId);
      if (!db.penugasan.some((t) => t.id === penugasanId)) throw new GalatAksi("Penugasan tidak ditemukan.");

      let berubah = 0;
      for (const kunci of [...fd.keys()].filter((k) => k.startsWith("pembilang|"))) {
        const [, kode, sub] = kunci.split("|");
        const akhiran = `|${kode}|${sub}`;
        const label = `${kode}${sub ? `(${sub})` : ""}`;
        const subKode = sub || undefined;
        const pembilang = angkaOpsional(fd, `pembilang${akhiran}`);
        const penyebut = angkaOpsional(fd, `penyebut${akhiran}`);
        const idx = db.realisasi.findIndex(
          (r) => r.periodeId === periodeId && r.penugasanId === penugasanId && r.indikatorKode === kode && r.subKode === subKode,
        );
        const lama = idx >= 0 ? db.realisasi[idx] : undefined;

        if (pembilang === null && penyebut === null) {
          if (lama) {
            db.realisasi.splice(idx, 1);
            audit({ pelaku: PELAKU, aksi: "hapus-realisasi", periodeId, objek: `${penugasanId}/${label}`, lama });
            berubah++;
          }
          continue;
        }
        if (pembilang === null || penyebut === null) throw new GalatAksi(`${label}: isi pembilang dan penyebut, atau kosongkan keduanya.`);

        const baru = {
          periodeId,
          penugasanId,
          indikatorKode: kode,
          ...(subKode && { subKode }),
          pembilang,
          penyebut,
          terverifikasi: fd.get(`verif${akhiran}`) === "on",
          ...(teks(fd, `bukti${akhiran}`) && { bukti: teks(fd, `bukti${akhiran}`) }),
        };
        const sama = lama && lama.pembilang === baru.pembilang && lama.penyebut === baru.penyebut && !!lama.terverifikasi === baru.terverifikasi && lama.bukti === baru.bukti;
        if (sama) continue;
        if (idx >= 0) db.realisasi[idx] = baru;
        else db.realisasi.push(baru);
        audit({ pelaku: PELAKU, aksi: "ubah-realisasi", periodeId, objek: `${penugasanId}/${label}`, lama, baru });
        berubah++;
      }
      return berubah ? `${berubah} indikator tersimpan.` : "Tidak ada perubahan.";
    }),
  );
}

// ── K3 ────────────────────────────────────────────────────────────────────────

export async function simpanSkorK3(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = teks(fd, "periodeId");
  const penugasanId = teks(fd, "penugasanId");
  const skor = Object.fromEntries(NILAI_K3.map((n) => [n, Number(fd.get(`skor-${n}`))])) as Record<NilaiK3, number>;
  const contoh = Object.fromEntries(NILAI_K3.map((n) => [n, teks(fd, `contoh-${n}`)]).filter(([, v]) => v)) as SkorK3["contoh"];

  return jalankan(() =>
    ubahDb((db, audit) => {
      pastikanTerbuka(db, periodeId);
      const pn = db.penugasan.find((t) => t.id === penugasanId);
      if (!pn?.penilaiId) throw new GalatAksi("Penugasan ini belum punya penilai di peta penilai.");
      const s: SkorK3 = { penugasanId, penilaiId: pn.penilaiId, skor, contoh };
      const galat = validasiSkorK3(s, pn.pegawaiId);
      if (galat.length) throw new GalatAksi("Skor belum bisa disimpan.", galat);

      const idx = db.skorK3.findIndex((x) => x.periodeId === periodeId && x.penugasanId === penugasanId);
      const lama = idx >= 0 ? db.skorK3[idx] : undefined;
      const baru = { periodeId, ...s };
      if (idx >= 0) db.skorK3[idx] = baru;
      else db.skorK3.push(baru);
      audit({ pelaku: PELAKU, aksi: "ubah-k3", periodeId, objek: penugasanId, lama, baru });
      return "Skor K3 tersimpan.";
    }),
  );
}

// ── K2 ────────────────────────────────────────────────────────────────────────

const KOLOM_WAJIB = ["pegawai_id", "hari_kerja_wajib", "hadir", "tepat_waktu", "izin_sakit_sah"];

/** CSV koma/titik koma. Kolom opsional: sanksi_disiplin_berat (1/ya/true). Satu baris salah = seluruh berkas ditolak. */
export async function imporAbsensi(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = teks(fd, "periodeId");
  const unggahan = fd.get("berkas");
  const isi = unggahan instanceof File && unggahan.size > 0 ? await unggahan.text() : teks(fd, "teks");

  return jalankan(() =>
    ubahDb((db, audit) => {
      pastikanTerbuka(db, periodeId);
      const baris = isi.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
      if (baris.length < 2) throw new GalatAksi("Berkas kosong. Sertakan baris judul dan minimal satu baris data.");
      const pemisah = baris[0].includes(";") ? ";" : ",";
      const judul = baris[0].split(pemisah).map((k) => k.trim().toLowerCase());
      const hilang = KOLOM_WAJIB.filter((k) => !judul.includes(k));
      if (hilang.length) throw new GalatAksi(`Kolom wajib tidak ada: ${hilang.join(", ")}.`);

      const galat: string[] = [];
      const data = baris.slice(1).map((b, i) => {
        const sel = b.split(pemisah).map((s) => s.trim());
        const ambil = (k: string) => sel[judul.indexOf(k)] ?? "";
        const no = i + 2;
        const bulat = (k: string) => {
          const v = Number(ambil(k));
          if (ambil(k) === "" || !Number.isInteger(v) || v < 0) galat.push(`Baris ${no}: ${k} harus bilangan bulat ≥ 0.`);
          return v;
        };
        const row = {
          periodeId,
          pegawaiId: ambil("pegawai_id"),
          hariKerjaWajib: bulat("hari_kerja_wajib"),
          hadir: bulat("hadir"),
          tepatWaktu: bulat("tepat_waktu"),
          izinSakitSah: bulat("izin_sakit_sah"),
          sanksiDisiplinBerat: ["1", "ya", "true"].includes(ambil("sanksi_disiplin_berat").toLowerCase()),
        };
        if (!db.pegawai.some((p) => p.id === row.pegawaiId)) galat.push(`Baris ${no}: pegawai "${row.pegawaiId}" tidak dikenal.`);
        if (row.hadir + row.izinSakitSah > row.hariKerjaWajib) galat.push(`Baris ${no}: hadir + izin/sakit melebihi hari kerja wajib.`);
        if (row.tepatWaktu > row.hadir) galat.push(`Baris ${no}: tepat waktu melebihi hadir.`);
        return row;
      });
      const ganda = data.map((d) => d.pegawaiId).filter((id, i, xs) => xs.indexOf(id) !== i);
      if (ganda.length) galat.push(`Pegawai muncul lebih dari sekali: ${[...new Set(ganda)].join(", ")}.`);
      if (galat.length) throw new GalatAksi("Impor dibatalkan. Perbaiki baris berikut lalu unggah ulang.", galat);

      for (const row of data) {
        const idx = db.absensi.findIndex((a) => a.periodeId === periodeId && a.pegawaiId === row.pegawaiId);
        const lama = idx >= 0 ? db.absensi[idx] : undefined;
        if (idx >= 0) db.absensi[idx] = row;
        else db.absensi.push(row);
        audit({ pelaku: PELAKU, aksi: "impor-absensi", periodeId, objek: row.pegawaiId, lama, baru: row });
      }
      return `${data.length} baris absensi diimpor.`;
    }),
  );
}

// ── Status periode ────────────────────────────────────────────────────────────

export async function majukanStatus(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = teks(fd, "periodeId");
  return jalankan(() =>
    ubahDb((db, audit) => {
      const p = cariPeriode(db, periodeId);
      const berikut = URUTAN_STATUS[URUTAN_STATUS.indexOf(p.status) + 1];
      if (!berikut) throw new GalatAksi("Periode sudah di status akhir.");

      if (berikut === "Disahkan") {
        const hasil = hitungPeriode(inputPeriode(db, periodeId));
        const belum = hasil.filter((h) => !h.hanyaK2 && h.ikp === null);
        if (belum.length)
          throw new GalatAksi(`Belum bisa disahkan: ${belum.length} pegawai datanya belum lengkap.`, belum.map((b) => `${b.nama}: ${b.kekurangan.join("; ")}`));
        p.hasilBeku = hasil;
        p.disahkanPada = new Date().toISOString();
      }
      audit({ pelaku: PELAKU, aksi: "ubah-status-periode", periodeId, objek: periodeId, lama: p.status, baru: berikut });
      p.status = berikut;
      return `Status periode sekarang: ${berikut}.`;
    }),
  );
}
