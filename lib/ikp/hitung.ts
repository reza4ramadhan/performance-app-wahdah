// IKP bulanan per pegawai (plan.md Bagian 4 & 7). Fungsi murni.
// Presisi penuh; pembulatan hanya di tampilan dan ekspor.

import { hitungK1, rataRata, type HasilIndikator, type KonteksK1 } from "./k1";
import { K4_MAKS, NILAI_K3, PARAMETER, predikatDari, type PeranKerja, type Predikat, type SkorK3 } from "./tipe";
import type { Kantor } from "../waktu";

export type PegawaiHitung = { id: string; nama: string; kantor: Kantor };

export type PenugasanHitung = {
  id: string;
  pegawaiId: string;
  peran: PeranKerja;
  unitId: string;
  koordinatorId: string | null;
  /** Penilai K3 efektif (lib/akses.ts penilaiK3): koordinator, atau WaKa bila koordinator = dirinya sendiri. */
  penilaiK3Id: string | null;
  /** Bobot alokasi tertulis (mis. 60). Kosong = rata-rata sederhana. */
  bobotAlokasi: number | null;
};

export type AbsensiHitung = {
  pegawaiId: string;
  hariKerjaWajib: number;
  hadir: number;
  hadirTepatWaktu: number;
  izinSakit: number;
  sanksiBerat: boolean;
};

/** Penilaian K3 yang sudah dikirim penilai (bukan draf/dikembalikan). */
export type K3Hitung = { pegawaiId: string; penilaiId: string; skor: SkorK3 };

export type MasukanIkp = {
  k1: KonteksK1;
  pegawai: PegawaiHitung[];
  penugasan: PenugasanHitung[];
  absensi: AbsensiHitung[];
  k3: K3Hitung[];
  /** Pegawai yang punya log pengembangan diri bulan ini. */
  adaLogPengembanganDiri: ReadonlySet<string>;
  /** Poin K4 yang ditetapkan untuk periode ini, per pegawai (sebelum dibatasi 25). */
  poinK4: ReadonlyMap<string, number>;
};

export type Kategori = "umum" | "pimpinan" | "kepala_unit";

export type HasilPenugasan = {
  /** Penugasan wakil amanah. */
  penugasanId: string;
  /** Amanah gabungan (rangkap peran sama di bidang yang sama): semua penugasan dan unitnya. Snapshot lama tidak memilikinya. */
  penugasanIds?: string[];
  unitIds?: string[];
  peran: PeranKerja;
  unitId: string;
  koordinatorId: string | null;
  bobotAlokasi: number | null;
  indikator: HasilIndikator[];
  /** Rata-rata indikator pokok dan jumlah poin tambahan (snapshot lama tidak memilikinya). */
  pokok?: number | null;
  tambahan?: number;
  k1: number | null;
  k3: number | null;
  k3Rincian: SkorK3 | null;
};

/** Semua penugasan dan unit sebuah baris K1 (amanah gabungan atau satu penugasan). */
export const idPenugasan = (p: Pick<HasilPenugasan, "penugasanId" | "penugasanIds">) => p.penugasanIds ?? [p.penugasanId];
export const unitPenugasan = (p: Pick<HasilPenugasan, "unitId" | "unitIds">) => p.unitIds ?? [p.unitId];

export type HasilIkp = {
  pegawaiId: string;
  nama: string;
  kategori: Kategori;
  penugasan: HasilPenugasan[];
  k1: number | null;
  kehadiran: number | null;
  ketepatan: number | null;
  k2: number | null;
  k3: number | null;
  k4: number;
  ikp: number | null;
  ikpAkhir: number | null;
  predikat: Predikat | null;
  syaratMinimum: { memenuhi: boolean; alasan: string[] };
  /** Data yang belum ada sehingga IKP belum bisa dihitung. */
  kekurangan: string[];
};

export function hitungK2(a: AbsensiHitung) {
  // plan.md Bagian 7: penyebut = hari kerja wajib apa adanya dari Personalia (lihat catatan di README).
  if (a.hariKerjaWajib <= 0) return null;
  const kehadiran = Math.min(100, (a.hadir / a.hariKerjaWajib) * 100);
  const ketepatan = a.hadir > 0 ? Math.min(100, (a.hadirTepatWaktu / a.hadir) * 100) : 0;
  return { kehadiran, ketepatan, k2: PARAMETER.bobotK2.hadir * kehadiran + PARAMETER.bobotK2.tepat * ketepatan };
}

/** K3 per penilai = rata-rata 6 nilai × 20. Pengembangan diri dibatasi 2 bila log kosong. */
export function hitungK3(skor: SkorK3, adaLog: boolean) {
  const efektif = { ...skor, pengembanganDiri: adaLog ? skor.pengembanganDiri : Math.min(2, skor.pengembanganDiri) };
  return { k3: rataRata(NILAI_K3.map((n) => efektif[n]))! * 20, rincian: efektif };
}

export function hitungIkp(m: MasukanIkp): HasilIkp[] {
  const k1 = hitungK1(m.k1);

  return m.pegawai.map((pg) => {
    const milik = m.penugasan.filter((p) => p.pegawaiId === pg.id);
    const kekurangan: string[] = [];
    const adaLog = m.adaLogPengembanganDiri.has(pg.id);

    const kategori: Kategori = milik.some((p) => p.peran === "KAKAN" || p.peran === "WAKA")
      ? "pimpinan"
      : milik.length > 0 && milik.every((p) => p.peran === "KU")
        ? "kepala_unit"
        : "umum";

    // K3 per penilai: satu penilaian berlaku untuk semua penugasan yang ia nilai.
    const k3Penilai = new Map(m.k3.filter((k) => k.pegawaiId === pg.id).map((k) => [k.penilaiId, hitungK3(k.skor, adaLog)]));

    // Satu baris per amanah: penugasan yang K1-nya digabung (hitungK1) tampil dan dihitung sekali.
    const penugasan: HasilPenugasan[] = [];
    for (const p of milik) {
      const h = k1.get(p.id);
      const ids = h?.penugasanIds ?? [p.id];
      if (ids[0] !== p.id && milik.some((x) => x.id === ids[0])) continue;
      const anggota = milik.filter((x) => ids.includes(x.id));
      const n = p.penilaiK3Id ? k3Penilai.get(p.penilaiK3Id) : undefined;
      penugasan.push({
        penugasanId: p.id,
        ...(anggota.length > 1 ? { penugasanIds: anggota.map((x) => x.id), unitIds: anggota.map((x) => x.unitId) } : {}),
        peran: p.peran,
        unitId: p.unitId,
        koordinatorId: p.koordinatorId,
        // Bobot amanah gabungan = jumlah bobot anggotanya (bila semua tertulis).
        bobotAlokasi: anggota.every((x) => x.bobotAlokasi !== null) ? anggota.reduce((a, x) => a + x.bobotAlokasi!, 0) : null,
        indikator: h?.indikator ?? [],
        pokok: h?.pokok ?? null,
        tambahan: h?.tambahan ?? 0,
        k1: h?.k1 ?? null,
        k3: n?.k3 ?? null,
        k3Rincian: n?.rincian ?? null,
      });
    }

    // K2
    const abs = m.absensi.find((a) => a.pegawaiId === pg.id);
    const k2r = abs ? hitungK2(abs) : null;
    if (!k2r) kekurangan.push("Rekap absensi belum diunggah");
    const syarat: string[] = [];
    if (k2r && k2r.kehadiran < PARAMETER.ambangKehadiran) syarat.push(`Kehadiran di bawah ${PARAMETER.ambangKehadiran}%`);
    if (abs?.sanksiBerat) syarat.push("Sanksi disiplin berat");

    // K1 — hanya penugasan yang punya indikator aktif.
    const berK1 = penugasan.filter((p) => p.peran === "SBK" || p.peran === "KSBK" || p.peran === "SK");
    const terisi = berK1.filter((p) => p.k1 !== null);
    let nilaiK1: number | null = null;
    if (terisi.length > 1 && terisi.every((p) => (p.bobotAlokasi ?? 0) > 0)) {
      const total = terisi.reduce((a, p) => a + p.bobotAlokasi!, 0);
      nilaiK1 = terisi.reduce((a, p) => a + p.k1! * p.bobotAlokasi!, 0) / total;
    } else {
      nilaiK1 = rataRata(terisi.map((p) => p.k1!));
    }

    // K3 — rata-rata dari setiap penilai berbeda (penilai yang sama di dua penugasan dihitung sekali). Pimpinan tidak dinilai K3.
    const perluK3 = kategori === "pimpinan" ? [] : milik.filter((p) => p.peran !== "KAKAN" && p.peran !== "WAKA");
    const penilai = [...new Set(perluK3.map((p) => p.penilaiK3Id))];
    const k3 = penilai.length && penilai.every((x) => x && k3Penilai.has(x)) ? rataRata(penilai.map((x) => k3Penilai.get(x!)!.k3)) : null;

    const k4 = Math.min(K4_MAKS, Math.max(0, m.poinK4.get(pg.id) ?? 0));

    let ikp: number | null = null;
    if (kategori === "pimpinan") {
      ikp = k2r?.k2 ?? null;
    } else {
      if (!milik.length) kekurangan.push("Belum punya penugasan");
      if (penilai.includes(null)) kekurangan.push("Ada penugasan tanpa penilai K3");
      else if (k3 === null && penilai.length) kekurangan.push("Penilaian K3 belum lengkap");
      if (kategori === "kepala_unit") {
        // K1 Kepala Unit Pendukung ditunda; bobot K2 & K3 dinormalisasi (Bagian 4, 13.5).
        if (k2r && k3 !== null) ikp = 0.5 * k2r.k2 + 0.5 * k3;
      } else {
        if (nilaiK1 === null) kekurangan.push("Belum ada indikator K1 dengan data");
        if (nilaiK1 !== null && k2r && k3 !== null) ikp = PARAMETER.bobot.k1 * nilaiK1 + PARAMETER.bobot.k2 * k2r.k2 + PARAMETER.bobot.k3 * k3;
      }
    }

    const ikpAkhir = ikp === null ? null : ikp + (kategori === "pimpinan" ? 0 : k4);
    return {
      pegawaiId: pg.id,
      nama: pg.nama,
      kategori,
      penugasan,
      k1: kategori === "umum" ? nilaiK1 : null,
      kehadiran: k2r?.kehadiran ?? null,
      ketepatan: k2r?.ketepatan ?? null,
      k2: k2r?.k2 ?? null,
      k3,
      k4: kategori === "pimpinan" ? 0 : k4,
      ikp,
      ikpAkhir,
      predikat: ikpAkhir === null ? null : predikatDari(ikpAkhir),
      syaratMinimum: { memenuhi: syarat.length === 0, alasan: syarat },
      kekurangan: ikp === null ? kekurangan : [],
    };
  });
}

/**
 * Poin K4 untuk satu pengajuan. Naik tingkat dari inovasi yang sama hanya menambah selisih,
 * dan tingkat yang sama tidak bisa diberi poin dua kali.
 */
export function poinK4Bersih(poinDitetapkan: number, poinSebelumnya: number[]) {
  const tertinggi = Math.max(0, ...poinSebelumnya);
  return Math.max(0, poinDitetapkan - tertinggi);
}
