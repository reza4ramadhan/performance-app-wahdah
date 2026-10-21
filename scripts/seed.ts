// npm run db:seed — data contoh untuk pengembangan lokal (semua nama fiktif).
// Menolak berjalan di produksi kecuali --paksa. Semua akun contoh: password "wahdah123".

import { parseArgs } from "node:util";
import { buatAkun, buatAuth } from "../lib/auth-config";
import { buatDb } from "../lib/db/koneksi";
import * as s from "../lib/db/schema";
import { sinkronKatalog } from "../lib/ikp/sinkron";
import type { PeranSistem, SkorK3 } from "../lib/ikp/tipe";
import { geserHariKerja, hariIni, hariKerjaPeriode, keUtc, periodeBerikut, periodeDari, rentangPeriode, tambahHari } from "../lib/waktu";

const { values: arg } = parseArgs({ options: { paksa: { type: "boolean", default: false } } });
if (process.env.NODE_ENV === "production" && !arg.paksa) {
  console.error("Seed contoh tidak dijalankan di produksi. Pakai --paksa bila memang disengaja.");
  process.exit(1);
}

// PRNG deterministik supaya hasil seed sama setiap kali.
let benih = 7;
const acak = () => ((benih = (benih * 16807) % 2147483647) - 1) / 2147483646;
const pilih = <T,>(xs: T[]) => xs[Math.floor(acak() * xs.length)];

const PASSWORD = "wahdah123";
const LIBUR = new Set<string>();

async function main() {
  const { db, tutup, jenis } = await buatDb(process.env.DATABASE_URL);
  const auth = buatAuth(db);
  await sinkronKatalog(db);

  const kosong = await db.select({ id: s.pegawai.id }).from(s.pegawai).limit(1);
  if (kosong.length) {
    console.log("Basis data sudah berisi pegawai. Hapus ./data/pglite (lokal) untuk mengulang seed.");
    return tutup();
  }

  const today = hariIni("makassar");
  const periode = periodeDari(today);
  const lalu = periodeBerikut(periode, -1);
  const w = (tgl: string, jam = "09:00") => keUtc(tgl, "makassar", jam);

  // ── Unit ──
  const unit = async (jenis: (typeof s.unit.$inferInsert)["jenis"], nama: string, indukId?: string) =>
    (await db.insert(s.unit).values({ jenis, nama, indukId }).returning())[0];
  const kantor = await unit("kantor", "Kantor Pusat");
  const bk1 = await unit("bidang", "Bidang 1 · Dakwah", kantor.id);
  const bk2 = await unit("bidang", "Bidang 2 · Pendidikan", kantor.id);
  const setjen = await unit("bidang", "Kesetjenan", kantor.id);
  const skuo1 = await unit("skuo", "SKUO Lembaga Dakwah", bk1.id);
  const skuo2 = await unit("skuo", "SKUO Lembaga Pendidikan", bk2.id);
  const lu = await unit("unit_pendukung", "Layanan Umum", kantor.id);
  const keamanan = await unit("staf_khusus", "Staf Khusus Keamanan", kantor.id);

  // ── Pegawai + akun ──
  type Org = { nama: string; nip: string; hp: string; status: string; kantor?: "makassar" | "jakarta"; peran: PeranSistem[] };
  const orang = async (o: Org) => {
    const [pg] = await db
      .insert(s.pegawai)
      .values({ nama: o.nama, nip: o.nip, noHp: o.hp, statusKepegawaian: o.status, kantor: o.kantor ?? "makassar" })
      .returning();
    for (const peran of o.peran) await db.insert(s.peranSistem).values({ pegawaiId: pg.id, peran });
    await buatAkun(auth, { pegawaiId: pg.id, nama: pg.nama, username: o.nip, password: PASSWORD, harusGanti: false });
    return pg;
  };

  const kk = await orang({ nama: "Ust. Contoh Kepala Kantor", nip: "1001", hp: "081100001001", status: "Mutafarrigh", peran: ["kepala"] });
  const waka = await orang({ nama: "Contoh Wakil Kepala I", nip: "1002", hp: "081100001002", status: "Mutafarrigh", peran: ["waka"] });
  const sekr = await orang({ nama: "Fatimah Sekretariat", nip: "1003", hp: "081100001003", status: "Mutafarrigh", peran: ["sekretariat"] });
  const pers = await orang({ nama: "Rahmat Personalia", nip: "1004", hp: "081100001004", status: "Kontrak", peran: ["personalia"] });
  const keu = await orang({ nama: "Nurul Keuangan", nip: "1005", hp: "081100001005", status: "Kontrak", peran: ["keuangan"] });
  const adm = await orang({ nama: "Yusuf Data & Monev", nip: "1006", hp: "081100001006", status: "Mutafarrigh", peran: ["admin"] });
  const ahmad = await orang({ nama: "Ahmad Fauzan", nip: "2001", hp: "081200002001", status: "Mutafarrigh", peran: ["koordinator"] });
  const budi = await orang({ nama: "Budi Santoso", nip: "2002", hp: "081200002002", status: "Kontrak", peran: [] });
  const citra = await orang({ nama: "Citra Lestari", nip: "2003", hp: "081200002003", status: "Muta'awin", peran: [] });
  const dani = await orang({ nama: "Dani Pratama", nip: "2004", hp: "081200002004", status: "Mutafarrigh", kantor: "jakarta", peran: ["koordinator"] });
  const eka = await orang({ nama: "Eka Wulandari", nip: "2005", hp: "081200002005", status: "Kontrak", kantor: "jakarta", peran: [] });
  const fajar = await orang({ nama: "Fajar Hidayat", nip: "2006", hp: "081200002006", status: "Mutafarrigh", peran: ["koordinator"] });
  const hasan = await orang({ nama: "Hasan Basri", nip: "2007", hp: "081200002007", status: "Kontrak", peran: [] });

  for (const u of [bk1, bk2, setjen, lu, keamanan]) await db.update(s.unit).set({ wakaId: waka.id }).where((await import("drizzle-orm")).eq(s.unit.id, u.id));

  // ── Penugasan ──
  const pn = async (pegawaiId: string, peranKerja: (typeof s.penugasan.$inferInsert)["peranKerja"], unitId: string, koordinatorId: string | null, bobotAlokasi?: number) =>
    (await db.insert(s.penugasan).values({ pegawaiId, peranKerja, unitId, koordinatorId, periodeMulai: lalu, bobotAlokasi }).returning())[0];
  await pn(kk.id, "KAKAN", kantor.id, null);
  await pn(waka.id, "WAKA", kantor.id, kk.id);
  await pn(ahmad.id, "KSBK", bk1.id, waka.id);
  const pBudi = await pn(budi.id, "SBK", bk1.id, ahmad.id);
  const pCitra1 = await pn(citra.id, "SBK", bk1.id, ahmad.id, 60);
  await pn(dani.id, "KSBK", bk2.id, waka.id);
  const pCitra2 = await pn(citra.id, "SBK", bk2.id, dani.id, 40);
  const pEka = await pn(eka.id, "SBK", bk2.id, dani.id);
  await pn(fajar.id, "KU", lu.id, waka.id);
  const pHasan = await pn(hasan.id, "SK", keamanan.id, fajar.id);
  // Pegawai pendukung juga staf Kesetjenan agar punya K1.
  for (const p of [sekr, pers, keu, adm]) await pn(p.id, "SBK", setjen.id, ahmad.id);

  await db.insert(s.periode).values([{ id: lalu, status: "kalibrasi" }, { id: periode, status: "berjalan" }]);
  await db.insert(s.hariLibur).values([
    { tanggal: "2026-12-25", keterangan: "Hari Raya Natal" },
    { tanggal: "2026-08-17", keterangan: "Hari Kemerdekaan RI" },
  ]);

  // ── Kegiatan bulan ini ──
  const hk = hariKerjaPeriode(periode, LIBUR);
  const kegiatan = [];
  for (const [i, k] of [
    { unit: bk1, nama: "Daurah Dai Wilayah", hari: 6, spp: true, spb: true, pj: budi.id },
    { unit: bk1, nama: "Rapat Koordinasi Lembaga Dakwah", hari: 12, spp: false, spb: false, pj: citra.id },
    { unit: bk1, nama: "Tabligh Akbar Bulanan", hari: 20, spp: true, spb: true, pj: budi.id },
    { unit: bk2, nama: "Pelatihan Guru Tahfizh", hari: 9, spp: true, spb: true, pj: eka.id },
    { unit: bk2, nama: "Rapat Kurikulum", hari: 18, spp: false, spb: false, pj: null },
  ].entries()) {
    const tanggal = hk[Math.min(k.hari, hk.length - 1)];
    const [row] = await db
      .insert(s.kegiatan)
      .values({ unitId: k.unit.id, skuoId: k.unit === bk1 ? skuo1.id : skuo2.id, nama: k.nama, tanggal, perluSpp: k.spp, perluSpb: k.spb, penanggungJawabId: k.pj, dibuatOleh: k.unit === bk1 ? ahmad.id : dani.id, dibuatPada: w(`${periode}-0${i < 3 ? 3 : 7}`) })
      .returning();
    kegiatan.push(row);
  }

  // ── Item ──
  type ItemBaru = typeof s.item.$inferInsert;
  const items: ItemBaru[] = [];
  const verifikasiOleh = (kode: string, koordinator: string) => (kode.startsWith("SBK-2") ? keu.id : koordinator);
  const tambah = (p: { id: string; pegawaiId: string; koordinatorId: string | null }, kode: string, masuk: string, selesai: string | null, data: Record<string, string>, opsi: { kegiatanId?: string; status?: ItemBaru["status"]; verif?: string; jam?: [string, string] } = {}) => {
    const sudahLewat = selesai !== null && selesai <= today;
    const status = opsi.status ?? (sudahLewat ? (selesai! < tambahHari(today, -2) ? "disetujui" : "diajukan") : "terbuka");
    items.push({
      penugasanId: p.id,
      indikatorKode: kode,
      kegiatanId: opsi.kegiatanId ?? null,
      periodeId: periode,
      data,
      tglMasuk: w(masuk, opsi.jam?.[0]),
      tglSelesai: selesai && sudahLewat ? w(selesai, opsi.jam?.[1] ?? "15:00") : null,
      linkBukti: selesai && sudahLewat ? "https://drive.google.com/contoh-bukti" : null,
      status,
      diajukanPada: status !== "terbuka" ? w(selesai!, "15:00") : null,
      verifikatorId: status === "disetujui" || status === "ditolak" ? verifikasiOleh(kode, p.koordinatorId!) : null,
      diverifikasiPada: status === "disetujui" || status === "ditolak" ? w(opsi.verif ?? geserHariKerja(selesai!, acak() < 0.8 ? 0 : 2, LIBUR), "10:00") : null,
      alasanTolak: status === "ditolak" ? "Link bukti tidak bisa dibuka" : null,
      dibuatOleh: p.pegawaiId,
      dibuatPada: w(masuk),
    });
  };

  const perihal = ["Undangan rapat koordinasi", "Surat tugas pemateri", "Permohonan izin tempat", "Surat edaran kegiatan", "Balasan surat SKUO"];
  const sampai = hk.filter((d) => d <= today);
  for (const [p, rajin] of [[pBudi, 0.9], [pCitra1, 0.75], [pCitra2, 0.85], [pEka, 0.6]] as const) {
    for (const d of sampai) {
      if (acak() < 0.55) {
        const cepat = acak() < rajin;
        tambah(p, "SBK-1", d, geserHariKerja(d, cepat ? (acak() < 0.5 ? 0 : 1) : 2, LIBUR), { perihal: pilih(perihal), skuo: p.id === pEka.id || p.id === pCitra2.id ? skuo2.nama : skuo1.nama });
      }
      if (acak() < 0.25) tambah(p, "SBK-5", d, geserHariKerja(d, acak() < rajin ? 2 : 5, LIBUR), { jenis: pilih(["Notulensi", "Dokumen kegiatan"]), judul: `Notulensi ${pilih(["rapat pekanan", "rapat bidang", "koordinasi SKUO"])}` });
    }
  }
  for (const k of kegiatan) {
    const staf = k.penanggungJawabId === budi.id ? pBudi : k.penanggungJawabId === citra.id ? pCitra1 : k.penanggungJawabId === eka.id ? pEka : pCitra2;
    const awal = tambahHari(k.tanggal, -7) < `${periode}-01` ? `${periode}-01` : tambahHari(k.tanggal, -7);
    if (k.perluSpp) tambah(staf, "SBK-2a", awal, geserHariKerja(k.tanggal, staf === pEka ? -1 : -4, LIBUR), { nomor: `SPP-${k.tanggal.slice(5).replace("-", "")}` }, { kegiatanId: k.id });
    tambah(staf, "SBK-3", awal, tambahHari(k.tanggal, -5), { saluran: "Grup" }, { kegiatanId: k.id });
    if (staf !== pEka) tambah(staf, "SBK-3", awal, tambahHari(k.tanggal, -1), { saluran: "Pesan pribadi" }, { kegiatanId: k.id });
    tambah(staf, "SBK-4", tambahHari(k.tanggal, -6) < `${periode}-01` ? `${periode}-01` : tambahHari(k.tanggal, -6), tambahHari(k.tanggal, -1), { jenis: pilih(["Konsumsi", "Zoom", "Sertifikat"]) }, { kegiatanId: k.id });
  }
  // Satu item ditolak supaya alur perbaikan terlihat.
  tambah(pEka, "SBK-1", sampai[Math.max(0, sampai.length - 4)], sampai[Math.max(0, sampai.length - 4)], { perihal: "Surat permohonan narasumber", skuo: skuo2.nama }, { status: "ditolak" });

  // Staf Khusus: kejadian & layanan.
  for (const d of sampai.filter(() => acak() < 0.2)) tambah(pHasan, "SK-2", d, d, { uraian: pilih(["Lampu parkir padam", "Tamu tanpa janji", "Pintu darurat terbuka"]) }, { jam: ["21:00", acak() < 0.85 ? "22:00" : "23:30"] });
  for (const d of sampai.filter(() => acak() < 0.3)) tambah(pHasan, "SK-3", d, d, { uraian: pilih(["Buka ruang rapat", "Antar dokumen", "Atur parkir tamu"]) }, { jam: ["08:00", "10:00"] });

  // Pegawai pendukung: sedikit SBK-1 di Kesetjenan.
  const pendukung = await db.select().from(s.penugasan).where((await import("drizzle-orm")).eq(s.penugasan.unitId, setjen.id));
  for (const p of pendukung) for (const d of sampai.filter(() => acak() < 0.3)) tambah(p, "SBK-1", d, geserHariKerja(d, acak() < 0.85 ? 1 : 3, LIBUR), { perihal: pilih(perihal), skuo: "Kesetjenan" });

  for (let i = 0; i < items.length; i += 200) await db.insert(s.item).values(items.slice(i, i + 200));

  // ── DTR Staf Khusus ──
  const dtr = await db
    .insert(s.dtrTugas)
    .values([
      { penugasanId: pHasan.id, periodeId: periode, uraian: "Patroli malam area gedung", frekuensi: "harian", disetujuiOleh: fajar.id, disetujuiPada: w(`${periode}-02`) },
      { penugasanId: pHasan.id, periodeId: periode, uraian: "Cek APAR dan jalur evakuasi", frekuensi: "mingguan", disetujuiOleh: fajar.id, disetujuiPada: w(`${periode}-02`) },
      { penugasanId: pHasan.id, periodeId: periode, uraian: "Kepatuhan shift jaga", frekuensi: "harian", disetujuiOleh: fajar.id, disetujuiPada: w(`${periode}-02`) },
    ])
    .returning();
  const cek = [];
  for (const d of sampai) {
    for (const t of dtr.filter((t) => t.frekuensi === "harian")) if (acak() < 0.9) cek.push({ dtrTugasId: t.id, tanggal: d, selesai: true, disetujui: d < tambahHari(today, -1) });
    if (new Date(`${d}T00:00:00Z`).getUTCDay() === 3) cek.push({ dtrTugasId: dtr[1].id, tanggal: d, selesai: true, disetujui: d < today });
  }
  if (cek.length) await db.insert(s.dtrCek).values(cek);

  // ── Jurnal & pengembangan diri ──
  const jurnal = [];
  const pd = [];
  for (const p of [budi, citra, eka, ahmad, dani, hasan, sekr]) {
    for (const d of sampai) {
      if (acak() < 0.5) jurnal.push({ pegawaiId: p.id, tanggal: d, uraian: pilih(["Membantu persiapan acara Muktamar", "Mendampingi tamu dari wilayah", "Menyusun bahan presentasi pimpinan", "Rapat panitia kegiatan Ramadan"]), unitId: pilih([bk1.id, bk2.id, skuo1.id]), pemberiTugas: pilih(["Sekretaris Jenderal", "Ketua Bidang", "Kepala Kantor"]) });
      if (acak() < 0.15 && p !== eka) pd.push({ pegawaiId: p.id, tanggal: d, judul: pilih(["Kajian Riyadhus Shalihin", "Kursus Excel lanjutan", "Buku Manajemen Waktu", "Webinar kearsipan"]), durasiMenit: pilih([30, 45, 60, 90]), ringkasan: "Catatan singkat materi yang dipelajari." });
    }
  }
  if (jurnal.length) await db.insert(s.jurnal).values(jurnal);
  if (pd.length) await db.insert(s.pengembanganDiri).values(pd);

  // ── Catatan perilaku ──
  await db.insert(s.catatanPerilaku).values([
    { penilaiId: ahmad.id, pegawaiId: budi.id, tanggal: sampai[2] ?? today, nilaiK3: "profesional", catatan: "Menyelesaikan surat undangan Daurah sebelum diminta." },
    { penilaiId: ahmad.id, pegawaiId: citra.id, tanggal: sampai[5] ?? today, nilaiK3: "kolaboratif", catatan: "Membantu Bidang 2 menyiapkan konsumsi rapat kurikulum." },
    { penilaiId: dani.id, pegawaiId: eka.id, tanggal: sampai[4] ?? today, nilaiK3: "profesional", catatan: "Dua kali terlambat menginput SPP." },
  ]);

  // ── Bulan lalu: absensi & K3 terkirim supaya rekap punya contoh ──
  const semuaPg = [kk, waka, sekr, pers, keu, adm, ahmad, budi, citra, dani, eka, fajar, hasan];
  await db.insert(s.absensi).values(
    semuaPg.map((p) => {
      const wajib = hariKerjaPeriode(lalu, LIBUR).length;
      const hadir = p === eka ? wajib - 5 : wajib - Math.floor(acak() * 2);
      return { periodeId: lalu, pegawaiId: p.id, hariKerjaWajib: wajib, hadir, hadirTepatWaktu: hadir - Math.floor(acak() * 3), izinSakit: wajib - hadir };
    }),
  );
  const skor = (v: number[]): SkorK3 => ({ akhlak: v[0], profesional: v[1], inovatif: v[2], kolaboratif: v[3], rasaMemiliki: v[4], pengembanganDiri: v[5] });
  const k3Lalu = (await db.select().from(s.penugasan)).filter((p) => p.koordinatorId && p.peranKerja !== "WAKA");
  await db.insert(s.penilaianK3).values(
    k3Lalu.map((p) => ({ periodeId: lalu, penugasanId: p.id, penilaiId: p.koordinatorId!, skor: skor([4, 4, 3, 4, 4, 3].map((v) => (acak() < 0.2 ? v - 1 : v))), contoh: {}, status: "dikirim" as const })),
  );

  console.log(`Seed selesai (${jenis}). Periode ${periode} berjalan, ${lalu} contoh rekap.`);
  console.log(`${items.length} item, ${kegiatan.length} kegiatan, ${jurnal.length} jurnal. Login: NIP 1001–1006 / 2001–2007, password "${PASSWORD}".`);
  console.log(`Contoh: 2002 (staf), 2001 (koordinator), 1003 (sekretariat), 1006 (admin). Rentang: ${rentangPeriode(periode).awal}–${today}.`);
  await tutup();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
