// K1: dari item, kegiatan, tugas khusus, jurnal, dan uji petik → Target, Realisasi, skor per indikator (plan.md Bagian 6–7).
// Fungsi murni: pemanggil memuat data satu periode lalu menyerahkannya ke sini.
// K1 penugasan = min(100; rata-rata indikator pokok + poin tambahan). Poin tambahan (tugas khusus, jurnal)
// hanya menambah; nilai 100 bisa dicapai tanpa poin tambahan.

import { KATALOG, type DefinisiIndikator, type Verifikator } from "./katalog";
import { PARAMETER, type PeranKerja, type StatusItem, type StatusTugas } from "./tipe";
import { geserHariKerja, hariKerjaAntara, rentangPeriode, tambahHari, tanggalLokal, type Kantor } from "../waktu";

// ── Masukan ───────────────────────────────────────────────────────────────────

export type ParamIndikator = { kode: string; standar: number; tenggat: number | null; aktif: boolean; verifikator: Verifikator };

export type PenugasanK1 = {
  id: string;
  pegawaiId: string;
  peran: PeranKerja;
  unitId: string;
  kantor: Kantor;
  /** Bidang unit ini (SKUO → bidang induknya). Kosong = unitId. */
  bidangId?: string | null;
};

export type ItemK1 = {
  id: string;
  penugasanId: string;
  indikatorKode: string;
  kegiatanId: string | null;
  masuk: Date;
  selesai: Date | null;
  status: StatusItem;
  diajukanPada: Date | null;
  diverifikasiPada: Date | null;
  dibuatPada: Date;
  /** Field khusus; SBK-3 memakai `ke` ("1" / "2"). */
  data: Record<string, string>;
};

export type KegiatanK1 = {
  id: string;
  unitId: string;
  /** Tanggal pelaksanaan (YYYY-MM-DD). */
  tanggal: string;
  perluSpp: boolean;
  perluSpb: boolean;
  dibuatPada: Date;
  /** Staf penanggung jawab (wajib untuk kegiatan baru). */
  penanggungJawabId: string | null;
  /** SKUO kegiatan; menentukan penugasan mana yang memikulnya bila staf memegang beberapa SKUO. */
  skuoId?: string | null;
};

/** Satu jadwal tugas khusus yang tenggatnya jatuh dalam periode ini. */
export type TugasK1 = { penugasanId: string; tenggat: Date; status: StatusTugas; selesaiPada: Date | null; diverifikasiPada: Date | null };
export type UjiPetikK1 = { unitId: string; jumlahDiuji: number; jumlahSesuai: number };

export type KonteksK1 = {
  periode: string;
  sekarang: Date;
  /** Diisi setelah batas verifikasi: item yang disetujui sesudahnya tidak dihitung sebagai realisasi. */
  batasVerifikasi: Date | null;
  libur: (kantor: Kantor) => ReadonlySet<string>;
  param: ReadonlyMap<string, ParamIndikator>;
  penugasan: PenugasanK1[];
  /** Item periode ini (item.periode_id = periode). */
  item: ItemK1[];
  /** Kegiatan yang dilaksanakan dalam periode ini. */
  kegiatan: KegiatanK1[];
  tugas: TugasK1[];
  /** Jumlah entri jurnal per pegawai dalam periode ini. */
  jurnal: ReadonlyMap<string, number>;
  ujiPetik: UjiPetikK1[];
};

// ── Keluaran ──────────────────────────────────────────────────────────────────

export type HasilIndikator = {
  kode: string;
  nama: string;
  target: number;
  realisasi: number;
  /** Realisasi ÷ Target (pecahan). */
  capaian: number | null;
  standar: number;
  skor: number | null;
  /** Dikeluarkan dari rata-rata K1 (Target = 0 atau belum jatuh tempo). */
  dikecualikan: boolean;
  alasan?: string;
  volumeKecil: boolean;
  /** Poin tambahan: tidak ikut rata-rata, skornya ditambahkan ke K1. */
  tambahan?: boolean;
  sub?: HasilIndikator[];
};

export type HasilK1Penugasan = {
  penugasanId: string;
  indikator: HasilIndikator[];
  /** Rata-rata indikator pokok (Target > 0). */
  pokok: number | null;
  /** Jumlah poin tambahan. */
  tambahan: number;
  k1: number | null;
};

// ── Aturan dasar ──────────────────────────────────────────────────────────────

/** Skor = min(100; Capaian ÷ Standar × 100). */
export function skorIndikator(target: number, realisasi: number, standar: number) {
  if (target <= 0) return { capaian: null, skor: null };
  const capaian = realisasi / target;
  return { capaian, skor: Math.min(100, (capaian / standar) * 100) };
}

export const rataRata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function hasil(def: { kode: string; nama: string }, target: number, realisasi: number, standar: number, alasanKosong = "Tidak ada item bulan ini"): HasilIndikator {
  const { capaian, skor } = skorIndikator(target, realisasi, standar);
  return {
    kode: def.kode,
    nama: def.nama,
    target,
    realisasi,
    capaian,
    standar,
    skor,
    dikecualikan: skor === null,
    alasan: skor === null ? alasanKosong : undefined,
    volumeKecil: target > 0 && target <= PARAMETER.volumeKecil,
  };
}

const kosong = (def: { kode: string; nama: string }, standar: number, alasan: string) => hasil(def, 0, 0, standar, alasan);

/** Poin tambahan: jumlah × 0,15, dibatasi 5. */
function tambahan(def: { kode: string; nama: string }, jumlah: number): HasilIndikator {
  const { poin, maks } = PARAMETER.tambahan;
  return { kode: def.kode, nama: def.nama, target: jumlah, realisasi: jumlah, capaian: null, standar: 1, skor: Math.min(maks, jumlah * poin), dikecualikan: false, volumeKecil: false, tambahan: true };
}

// ── Evaluator ─────────────────────────────────────────────────────────────────

const bidangPn = (p: PenugasanK1) => p.bidangId ?? p.unitId;

/**
 * Penugasan SBK seorang staf yang memikul sebuah kegiatan bidang: penugasan di SKUO kegiatan,
 * lalu yang langsung di bidang, lalu yang pertama. Dipakai juga saat membuat item otomatis.
 */
export function pemikulKegiatan<T extends { id: string; unitId: string }>(calon: T[], k: { unitId: string; skuoId?: string | null }): T | undefined {
  const urut = [...calon].sort((a, b) => a.id.localeCompare(b.id));
  return urut.find((p) => k.skuoId && p.unitId === k.skuoId) ?? urut.find((p) => p.unitId === k.unitId) ?? urut[0];
}

class Evaluasi {
  constructor(readonly ctx: KonteksK1) {}

  /** SBK di bidang KSBK ini (termasuk yang ditugaskan di SKUO bawahannya), tanpa dirinya. */
  private stafBidang(ksbk: PenugasanK1) {
    return this.ctx.penugasan.filter((p) => p.peran === "SBK" && bidangPn(p) === bidangPn(ksbk) && p.pegawaiId !== ksbk.pegawaiId);
  }

  /** Satu kegiatan dipikul satu penugasan per staf, agar tidak terhitung ganda saat staf memegang beberapa SKUO di bidang yang sama. */
  private pemikul(k: KegiatanK1, pegawaiId: string) {
    return pemikulKegiatan(
      this.ctx.penugasan.filter((p) => p.peran === "SBK" && p.pegawaiId === pegawaiId && bidangPn(p) === k.unitId),
      k,
    )?.id;
  }

  private sah(i: ItemK1) {
    const b = this.ctx.batasVerifikasi;
    return i.status === "disetujui" && (!b || (i.diverifikasiPada !== null && i.diverifikasiPada <= b));
  }

  private itemDari(penugasanId: string, kode: string) {
    return this.ctx.item.filter((i) => i.penugasanId === penugasanId && i.indikatorKode === kode);
  }

  /** Item staf SBK lain di unit yang sama (untuk KSBK). */
  private itemStaf(ksbk: PenugasanK1, kode: string) {
    const staf = new Set(this.stafBidang(ksbk).map((p) => p.id));
    return this.ctx.item.filter((i) => staf.has(i.penugasanId) && i.indikatorKode === kode);
  }

  private kegiatanUntuk(pn: PenugasanK1, syarat: (k: KegiatanK1) => boolean) {
    return this.ctx.kegiatan.filter((k) => k.unitId === bidangPn(pn) && k.penanggungJawabId === pn.pegawaiId && this.pemikul(k, pn.pegawaiId) === pn.id && syarat(k));
  }

  /** Tugas khusus yang selesai sebelum tenggat dan disetujui pemberi tugas (sebelum batas verifikasi). */
  private tugasTepat(pn: PenugasanK1) {
    const b = this.ctx.batasVerifikasi;
    return this.ctx.tugas.filter(
      (t) =>
        t.penugasanId === pn.id &&
        t.status === "disetujui" &&
        (!b || (t.diverifikasiPada !== null && t.diverifikasiPada <= b)) &&
        t.selesaiPada !== null &&
        t.selesaiPada <= t.tenggat,
    );
  }

  private hariIni(kantor: Kantor) {
    return tanggalLokal(this.ctx.sekarang, kantor);
  }

  private kegiatan(id: string | null) {
    return id ? this.ctx.kegiatan.find((k) => k.id === id) : undefined;
  }

  indikator(pn: PenugasanK1, def: DefinisiIndikator, p: ParamIndikator, k1Staf: ReadonlyMap<string, number | null>): HasilIndikator {
    const lokal = (d: Date) => tanggalLokal(d, pn.kantor);
    const libur = this.ctx.libur(pn.kantor);
    const tenggat = p.tenggat ?? 0;
    const items = this.itemDari(pn.id, def.kode);

    switch (def.kode) {
      case "SBK-1": {
        const ok = items.filter((i) => this.sah(i) && i.selesai && hariKerjaAntara(lokal(i.masuk), lokal(i.selesai), libur) <= tenggat);
        return hasil(def, items.length, ok.length, p.standar);
      }
      case "SBK-5": {
        // Arsip kegiatan: ≤ N hari kerja setelah kegiatan; arsip lain: ≤ N hari kerja setelah diterima.
        const ok = items.filter((i) => {
          if (!this.sah(i) || !i.selesai) return false;
          const k = this.kegiatan(i.kegiatanId);
          return k ? lokal(i.selesai) <= geserHariKerja(k.tanggal, tenggat, libur) : hariKerjaAntara(lokal(i.masuk), lokal(i.selesai), libur) <= tenggat;
        });
        return hasil(def, items.length, ok.length, p.standar);
      }
      case "SBK-2a":
      case "SBK-2b": {
        const perlu = this.kegiatanUntuk(pn, (k) => (def.kode === "SBK-2a" ? k.perluSpp : k.perluSpb));
        const tepat = perlu.filter((k) => {
          const batas = def.kode === "SBK-2a" ? geserHariKerja(k.tanggal, -tenggat, libur) : tambahHari(k.tanggal, tenggat);
          return items.some((i) => i.kegiatanId === k.id && this.sah(i) && i.selesai && lokal(i.selesai) <= batas);
        });
        return hasil(def, perlu.length, tepat.length, p.standar, "Tidak ada kegiatan yang perlu " + (def.kode === "SBK-2a" ? "SPP" : "SPB"));
      }
      case "SBK-3": {
        // Tiap pengingat dinilai sendiri: ke-1 ≤ H-6, ke-2 ≤ H-2.
        const terjadwal = this.kegiatanUntuk(pn, () => true);
        const h = PARAMETER.pengingatHMinus;
        let tepat = 0;
        for (const k of terjadwal)
          h.forEach((hari, n) => {
            const batas = tambahHari(k.tanggal, -hari);
            if (items.some((i) => i.kegiatanId === k.id && i.data.ke === String(n + 1) && this.sah(i) && i.selesai && lokal(i.selesai) <= batas)) tepat++;
          });
        return hasil(def, terjadwal.length * h.length, tepat, p.standar, "Tidak ada kegiatan terjadwal");
      }
      case "SBK-4": {
        const ok = items.filter((i) => {
          const k = this.kegiatan(i.kegiatanId);
          return k && this.sah(i) && i.selesai && lokal(i.selesai) <= tambahHari(k.tanggal, -tenggat);
        });
        return hasil(def, items.length, ok.length, p.standar);
      }
      case "SBK-TK":
        return tambahan(def, this.tugasTepat(pn).length);
      case "SBK-JR":
      case "SK-JR":
        return tambahan(def, this.ctx.jurnal.get(pn.pegawaiId) ?? 0);
      case "SK-TK": {
        // Jatuh tempo: tenggat sudah lewat, sudah diselesaikan lebih awal, atau bulan sudah ditutup.
        const tutup = this.ctx.batasVerifikasi !== null;
        const jatuhTempo = this.ctx.tugas.filter((t) => t.penugasanId === pn.id && (tutup || t.tenggat <= this.ctx.sekarang || t.status === "diajukan" || t.status === "disetujui"));
        return hasil(def, jatuhTempo.length, this.tugasTepat(pn).length, p.standar, "Belum ada tugas khusus yang jatuh tempo");
      }
      case "KSBK-3": {
        const batas = geserHariKerja(rentangPeriode(this.ctx.periode).akhir, tenggat, libur);
        const jatuhTempo = this.ctx.batasVerifikasi !== null || this.hariIni(pn.kantor) > batas;
        if (!items.length && !jatuhTempo) return kosong(def, p.standar, "Belum jatuh tempo");
        const tepat = items.some((i) => this.sah(i) && i.selesai && lokal(i.selesai) <= batas);
        return hasil(def, 1, tepat ? 1 : 0, p.standar);
      }
      case "KSBK-1":
        return this.ksbk1(pn, def, p);
      case "KSBK-2": {
        const nilai = this.stafBidang(pn)
          .map((s) => k1Staf.get(s.id) ?? null)
          .filter((k): k is number => k !== null);
        const rata = rataRata(nilai);
        if (rata === null) return kosong(def, p.standar, "Belum ada K1 staf");
        // Rata-rata K1 dipakai sebagai capaian (pecahan) lalu dibagi standar 85.
        return { ...hasil(def, 1, rata / 100, p.standar), target: nilai.length, realisasi: rata, volumeKecil: false };
      }
      default:
        return kosong(def, p.standar, "Belum ada aturan hitung");
    }
  }

  private ksbk1(pn: PenugasanK1, def: DefinisiIndikator, p: ParamIndikator): HasilIndikator {
    const lokal = (d: Date) => tanggalLokal(d, pn.kantor);
    const libur = this.ctx.libur(pn.kantor);
    const hariIni = this.hariIni(pn.kantor);
    const s = Object.fromEntries((def.sub ?? []).map((x) => [x.kode, { kode: `KSBK-1${x.kode}`, nama: x.nama }]));
    const sub: HasilIndikator[] = [];

    // a — draf surat diperiksa ≤ 1 hari kerja setelah staf menandai selesai.
    const diajukan = this.itemStaf(pn, "SBK-1").filter((i) => i.diajukanPada);
    const cepat = diajukan.filter((i) => i.diverifikasiPada && hariKerjaAntara(lokal(i.diajukanPada!), lokal(i.diverifikasiPada), libur) <= 1);
    sub.push(hasil(s.a, diajukan.length, cepat.length, p.standar));

    // b — SPP/SPB tidak dikembalikan Keuangan: nonaktif sampai verifikasi Keuangan berjalan lagi.

    // c — kegiatan bulanan diinput paling lambat tanggal 5.
    const batasC = `${this.ctx.periode}-05`;
    const keg = this.ctx.kegiatan.filter((k) => k.unitId === pn.unitId);
    const pertama = keg.map((k) => lokal(k.dibuatPada)).sort()[0];
    if (pertama) sub.push(hasil(s.c, 1, pertama <= batasC ? 1 : 0, p.standar));
    else if (hariIni > batasC || this.ctx.batasVerifikasi) sub.push(hasil(s.c, 1, 0, p.standar));
    else sub.push(kosong(s.c, p.standar, "Belum jatuh tempo"));

    // d — layanan umum diajukan ≤ H-3.
    const layanan = this.itemStaf(pn, "SBK-4");
    const awal = layanan.filter((i) => {
      const k = this.kegiatan(i.kegiatanId);
      return k && lokal(i.dibuatPada) <= tambahHari(k.tanggal, -3);
    });
    sub.push(hasil(s.d, layanan.length, awal.length, p.standar, "Tidak ada permintaan layanan"));

    // e — uji petik arsip.
    const uji = this.ctx.ujiPetik.find((u) => u.unitId === pn.unitId);
    if (uji) sub.push(hasil(s.e, uji.jumlahDiuji, uji.jumlahSesuai, p.standar));
    else if (this.ctx.batasVerifikasi || hariIni > rentangPeriode(this.ctx.periode).akhir) sub.push({ ...hasil(s.e, 1, 0, p.standar), alasan: "Uji petik belum diisi" });
    else sub.push(kosong(s.e, p.standar, "Diisi di akhir bulan"));

    const skor = rataRata(sub.filter((x) => !x.dikecualikan).map((x) => x.skor!));
    return {
      kode: def.kode,
      nama: def.nama,
      target: 0,
      realisasi: 0,
      capaian: null,
      standar: p.standar,
      skor,
      dikecualikan: skor === null,
      alasan: skor === null ? "Belum ada sub-indikator yang bisa dihitung" : undefined,
      volumeKecil: false,
      sub,
    };
  }
}

/** Gabungkan katalog dengan parameter dari basis data (Admin bisa mengubah standar/tenggat/aktif). */
export function paramDefault(): Map<string, ParamIndikator> {
  return new Map(KATALOG.map((d) => [d.kode, { kode: d.kode, standar: d.standar, tenggat: d.tenggat, aktif: d.aktif, verifikator: d.verifikator }]));
}

/** Indikator aktif untuk satu peran. */
export function indikatorAktif(peran: PeranKerja, param: ReadonlyMap<string, ParamIndikator>) {
  return KATALOG.filter((d) => d.peran === peran && (param.get(d.kode)?.aktif ?? d.aktif));
}

/**
 * K1 semua penugasan dalam satu periode.
 * Urutan wajib: staf (SBK, SK) dulu, lalu KSBK karena KSBK-2 butuh K1 staf.
 */
export function hitungK1(ctx: KonteksK1): Map<string, HasilK1Penugasan> {
  const ev = new Evaluasi(ctx);
  const hasilPn = new Map<string, HasilK1Penugasan>();
  const k1Staf = new Map<string, number | null>();

  const hitung = (pn: PenugasanK1) => {
    const indikator = indikatorAktif(pn.peran, ctx.param).map((def) => ev.indikator(pn, def, ctx.param.get(def.kode)!, k1Staf));
    const pokok = rataRata(indikator.filter((i) => !i.tambahan && !i.dikecualikan).map((i) => i.skor!));
    const tambahan = indikator.filter((i) => i.tambahan).reduce((a, i) => a + (i.skor ?? 0), 0);
    // Tanpa indikator pokok, poin tambahan saja tidak membentuk K1.
    const k1 = pokok === null ? null : Math.min(100, pokok + tambahan);
    hasilPn.set(pn.id, { penugasanId: pn.id, indikator, pokok, tambahan, k1 });
    return k1;
  };

  for (const pn of ctx.penugasan.filter((p) => p.peran === "SBK" || p.peran === "SK")) k1Staf.set(pn.id, hitung(pn));
  for (const pn of ctx.penugasan.filter((p) => p.peran === "KSBK" || p.peran === "KU")) hitung(pn);
  return hasilPn;
}
