// Penyimpanan berkas JSON untuk tahap awal. Antarmuka (bacaDb / ubahDb) sengaja sempit
// supaya bisa diganti basis data sungguhan tanpa menyentuh halaman — lihat plan.md.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { hitungPeriode, type HasilPegawai } from "../kpi/engine";
import type { InputPeriode } from "../kpi/types";
import { STATUS_TERKUNCI, type AuditEntry, type Db, type Periode } from "./schema";
import { seed } from "./seed";

const BERKAS = path.join(process.cwd(), "data", "db.json");

async function muat(): Promise<Db> {
  try {
    return JSON.parse(await readFile(BERKAS, "utf8")) as Db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = seed();
    await simpan(db);
    return db;
  }
}

async function simpan(db: Db) {
  await mkdir(path.dirname(BERKAS), { recursive: true });
  const tmp = `${BERKAS}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, BERKAS);
}

/** Untuk komponen server: menunggu request agar data tidak ikut diprerender. */
export async function getDb() {
  await connection();
  return muat();
}

let antrean: Promise<unknown> = Promise.resolve();

/** Untuk Server Action: ubah db secara berurutan dan catat jejak audit. */
export function ubahDb<T>(fn: (db: Db, audit: (e: Omit<AuditEntry, "waktu">) => void) => T): Promise<T> {
  const kerja = antrean.then(async () => {
    const db = await muat();
    const waktu = new Date().toISOString();
    const hasil = fn(db, (e) => db.audit.push({ waktu, ...e }));
    await simpan(db);
    return hasil;
  });
  antrean = kerja.catch(() => {});
  return kerja;
}

export const periodeTerkunci = (p: Periode) => STATUS_TERKUNCI.includes(p.status);

export function cariPeriode(db: Db, id: string) {
  const p = db.periode.find((x) => x.id === id);
  if (!p) throw new Error(`Periode ${id} tidak ditemukan`);
  return p;
}

export const periodeAktif = (db: Db) => [...db.periode].sort((a, b) => b.id.localeCompare(a.id))[0];

export function penugasanBerlaku(db: Db, periodeId: string) {
  return db.penugasan.filter((t) => t.mulai <= periodeId && (!t.selesai || t.selesai >= periodeId));
}

export function inputPeriode(db: Db, periodeId: string): InputPeriode {
  const periode = cariPeriode(db, periodeId);
  const parameter = db.parameter.find((p) => p.versi === periode.parameterVersi)!;
  const di = <T extends { periodeId: string }>(xs: T[]) => xs.filter((x) => x.periodeId === periodeId);
  return {
    parameter,
    pegawai: db.pegawai,
    units: db.units,
    penugasan: penugasanBerlaku(db, periodeId),
    indikator: db.indikator,
    realisasi: di(db.realisasi),
    absensi: di(db.absensi),
    skorK3: di(db.skorK3),
    logPengembanganDiri: Object.fromEntries(di(db.logPengembanganDiri).map((l) => [l.pegawaiId, true])),
    k4Disahkan: Object.fromEntries(di(db.k4).map((k) => [k.pegawaiId, k.poin])),
  };
}

/** Hasil beku untuk periode yang sudah sah; selain itu IKP sementara dihitung ulang. */
export function hasilPeriode(db: Db, periodeId: string): HasilPegawai[] {
  const p = cariPeriode(db, periodeId);
  return p.hasilBeku ?? hitungPeriode(inputPeriode(db, periodeId));
}
