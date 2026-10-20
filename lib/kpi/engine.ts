// Mesin hitung IKP — PRD Bagian 4. Fungsi murni tanpa I/O.
// Presisi penuh disimpan; 2 desimal hanya di tampilan; tunjangan dibulatkan ke rupiah.
// Keputusan sementara yang dipakai di sini tercatat di plan.md Bagian 2.

import {
  NILAI_K3,
  type Absensi,
  type Indikator,
  type InputPeriode,
  type Parameter,
  type Penugasan,
  type Predikat,
  type Realisasi,
  type SkorK3,
} from "./types";

// ── Tipe hasil ────────────────────────────────────────────────────────────────

export type HasilIndikator = {
  kode: string;
  nama: string;
  target: number;
  /** Realisasi dalam persen; null bila belum diisi, penyebut nol, atau indikator bersub-tugas. */
  realisasi: number | null;
  skor: number | null;
  /** Dikeluarkan dari rata-rata K1. */
  dikecualikan: boolean;
  alasan?: string;
  penyebutKecil: boolean;
  menungguVerifikasi: boolean;
  sub?: HasilIndikator[];
};

export type HasilPenugasan = {
  penugasanId: string;
  peran: Penugasan["peran"];
  unitId: string;
  indikator: HasilIndikator[];
  k1: number | null;
  k3: number | null;
  /** Skor 6 nilai setelah aturan batas (mis. pengembangan diri ≤ 2 tanpa log). */
  k3Rincian: Record<string, number> | null;
  peringatan: string[];
};

export type HasilPegawai = {
  pegawaiId: string;
  nama: string;
  hanyaK2: boolean;
  penugasan: HasilPenugasan[];
  k1: number | null;
  k2: number | null;
  hadirPersen: number | null;
  tepatPersen: number | null;
  k3: number | null;
  k4: number;
  ikp: number | null;
  ikpAkhir: number | null;
  predikat: Predikat | null;
  syarat: { lolos: boolean; alasan: string[] };
  tunjangan: number | null;
  /** Data yang belum ada sehingga IKP belum bisa dihitung. */
  kekurangan: string[];
  peringatan: string[];
};

// ── Aturan dasar ──────────────────────────────────────────────────────────────

const rataRata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const bukanNull = <T,>(x: T | null): x is T => x !== null;

/** Skor_i = min(batas, Realisasi_i ÷ Target_i × 100) */
export function skorIndikator(realisasi: number, target: number, batas: number) {
  return Math.min(batas, (realisasi / target) * 100);
}

export function tentukanPredikat(nilai: number, p: Parameter): Predikat {
  const urut = [...p.predikat].sort((a, b) => b.min - a.min);
  return (urut.find((b) => nilai >= b.min) ?? urut[urut.length - 1]).label;
}

/** K2 = bobot hadir × %hadir + bobot tepat × %tepat. Izin/sakit sah keluar dari penyebut kehadiran. */
export function hitungK2(a: Absensi, p: Parameter) {
  const penyebut = a.hariKerjaWajib - a.izinSakitSah;
  if (penyebut <= 0) return null;
  const hadirPersen = Math.min(100, (a.hadir / penyebut) * 100);
  const tepatPersen = a.hadir > 0 ? Math.min(100, (a.tepatWaktu / a.hadir) * 100) : 0;
  return { hadirPersen, tepatPersen, k2: p.bobotK2.hadir * hadirPersen + p.bobotK2.tepat * tepatPersen };
}

/** Aturan simpan skor K3 (Subbagian 4.1). Mengembalikan daftar galat; kosong berarti sah. */
export function validasiSkorK3(s: SkorK3, pegawaiDinilaiId: string): string[] {
  const galat: string[] = [];
  if (s.penilaiId === pegawaiDinilaiId) galat.push("Penilai tidak boleh menilai dirinya sendiri.");
  for (const n of NILAI_K3) {
    const v = s.skor[n];
    if (!Number.isInteger(v) || v < 1 || v > 5) galat.push(`Skor ${n} harus bilangan bulat 1–5.`);
    else if ((v === 1 || v === 2 || v === 5) && !s.contoh[n]?.trim()) galat.push(`Skor ${v} pada ${n} wajib disertai contoh perilaku.`);
  }
  return galat;
}

/** K3 = rata-rata 6 nilai × 20. Pengembangan diri dibatasi 2 bila log tidak diunggah. */
export function hitungK3(s: SkorK3, adaLog: boolean) {
  const skor = { ...s.skor };
  const peringatan: string[] = [];
  if (!adaLog && skor.pengembanganDiri > 2) {
    skor.pengembanganDiri = 2;
    peringatan.push("Skor pengembangan diri dibatasi 2 karena log tidak diunggah.");
  }
  return { k3: rataRata(NILAI_K3.map((n) => skor[n]))! * 20, rincian: skor as Record<string, number>, peringatan };
}

// ── Indikator K1 ──────────────────────────────────────────────────────────────

function dariRealisasi(ind: Indikator, r: Realisasi | undefined, p: Parameter, kode: string, nama: string): HasilIndikator {
  const dasar = { kode, nama, target: ind.target, penyebutKecil: !!ind.penyebutKecil, sub: undefined };
  if (!r) return { ...dasar, realisasi: null, skor: null, dikecualikan: true, alasan: "Belum diisi", menungguVerifikasi: false };
  if (r.penyebut <= 0) return { ...dasar, realisasi: null, skor: null, dikecualikan: true, alasan: "Penyebut nol", menungguVerifikasi: false };
  const realisasi = (r.pembilang / r.penyebut) * 100;
  return {
    ...dasar,
    realisasi,
    skor: skorIndikator(realisasi, ind.target, p.batasSkorIndikator),
    dikecualikan: false,
    menungguVerifikasi: !!ind.verifikasiKeuangan && !r.terverifikasi,
  };
}

function hitungIndikator(ind: Indikator, baris: Realisasi[], p: Parameter, rataStaf: number | null): HasilIndikator {
  if (ind.turunan) {
    const dasar = { kode: ind.kode, nama: ind.nama, target: ind.target, penyebutKecil: false, menungguVerifikasi: false };
    if (rataStaf === null) return { ...dasar, realisasi: null, skor: null, dikecualikan: true, alasan: "Tidak ada staf dengan K1" };
    return { ...dasar, realisasi: rataStaf, skor: skorIndikator(rataStaf, ind.target, p.batasSkorIndikator), dikecualikan: false };
  }

  if (ind.subTugas?.length) {
    const sub = ind.subTugas.map((st) =>
      dariRealisasi(ind, baris.find((r) => r.subKode === st.kode), p, `${ind.kode}(${st.kode})`, st.nama),
    );
    const skor = rataRata(sub.filter((s) => !s.dikecualikan).map((s) => s.skor!));
    return {
      kode: ind.kode,
      nama: ind.nama,
      target: ind.target,
      penyebutKecil: !!ind.penyebutKecil,
      realisasi: null,
      skor,
      dikecualikan: skor === null,
      alasan: skor === null ? "Semua sub-tugas kosong" : undefined,
      menungguVerifikasi: sub.some((s) => s.menungguVerifikasi),
      sub,
    };
  }

  return dariRealisasi(ind, baris.find((r) => !r.subKode), p, ind.kode, ind.nama);
}

export function indikatorPenugasan(pn: Penugasan, katalog: Indikator[]) {
  return katalog.filter((i) => i.fase === 1 && i.peran === pn.peran && (!i.unitId || i.unitId === pn.unitId));
}

// ── Hitung satu periode ───────────────────────────────────────────────────────

export function hitungPeriode(input: InputPeriode): HasilPegawai[] {
  const p = input.parameter;

  const realisasiPer = new Map<string, Realisasi[]>();
  for (const r of input.realisasi) {
    const kunci = `${r.penugasanId}|${r.indikatorKode}`;
    realisasiPer.set(kunci, [...(realisasiPer.get(kunci) ?? []), r]);
  }

  const hasilPn = new Map<string, HasilPenugasan>();
  const hitungPenugasan = (pn: Penugasan, rataStaf: number | null) => {
    const indikator = indikatorPenugasan(pn, input.indikator).map((ind) =>
      hitungIndikator(ind, realisasiPer.get(`${pn.id}|${ind.kode}`) ?? [], p, rataStaf),
    );
    const k1 = rataRata(indikator.filter((i) => !i.dikecualikan).map((i) => i.skor!));
    const peringatan = indikator.some((i) => i.menungguVerifikasi) ? ["Ada indikator menunggu verifikasi Keuangan."] : [];
    hasilPn.set(pn.id, { penugasanId: pn.id, peran: pn.peran, unitId: pn.unitId, indikator, k1, k3: null, k3Rincian: null, peringatan });
  };

  // Langkah 1 — K1 penugasan staf (SBK, SK).
  const staf = input.penugasan.filter((pn) => pn.peran === "SBK" || pn.peran === "SK");
  staf.forEach((pn) => hitungPenugasan(pn, null));

  // Langkah 2–3 — K1 KSBK & KU, setelah staf selesai. Indikator turunan = rata K1 staf di unitnya, tanpa dirinya.
  for (const pn of input.penugasan.filter((x) => x.peran === "KSBK" || x.peran === "KU")) {
    const rataStaf = rataRata(
      staf
        .filter((s) => s.unitId === pn.unitId && s.pegawaiId !== pn.pegawaiId)
        .map((s) => hasilPn.get(s.id)!.k1)
        .filter(bukanNull),
    );
    hitungPenugasan(pn, rataStaf);
  }

  // K3 per penugasan.
  for (const s of input.skorK3) {
    const h = hasilPn.get(s.penugasanId);
    const pn = input.penugasan.find((x) => x.id === s.penugasanId);
    if (!h || !pn) continue;
    if (validasiSkorK3(s, pn.pegawaiId).length) {
      h.peringatan.push("Skor K3 tidak sah dan diabaikan.");
      continue;
    }
    const k3 = hitungK3(s, !!input.logPengembanganDiri[pn.pegawaiId]);
    Object.assign(h, { k3: k3.k3, k3Rincian: k3.rincian });
    h.peringatan.push(...k3.peringatan);
  }

  return input.pegawai.filter((pg) => pg.aktif).map((pg) => {
    const milik = input.penugasan.filter((pn) => pn.pegawaiId === pg.id);
    const hp = milik.map((pn) => hasilPn.get(pn.id)!);
    const kekurangan: string[] = [];
    const peringatan = hp.flatMap((h) => h.peringatan);

    // Langkah 5a — K2 sekali per orang.
    const abs = input.absensi.find((a) => a.pegawaiId === pg.id);
    const k2r = abs ? hitungK2(abs, p) : null;
    if (!abs) kekurangan.push("Rekap absensi belum diunggah");

    const dasar = {
      pegawaiId: pg.id,
      nama: pg.nama,
      penugasan: hp,
      k2: k2r?.k2 ?? null,
      hadirPersen: k2r?.hadirPersen ?? null,
      tepatPersen: k2r?.tepatPersen ?? null,
      kekurangan,
      peringatan,
    };
    const kosong = { k1: null, k3: null, ikp: null, ikpAkhir: null, predikat: null, tunjangan: null };

    if (pg.pimpinan) {
      return { ...dasar, ...kosong, hanyaK2: true, k4: 0, syarat: { lolos: false, alasan: ["Rumus pimpinan belum diputuskan"] } };
    }

    // Langkah 4 — K1 gabungan: alokasi tertulis bila semua penugasan berbobot, selain itu rata-rata sederhana.
    const berK1 = milik.filter((pn) => hasilPn.get(pn.id)!.k1 !== null);
    const k1Dari = (pn: Penugasan) => hasilPn.get(pn.id)!.k1!;
    let k1: number | null = null;
    if (berK1.length > 1 && berK1.every((pn) => (pn.alokasi ?? 0) > 0)) {
      const total = berK1.reduce((a, pn) => a + pn.alokasi!, 0);
      k1 = berK1.reduce((a, pn) => a + k1Dari(pn) * pn.alokasi!, 0) / total;
    } else {
      k1 = rataRata(berK1.map(k1Dari));
    }
    if (!milik.length) kekurangan.push("Tidak punya penugasan");
    else if (k1 === null) kekurangan.push("Belum ada indikator K1 yang terisi");

    // Langkah 5b — K3 rata-rata dari semua koordinator penugasan.
    const k3List = hp.map((h) => h.k3);
    const k3 = k3List.length && k3List.every(bukanNull) ? rataRata(k3List as number[]) : null;
    if (k3List.some((k) => k === null)) kekurangan.push("Skor K3 belum lengkap dari semua koordinator");

    const k4 = Math.max(0, Math.min(p.k4Maks, input.k4Disahkan[pg.id] ?? 0));

    if (k1 === null || dasar.k2 === null || k3 === null) {
      return { ...dasar, ...kosong, k1, k3, k4, hanyaK2: false, syarat: { lolos: false, alasan: [] } };
    }

    // Langkah 6 — IKP → IKP Akhir → predikat → syarat → tunjangan.
    const ikp = p.bobot.k1 * k1 + p.bobot.k2 * dasar.k2 + p.bobot.k3 * k3;
    const ikpAkhir = ikp + k4;
    const alasan: string[] = [];
    if (dasar.hadirPersen! < p.ambangKehadiran) alasan.push(`Kehadiran di bawah ${p.ambangKehadiran}%`);
    if (abs?.sanksiDisiplinBerat) alasan.push("Ada sanksi disiplin berat");
    if (p.ambangIkpMinimum !== null && ikpAkhir < p.ambangIkpMinimum) alasan.push(`IKP Akhir di bawah ${p.ambangIkpMinimum}`);
    const lolos = alasan.length === 0;

    return {
      ...dasar,
      hanyaK2: false,
      k1,
      k3,
      k4,
      ikp,
      ikpAkhir,
      predikat: tentukanPredikat(ikpAkhir, p),
      syarat: { lolos, alasan },
      tunjangan: lolos ? Math.round((p.plafonTunjangan * Math.min(ikpAkhir, 100)) / 100) : 0,
    } satisfies HasilPegawai;
  });
}
