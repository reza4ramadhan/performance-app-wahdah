// Impor awal dari sheet STRUKTUR KPWI yang diekspor ke CSV (plan.md 10.2).
//   npm run impor:struktur -- --folder ./impor            (uji coba: hanya laporan, tidak menulis)
//   npm run impor:struktur -- --folder ./impor --tulis    (menulis ke basis data)
// Berkas: unit.csv, pegawai.csv, penugasan.csv — format di docs/templat-impor/.
// Baris yang gagal dicocokkan dilaporkan; password sementara ditulis ke data/kredensial-awal.csv (jangan dibagikan).

import "./env";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";
import { bacaCsv } from "../lib/absensi";
import { buatAkun, buatAuth } from "../lib/auth-config";
import { buatDb } from "../lib/db/koneksi";
import { eq } from "drizzle-orm";
import * as s from "../lib/db/schema";
import { sinkronKatalog } from "../lib/ikp/sinkron";
import { PERAN_KERJA, PERAN_MANUAL, PERAN_SISTEM, type PeranManual } from "../lib/ikp/tipe";

const { values: a } = parseArgs({ options: { folder: { type: "string", default: "./impor" }, tulis: { type: "boolean", default: false } } });
const baca = (nama: string) => {
  try {
    return bacaCsv(readFileSync(path.join(a.folder!, nama), "utf8"));
  } catch {
    console.error(`Berkas ${nama} tidak ditemukan di ${a.folder}.`);
    process.exit(1);
  }
};
const nomor = (x = "") => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0");
const JENIS = ["kantor", "bidang", "skuo", "unit_pendukung", "staf_khusus"] as const;
const STATUS = ["Mutafarrigh", "Muta'awin", "Kontrak"] as const;
const kata = ["amanah", "ikhlas", "sabar", "tekun", "jujur", "rapi", "sigap", "teliti"];
const pw = () => `${kata[randomInt(kata.length)]}-${kata[randomInt(kata.length)]}-${randomInt(10, 99)}`;

const unitCsv = baca("unit.csv");
const pegawaiCsv = baca("pegawai.csv");
const penugasanCsv = baca("penugasan.csv");
const gagal: string[] = [];

// ── Validasi ──
const namaUnit = new Set<string>();
unitCsv.forEach((r, i) => {
  if (!JENIS.includes(r.jenis as never)) gagal.push(`unit.csv baris ${i + 2}: jenis "${r.jenis}" tidak dikenal`);
  if (!r.nama) gagal.push(`unit.csv baris ${i + 2}: nama kosong`);
  if (namaUnit.has(r.nama)) gagal.push(`unit.csv baris ${i + 2}: nama "${r.nama}" ganda`);
  namaUnit.add(r.nama);
});
unitCsv.forEach((r, i) => r.induk && !namaUnit.has(r.induk) && gagal.push(`unit.csv baris ${i + 2}: induk "${r.induk}" tidak ada`));

const identitas = new Set<string>();
pegawaiCsv.forEach((r, i) => {
  const id = nomor(r.nip) || nomor(r.no_hp);
  if (!r.nama) gagal.push(`pegawai.csv baris ${i + 2}: nama kosong`);
  if (!id) gagal.push(`pegawai.csv baris ${i + 2}: NIP dan No. HP kosong`);
  if (identitas.has(id)) gagal.push(`pegawai.csv baris ${i + 2}: NIP/No. HP "${id}" ganda`);
  identitas.add(id);
  if (r.status_kepegawaian && !STATUS.includes(r.status_kepegawaian as never)) gagal.push(`pegawai.csv baris ${i + 2}: status "${r.status_kepegawaian}" tidak dikenal`);
  for (const p of (r.peran_sistem ?? "").split(/[;|]/).map((x) => x.trim()).filter(Boolean))
    if (!(PERAN_SISTEM as readonly string[]).includes(p)) gagal.push(`pegawai.csv baris ${i + 2}: peran "${p}" tidak dikenal`);
});
unitCsv.forEach((r, i) => r.waka_nip && !identitas.has(nomor(r.waka_nip)) && gagal.push(`unit.csv baris ${i + 2}: WaKa ${r.waka_nip} tidak ada di pegawai.csv`));
penugasanCsv.forEach((r, i) => {
  if (!identitas.has(nomor(r.nip))) gagal.push(`penugasan.csv baris ${i + 2}: pegawai ${r.nip} tidak ada di pegawai.csv`);
  if (!(PERAN_KERJA as readonly string[]).includes(r.peran_kerja)) gagal.push(`penugasan.csv baris ${i + 2}: peran kerja "${r.peran_kerja}" tidak dikenal`);
  if (!namaUnit.has(r.unit)) gagal.push(`penugasan.csv baris ${i + 2}: unit "${r.unit}" tidak ada di unit.csv`);
  if (r.koordinator_nip && !identitas.has(nomor(r.koordinator_nip))) gagal.push(`penugasan.csv baris ${i + 2}: koordinator ${r.koordinator_nip} tidak ada`);
  if (!/^\d{4}-\d{2}$/.test(r.periode_mulai)) gagal.push(`penugasan.csv baris ${i + 2}: periode_mulai harus YYYY-MM`);
});

console.log(`Dibaca: ${unitCsv.length} unit, ${pegawaiCsv.length} pegawai, ${penugasanCsv.length} penugasan.`);
if (gagal.length) {
  console.log(`\n${gagal.length} baris gagal dicocokkan:`);
  for (const g of gagal) console.log(`  - ${g}`);
  console.log("\nPerbaiki CSV lalu jalankan ulang. Tidak ada yang ditulis.");
  process.exit(1);
}
if (!a.tulis) {
  console.log("Semua baris sah. Jalankan ulang dengan --tulis untuk menyimpan.");
  process.exit(0);
}

// ── Tulis ──
async function tulis() {
  const { db, tutup } = await buatDb(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
  const auth = buatAuth(db);
  await sinkronKatalog(db);
  const pgId = new Map<string, string>();
  const kredensial = ["nama,login,password_sementara"];
  for (const r of pegawaiCsv) {
    const login = nomor(r.nip) || nomor(r.no_hp);
    const [p] = await db
      .insert(s.pegawai)
      .values({ nama: r.nama, nip: nomor(r.nip) || null, noHp: nomor(r.no_hp) || null, statusKepegawaian: r.status_kepegawaian || "Kontrak", kantor: r.kantor === "jakarta" ? "jakarta" : "makassar" })
      .returning();
    pgId.set(login, p.id);
    if (r.nip) pgId.set(nomor(r.nip), p.id);
    if (r.no_hp) pgId.set(nomor(r.no_hp), p.id);
    // Koordinator/WaKa/Kepala Kantor diturunkan dari penugasan; hanya peran fungsi yang disimpan.
    const peran = (r.peran_sistem ?? "").split(/[;|]/).map((x) => x.trim()).filter((x): x is PeranManual => (PERAN_MANUAL as readonly string[]).includes(x));
    if (peran.length) await db.insert(s.peranSistem).values(peran.map((x) => ({ pegawaiId: p.id, peran: x })));
    const kata = pw();
    await buatAkun(auth, { pegawaiId: p.id, nama: p.nama, username: login, password: kata });
    kredensial.push(`"${p.nama}",${login},${kata}`);
  }
  const unitId = new Map<string, string>();
  for (const r of unitCsv) {
    const [u] = await db.insert(s.unit).values({ jenis: r.jenis as (typeof JENIS)[number], nama: r.nama, wakaId: r.waka_nip ? pgId.get(nomor(r.waka_nip)) ?? null : null }).returning();
    unitId.set(r.nama, u.id);
  }
  for (const r of unitCsv) if (r.induk) await db.update(s.unit).set({ indukId: unitId.get(r.induk)! }).where(eq(s.unit.id, unitId.get(r.nama)!));
  for (const r of penugasanCsv)
    await db.insert(s.penugasan).values({
      pegawaiId: pgId.get(nomor(r.nip))!,
      peranKerja: r.peran_kerja as (typeof PERAN_KERJA)[number],
      unitId: unitId.get(r.unit)!,
      koordinatorId: r.koordinator_nip ? pgId.get(nomor(r.koordinator_nip))! : null,
      periodeMulai: r.periode_mulai,
      bobotAlokasi: r.bobot_alokasi ? Number(r.bobot_alokasi) : null,
    });
  mkdirSync("data", { recursive: true });
  writeFileSync("data/kredensial-awal.csv", kredensial.join("\n"));
  console.log(`Selesai. Password sementara: data/kredensial-awal.csv (${pegawaiCsv.length} akun). Simpan aman dan hapus setelah dibagikan.`);
  await tutup();
}

tulis().catch((e) => {
  console.error(e);
  process.exit(1);
});
