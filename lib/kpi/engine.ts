// Mesin hitung IKP — PRD Bagian 4.
// Presisi penuh disimpan; pembulatan 2 desimal hanya untuk tampilan, tunjangan dibulatkan ke rupiah.

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

export type HasilIndikator = {
  kode: string;
  nama: string;
  target: number;
  /** Realisasi dalam persen; null bila belum diisi atau penyebut nol. */
  realisasi: number | null;
  skor: number | null;
  /** Dikeluarkan dari rata-rata K1 (penyebut nol / belum ada data). */
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
  /** Data yang belum lengkap sehingga IKP belum bisa dihitung. */
  kekurangan: string[];
  peringatan: string[];
};

const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function skorIndikator(realisasi: number, target: number, batas: number) {
  return Math.min(batas, (realisasi / target) * 100);
}

export function tentukanPredikat(nilai: number, p: Parameter): Predikat {
  const urut = [...p.predikat].sort((a, b) => b.min - a.min);
  return (urut.find((b) => nilai >= b.min) ?? urut[urut.length - 1]).label;
}

export function hitungK2(a: Absensi, p: Parameter) {
  const penyebut = a.hariKerjaWajib - a.izinSakitSah;
  if (penyebut <= 0) return null;
  const hadirPersen = Math.min(100, (a.hadir / penyebut) * 100);
  const tepatPersen = a.hadir > 0 ? Math.min(100, (a.tepatWaktu / a.hadir) * 100) : 0;
  return {
    hadirPersen,
    tepatPersen,
    k2: p.bobotK2.hadir * hadirPersen + p.bobotK2.tepat * tepatPersen,
  };
}

/** Aturan simpan skor K3 (Subbagian 4.1). Mengembalikan daftar galat; kosong = sah. */
export function validasiSkorK3(s: SkorK3, pegawaiDinilaiId: string): string[] {
  const galat: string[] = [];
  if (s.penilaiId === pegawaiDinilaiId) galat.push("Penilai tidak boleh menilai dirinya sendiri.");
  for (const n of NILAI_K3) {
    const v = s.skor[n];
    if (!Number.isInteger(v) || v < 1 || v > 5) galat.push(`Skor ${n} harus bilangan bulat 1–5.`);
    else if ((v === 1 || v === 2 || v === 5) && !s.contoh[n]?.trim())
      galat.push(`Skor ${v} pada ${n} wajib disertai contoh perilaku.`);
  }
  return galat;
}

export function hitungK3(s: SkorK3, adaLog: boolean) {
  const skor = { ...s.skor };
  const peringatan: string[] = [];
  if (!adaLog && skor.pengembanganDiri > 2) {
    skor.pengembanganDiri = 2;
    peringatan.push("Skor pengembangan diri dibatasi 2 karena log tidak diunggah.");
  }
  const nilai = rata(NILAI_K3.map((n) => skor[n]))!;
  return { k3: nilai * 20, rincian: skor as Record<string, number>, peringatan };
}

function hitungSatuIndikator(
  ind: Indikator,
  rows: Realisasi[],
  p: Parameter,
  nilaiTurunan: number | null,
): HasilIndikator {
  const dasar = {
    kode: ind.kode,
    nama: ind.nama,
    target: ind.target,
    penyebutKecil: !!ind.penyebutKecil,
  };

  if (ind.turunan) {
    if (nilaiTurunan === null)
      return { ...dasar, realisasi: null, skor: null, dikecualikan: true, alasan: "Tidak ada staf dengan K1", menungguVerifikasi: false };
    const skor = skorIndikator(nilaiTurunan, ind.target, p.batasSkorIndikator);
    return { ...dasar, realisasi: nilaiTurunan, skor, dikecualikan: false, menungguVerifikasi: false };
  }

  const dariBaris = (r: Realisasi | undefined, kode: string, nama: string): HasilIndikator => {
    const d = { ...dasar, kode, nama };
    if (!r) return { ...d, realisasi: null, skor: null, dikecualikan: true, alasan: "Belum diisi", menungguVerifikasi: false };
    if (r.penyebut <= 0)
      return { ...d, realisasi: null, skor: null, dikecualikan: true, alasan: "Penyebut nol", menungguVerifikasi: false };
    const realisasi = (r.pembilang / r.penyebut) * 100;
    return {
      ...d,
      realisasi,
      skor: skorIndikator(realisasi, ind.target, p.batasSkorIndikator),
      dikecualikan: false,
      menungguVerifikasi: !!ind.verifikasiKeuangan && !r.terverifikasi,
    };
  };

  if (ind.subTugas?.length) {
    const sub = ind.subTugas.map((st) =>
      dariBaris(rows.find((r) => r.subKode === st.kode), `${ind.kode}(${st.kode})`, st.nama),
    );
    const skor = rata(sub.filter((s) => !s.dikecualikan).map((s) => s.skor!));
    return {
      ...dasar,
      realisasi: null,
      skor,
      dikecualikan: skor === null,
      alasan: skor === null ? "Semua sub-tugas kosong" : undefined,
      menungguVerifikasi: sub.some((s) => s.menungguVerifikasi),
      sub,
    };
  }

  return dariBaris(rows.find((r) => !r.subKode), ind.kode, ind.nama);
}

function indikatorUntuk(pn: Penugasan, katalog: Indikator[]) {
  return katalog.filter((i) => i.peran === pn.peran && (!i.unitId || i.unitId === pn.unitId) && i.fase === 1);
}

export function hitungPeriode(input: InputPeriode): HasilPegawai[] {
  const p = input.parameter;
  const realisasiPer = new Map<string, Realisasi[]>();
  for (const r of input.realisasi) {
    const key = `${r.penugasanId}|${r.indikatorKode}`;
    realisasiPer.set(key, [...(realisasiPer.get(key) ?? []), r]);
  }

  const hasilPn = new Map<string, HasilPenugasan>();
  const hitungPn = (pn: Penugasan, staffAvg: (pn: Penugasan) => number | null) => {
    const indikator = indikatorUntuk(pn, input.indikator).map((ind) =>
      hitungSatuIndikator(ind, realisasiPer.get(`${pn.id}|${ind.kode}`) ?? [], p, ind.turunan ? staffAvg(pn) : null),
    );
    const k1 = rata(indikator.filter((i) => !i.dikecualikan).map((i) => i.skor!));
    const peringatan: string[] = [];
    if (indikator.some((i) => i.menungguVerifikasi)) peringatan.push("Ada indikator menunggu verifikasi Keuangan.");
    hasilPn.set(pn.id, { penugasanId: pn.id, peran: pn.peran, unitId: pn.unitId, indikator, k1, k3: null, k3Rincian: null, peringatan });
  };

  // Langkah 1: K1 penugasan staf (SBK, SK).
  const staf = input.penugasan.filter((pn) => pn.peran === "SBK" || pn.peran === "SK");
  for (const pn of staf) hitungPn(pn, () => null);

  // Langkah 2–3: K1 KSBK & KU, setelah K1 staf selesai. KSBK-2 = rata K1 staf di unitnya, tanpa dirinya sendiri.
  const rataStaf = (koord: Penugasan) =>
    rata(
      staf
        .filter((s) => s.unitId === koord.unitId && s.pegawaiId !== koord.pegawaiId)
        .map((s) => hasilPn.get(s.id)!.k1)
        .filter((k): k is number => k !== null),
    );
  for (const pn of input.penugasan.filter((pn) => pn.peran === "KSBK" || pn.peran === "KU")) hitungPn(pn, rataStaf);

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
    h.k3 = k3.k3;
    h.k3Rincian = k3.rincian;
    h.peringatan.push(...k3.peringatan);
  }

  return input.pegawai
    .filter((pg) => pg.aktif)
    .map((pg): HasilPegawai => {
      const milik = input.penugasan.filter((pn) => pn.pegawaiId === pg.id);
      const hp = milik.map((pn) => hasilPn.get(pn.id)!);
      const kekurangan: string[] = [];
      const peringatan = hp.flatMap((h) => h.peringatan);

      // Langkah 4: K1 gabungan — alokasi tertulis bila semua penugasan punya, selain itu rata-rata sederhana.
      const berK1 = milik.filter((pn) => hasilPn.get(pn.id)!.k1 !== null);
      let k1: number | null = null;
      if (berK1.length) {
        const pakaiAlokasi = berK1.length > 1 && berK1.every((pn) => pn.alokasi && pn.alokasi > 0);
        if (pakaiAlokasi) {
          const total = berK1.reduce((a, pn) => a + pn.alokasi!, 0);
          k1 = berK1.reduce((a, pn) => a + hasilPn.get(pn.id)!.k1! * pn.alokasi!, 0) / total;
        } else k1 = rata(berK1.map((pn) => hasilPn.get(pn.id)!.k1!));
      }

      // Langkah 5: K2 sekali per orang; K3 rata-rata dari semua koordinator penugasan.
      const abs = input.absensi.find((a) => a.pegawaiId === pg.id);
      const k2r = abs ? hitungK2(abs, p) : null;
      if (!abs) kekurangan.push("Rekap absensi belum diunggah");

      const hanyaK2 = !!pg.pimpinan;
      const base = {
        pegawaiId: pg.id,
        nama: pg.nama,
        hanyaK2,
        penugasan: hp,
        k2: k2r?.k2 ?? null,
        hadirPersen: k2r?.hadirPersen ?? null,
        tepatPersen: k2r?.tepatPersen ?? null,
      };

      if (hanyaK2) {
        return {
          ...base, k1: null, k3: null, k4: 0, ikp: null, ikpAkhir: null, predikat: null,
          syarat: { lolos: false, alasan: ["Rumus pimpinan belum diputuskan"] }, tunjangan: null, kekurangan, peringatan,
        };
      }

      if (!milik.length) kekurangan.push("Tidak punya penugasan");
      else if (k1 === null) kekurangan.push("Belum ada indikator K1 yang terisi");
      const k3s = hp.map((h) => h.k3);
      if (k3s.some((k) => k === null)) kekurangan.push("Skor K3 belum lengkap dari semua koordinator");
      const k3 = k3s.length && k3s.every((k) => k !== null) ? rata(k3s as number[]) : null;

      const k4 = Math.max(0, Math.min(p.k4Maks, input.k4Disahkan[pg.id] ?? 0));

      // Langkah 6.
      if (k1 === null || base.k2 === null || k3 === null) {
        return { ...base, k1, k3, k4, ikp: null, ikpAkhir: null, predikat: null, syarat: { lolos: false, alasan: [] }, tunjangan: null, kekurangan, peringatan };
      }
      const ikp = p.bobot.k1 * k1 + p.bobot.k2 * base.k2 + p.bobot.k3 * k3;
      const ikpAkhir = ikp + k4;
      const predikat = tentukanPredikat(ikpAkhir, p);

      const alasan: string[] = [];
      if (base.hadirPersen! < p.ambangKehadiran) alasan.push(`Kehadiran di bawah ${p.ambangKehadiran}%`);
      if (abs?.sanksiDisiplinBerat) alasan.push("Ada sanksi disiplin berat");
      if (p.ambangIkpMinimum !== null && ikpAkhir < p.ambangIkpMinimum) alasan.push(`IKP Akhir di bawah ${p.ambangIkpMinimum}`);
      const lolos = alasan.length === 0;
      const tunjangan = lolos ? Math.round((p.plafonTunjangan * Math.min(ikpAkhir, 100)) / 100) : 0;

      return { ...base, k1, k3, k4, ikp, ikpAkhir, predikat, syarat: { lolos, alasan }, tunjangan, kekurangan, peringatan };
    });
}
