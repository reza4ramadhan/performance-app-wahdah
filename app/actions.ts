"use server";

import { refresh } from "next/cache";
import { hitungPeriode, validasiSkorK3 } from "@/lib/kpi/engine";
import { NILAI_K3, type NilaiK3, type SkorK3 } from "@/lib/kpi/types";
import { URUTAN_STATUS } from "@/lib/data/schema";
import { cariPeriode, inputPeriode, periodeTerkunci, ubahDb } from "@/lib/data/store";

export type HasilAksi = { ok: boolean; pesan: string; galat?: string[] } | null;

// Belum ada login; semua aksi tercatat atas nama ini sampai modul akun dibangun (plan.md).
const PELAKU = "pengguna-dev";

class GalatAksi extends Error {}

async function jalankan(fn: () => Promise<string>): Promise<HasilAksi> {
  try {
    const pesan = await fn();
    refresh();
    return { ok: true, pesan };
  } catch (e) {
    if (e instanceof GalatAksi) return { ok: false, pesan: e.message };
    throw e;
  }
}

const angkaDari = (v: FormDataEntryValue | null) => {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new GalatAksi(`Nilai "${v}" bukan angka yang sah.`);
  return n;
};

export async function simpanRealisasi(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  return jalankan(() =>
    ubahDb((db, audit) => {
      const periodeId = String(fd.get("periodeId"));
      const penugasanId = String(fd.get("penugasanId"));
      if (periodeTerkunci(cariPeriode(db, periodeId))) throw new GalatAksi("Periode sudah disahkan dan terkunci.");
      const pn = db.penugasan.find((t) => t.id === penugasanId);
      if (!pn) throw new GalatAksi("Penugasan tidak ditemukan.");

      let jumlah = 0;
      for (const key of new Set([...fd.keys()].filter((k) => k.startsWith("pembilang|")))) {
        const [, kode, sub] = key.split("|");
        const suffix = `|${kode}|${sub}`;
        const pembilang = angkaDari(fd.get(`pembilang${suffix}`));
        const penyebut = angkaDari(fd.get(`penyebut${suffix}`));
        const subKode = sub || undefined;
        const idx = db.realisasi.findIndex(
          (r) => r.periodeId === periodeId && r.penugasanId === penugasanId && r.indikatorKode === kode && r.subKode === subKode,
        );
        const lama = idx >= 0 ? db.realisasi[idx] : undefined;
        if (pembilang === null && penyebut === null) {
          if (lama) {
            db.realisasi.splice(idx, 1);
            audit({ pelaku: PELAKU, aksi: "hapus-realisasi", periodeId, objek: `${penugasanId}/${kode}${sub ? `(${sub})` : ""}`, lama });
            jumlah++;
          }
          continue;
        }
        if (pembilang === null || penyebut === null) throw new GalatAksi(`${kode}${sub ? `(${sub})` : ""}: isi pembilang dan penyebut.`);
        const baru = {
          periodeId,
          penugasanId,
          indikatorKode: kode,
          subKode,
          pembilang,
          penyebut,
          terverifikasi: fd.get(`verif${suffix}`) === "on",
          bukti: String(fd.get(`bukti${suffix}`) ?? "").trim() || undefined,
        };
        if (lama && JSON.stringify(lama) === JSON.stringify({ ...lama, ...baru })) continue;
        if (idx >= 0) db.realisasi[idx] = baru;
        else db.realisasi.push(baru);
        audit({ pelaku: PELAKU, aksi: "ubah-realisasi", periodeId, objek: `${penugasanId}/${kode}${sub ? `(${sub})` : ""}`, lama, baru });
        jumlah++;
      }
      return jumlah ? `${jumlah} indikator tersimpan.` : "Tidak ada perubahan.";
    }),
  );
}

export async function simpanSkorK3(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = String(fd.get("periodeId"));
  const penugasanId = String(fd.get("penugasanId"));
  const skor = {} as Record<NilaiK3, number>;
  const contoh: Partial<Record<NilaiK3, string>> = {};
  for (const n of NILAI_K3) {
    skor[n] = Number(fd.get(`skor-${n}`));
    const c = String(fd.get(`contoh-${n}`) ?? "").trim();
    if (c) contoh[n] = c;
  }

  let galat: string[] = [];
  const hasil = await jalankan(() =>
    ubahDb((db, audit) => {
      if (periodeTerkunci(cariPeriode(db, periodeId))) throw new GalatAksi("Periode sudah disahkan dan terkunci.");
      const pn = db.penugasan.find((t) => t.id === penugasanId);
      if (!pn?.penilaiId) throw new GalatAksi("Penugasan belum punya penilai di peta penilai.");
      const s: SkorK3 = { penugasanId, penilaiId: pn.penilaiId, skor, contoh };
      galat = validasiSkorK3(s, pn.pegawaiId);
      if (galat.length) throw new GalatAksi("Skor belum bisa disimpan.");
      const idx = db.skorK3.findIndex((x) => x.periodeId === periodeId && x.penugasanId === penugasanId);
      const lama = idx >= 0 ? db.skorK3[idx] : undefined;
      const baru = { periodeId, ...s };
      if (idx >= 0) db.skorK3[idx] = baru;
      else db.skorK3.push(baru);
      audit({ pelaku: PELAKU, aksi: "ubah-k3", periodeId, objek: penugasanId, lama, baru });
      return "Skor K3 tersimpan.";
    }),
  );
  return hasil && !hasil.ok ? { ...hasil, galat } : hasil;
}

const KOLOM_ABSENSI = ["pegawai_id", "hari_kerja_wajib", "hadir", "tepat_waktu", "izin_sakit_sah", "sanksi_disiplin_berat"] as const;

export async function imporAbsensi(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = String(fd.get("periodeId"));
  const berkas = fd.get("berkas");
  let teks = String(fd.get("teks") ?? "");
  if (berkas instanceof File && berkas.size > 0) teks = await berkas.text();

  const galat: string[] = [];
  const hasil = await jalankan(() =>
    ubahDb((db, audit) => {
      if (periodeTerkunci(cariPeriode(db, periodeId))) throw new GalatAksi("Periode sudah disahkan dan terkunci.");
      const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
      if (baris.length < 2) throw new GalatAksi("Berkas kosong. Sertakan baris judul dan minimal satu baris data.");
      const pemisah = baris[0].includes(";") ? ";" : ",";
      const judul = baris[0].split(pemisah).map((k) => k.trim().toLowerCase());
      const hilang = KOLOM_ABSENSI.slice(0, 5).filter((k) => !judul.includes(k));
      if (hilang.length) throw new GalatAksi(`Kolom wajib tidak ada: ${hilang.join(", ")}.`);

      const rows = baris.slice(1).map((b, i) => {
        const sel = b.split(pemisah).map((s) => s.trim());
        const ambil = (k: string) => sel[judul.indexOf(k)] ?? "";
        const no = i + 2;
        const pegawaiId = ambil("pegawai_id");
        if (!db.pegawai.some((p) => p.id === pegawaiId)) galat.push(`Baris ${no}: pegawai "${pegawaiId}" tidak dikenal.`);
        const n = (k: string) => {
          const v = Number(ambil(k));
          if (!Number.isInteger(v) || v < 0) galat.push(`Baris ${no}: ${k} harus bilangan bulat ≥ 0.`);
          return v;
        };
        const r = {
          periodeId,
          pegawaiId,
          hariKerjaWajib: n("hari_kerja_wajib"),
          hadir: n("hadir"),
          tepatWaktu: n("tepat_waktu"),
          izinSakitSah: n("izin_sakit_sah"),
          sanksiDisiplinBerat: ["1", "ya", "true"].includes(ambil("sanksi_disiplin_berat").toLowerCase()),
        };
        if (r.hadir + r.izinSakitSah > r.hariKerjaWajib) galat.push(`Baris ${no}: hadir + izin/sakit melebihi hari kerja wajib.`);
        if (r.tepatWaktu > r.hadir) galat.push(`Baris ${no}: tepat waktu melebihi hadir.`);
        return r;
      });
      if (galat.length) throw new GalatAksi("Impor dibatalkan; perbaiki baris berikut.");

      for (const r of rows) {
        const idx = db.absensi.findIndex((a) => a.periodeId === periodeId && a.pegawaiId === r.pegawaiId);
        const lama = idx >= 0 ? db.absensi[idx] : undefined;
        if (idx >= 0) db.absensi[idx] = r;
        else db.absensi.push(r);
        audit({ pelaku: PELAKU, aksi: "impor-absensi", periodeId, objek: r.pegawaiId, lama, baru: r });
      }
      return `${rows.length} baris absensi diimpor.`;
    }),
  );
  return hasil && !hasil.ok ? { ...hasil, galat } : hasil;
}

export async function majukanStatus(_: HasilAksi, fd: FormData): Promise<HasilAksi> {
  const periodeId = String(fd.get("periodeId"));
  return jalankan(() =>
    ubahDb((db, audit) => {
      const p = cariPeriode(db, periodeId);
      const i = URUTAN_STATUS.indexOf(p.status);
      const berikut = URUTAN_STATUS[i + 1];
      if (!berikut) throw new GalatAksi("Periode sudah di status akhir.");
      if (berikut === "Disahkan") {
        const hasil = hitungPeriode(inputPeriode(db, periodeId));
        const belum = hasil.filter((h) => !h.hanyaK2 && h.ikp === null);
        if (belum.length) throw new GalatAksi(`Belum bisa disahkan: ${belum.length} pegawai belum lengkap datanya (${belum.map((b) => b.nama).join(", ")}).`);
        p.hasilBeku = hasil;
        p.disahkanPada = new Date().toISOString();
      }
      audit({ pelaku: PELAKU, aksi: "ubah-status-periode", periodeId, objek: periodeId, lama: p.status, baru: berikut });
      p.status = berikut;
      return `Status periode: ${berikut}.`;
    }),
  );
}
