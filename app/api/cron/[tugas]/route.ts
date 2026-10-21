// Tugas terjadwal, dipanggil cron server Cloudways (plan.md Bagian 10):
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/pengingat?kantor=makassar
// Semua tugas idempoten: aman dijalankan ulang.

import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku, liburPerKantor, paramIndikator, periodeAtauBaru } from "@/lib/data/ikp";
import { kirimPush } from "@/lib/push";
import { hariIni, hariKerjaAntara, isHariKerja, keUtc, periodeBerikut, periodeDari, tambahHari, tanggalLokal, type Kantor } from "@/lib/waktu";

function sah(req: Request) {
  const rahasia = process.env.CRON_SECRET;
  const kiriman = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!rahasia || kiriman.length !== rahasia.length) return false;
  return timingSafeEqual(Buffer.from(kiriman), Buffer.from(rahasia));
}

export async function POST(req: Request, ctx: RouteContext<"/api/cron/[tugas]">) {
  if (!sah(req)) return Response.json({ galat: "Tidak berhak" }, { status: 401 });
  const { tugas } = await ctx.params;
  const url = new URL(req.url);
  try {
    if (tugas === "pengingat") return Response.json(await pengingatHarian(url.searchParams.get("kantor") === "jakarta" ? "jakarta" : "makassar"));
    if (tugas === "tenggat") return Response.json(await pengingatVerifikasi());
    if (tugas === "tutup-periode") return Response.json(await tutupPeriode());
    return Response.json({ galat: "Tugas tidak dikenal" }, { status: 404 });
  } catch (e) {
    console.error(`[cron ${tugas}]`, e);
    return Response.json({ galat: "Gagal menjalankan tugas" }, { status: 500 });
  }
}

/** 16.00 waktu setempat: pegawai yang belum mengisi apa pun hari ini. */
async function pengingatHarian(kantor: Kantor) {
  const db = await getDb();
  const libur = await liburPerKantor(db);
  const today = hariIni(kantor);
  if (!isHariKerja(today, libur(kantor))) return { dikirim: 0, alasan: "Bukan hari kerja" };
  const periode = periodeDari(today);
  const pegawai = await db
    .selectDistinct({ id: s.pegawai.id })
    .from(s.pegawai)
    .innerJoin(s.penugasan, eq(s.penugasan.pegawaiId, s.pegawai.id))
    .where(and(eq(s.pegawai.aktif, true), eq(s.pegawai.kantor, kantor), kondisiPenugasanBerlaku(periode), inArray(s.penugasan.peranKerja, ["SBK", "KSBK", "SK", "KU"])));
  const ids = pegawai.map((p) => p.id);
  if (!ids.length) return { dikirim: 0 };
  const [item, jurnal] = await Promise.all([
    db
      .selectDistinct({ id: s.penugasan.pegawaiId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(and(inArray(s.penugasan.pegawaiId, ids), gte(s.item.dibuatPada, keUtc(today, kantor)), lt(s.item.dibuatPada, keUtc(tambahHari(today, 1), kantor)))),
    db.selectDistinct({ id: s.jurnal.pegawaiId }).from(s.jurnal).where(and(inArray(s.jurnal.pegawaiId, ids), eq(s.jurnal.tanggal, today))),
  ]);
  const sudah = new Set([...item, ...jurnal].map((x) => x.id));
  const belum = ids.filter((id) => !sudah.has(id));
  const dikirim = await kirimPush(belum, { title: "Belum ada isian hari ini", body: "Catat item atau jurnal hari ini. Cukup 3 menit.", url: "/", tag: `harian-${today}` });
  return { belum: belum.length, dikirim };
}

/** Pagi hari kerja: koordinator dengan item menunggu verifikasi > 1 hari kerja. */
async function pengingatVerifikasi() {
  const db = await getDb();
  const libur = await liburPerKantor(db);
  const kodeKoordinator = [...(await paramIndikator(db)).values()].filter((p) => p.verifikator === "koordinator").map((p) => p.kode);
  const rows = await db
    .select({ koordinatorId: s.penugasan.koordinatorId, diajukan: s.item.diajukanPada })
    .from(s.item)
    .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
    .where(and(eq(s.item.status, "diajukan"), inArray(s.item.indikatorKode, kodeKoordinator)));
  const today = hariIni("makassar");
  const per = new Map<string, number>();
  for (const r of rows) {
    if (!r.koordinatorId || !r.diajukan) continue;
    if (hariKerjaAntara(tanggalLokal(r.diajukan, "makassar"), today, libur("makassar")) < 1) continue;
    per.set(r.koordinatorId, (per.get(r.koordinatorId) ?? 0) + 1);
  }
  let dikirim = 0;
  for (const [id, n] of per) dikirim += await kirimPush([id], { title: "Verifikasi menunggu", body: `${n} item staf menunggu verifikasi Anda.`, url: "/verifikasi", tag: `verif-${today}` });
  return { koordinator: per.size, dikirim };
}

/** Harian 00.05: pastikan periode bulan ini ada; bulan lalu yang masih berjalan pindah ke masa verifikasi. */
async function tutupPeriode() {
  const db = await getDb();
  const kini = periodeDari(hariIni("jakarta"));
  const lalu = periodeBerikut(kini, -1);
  await periodeAtauBaru(db, kini);
  const p = await periodeAtauBaru(db, lalu);
  if (p.status === "berjalan") {
    await db.update(s.periode).set({ status: "verifikasi" }).where(eq(s.periode.id, lalu));
    await db.insert(s.auditLog).values({ aktorId: null, aksi: "status-verifikasi", entitas: "periode", entitasId: lalu, sesudah: { oleh: "cron" } });
    return { periodeBaru: kini, verifikasi: lalu };
  }
  return { periodeBaru: kini, verifikasi: null };
}
