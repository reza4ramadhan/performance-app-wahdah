// Tugas terjadwal, dipanggil cron server Cloudways (plan.md Bagian 10):
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/pengingat?kantor=makassar
// Jadwal (UTC) ada di README: pengingat 15.00 setempat, tenggat pagi, tutup-periode, rutin.
// Semua tugas idempoten: aman dijalankan ulang.

import { timingSafeEqual } from "node:crypto";
import { and, count, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { periodeKonfirmasi, pesanMenunggu, pesanPengingat, pesanRencana } from "@/lib/notifikasi";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku, liburPerKantor, paramIndikator, periodeAtauBaru } from "@/lib/data/ikp";
import { kirimPush } from "@/lib/push";
import { hariIni, hariKerjaAntara, isHariKerja, keUtc, periodeBerikut, periodeDari, rentangPeriode, tambahHari, tanggalLokal, type Kantor } from "@/lib/waktu";

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
    if (tugas === "rutin") return Response.json(await terbitkanRutin());
    return Response.json({ galat: "Tugas tidak dikenal" }, { status: 404 });
  } catch (e) {
    console.error(`[cron ${tugas}]`, e);
    return Response.json({ galat: "Gagal menjalankan tugas" }, { status: 500 });
  }
}

/**
 * 15.00 waktu setempat (docs/rombak-v2/02–04 B): Staf Administrasi yang belum ada aktivitas hari ini atau masih
 * punya tugas hari ini/terlambat; Staf Tugas Rutin yang masih punya tugas belum ditandai selesai; koordinator untuk
 * tugas pribadinya. Aturan pesan: lib/notifikasi.ts.
 */
async function pengingatHarian(kantor: Kantor) {
  const db = await getDb();
  const libur = await liburPerKantor(db);
  const today = hariIni(kantor);
  if (!isHariKerja(today, libur(kantor))) return { dikirim: 0, alasan: "Bukan hari kerja" };
  const periode = periodeDari(today);
  const pn = await db
    .select({ id: s.penugasan.id, pegawaiId: s.penugasan.pegawaiId, peranKerja: s.penugasan.peranKerja })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .where(and(eq(s.pegawai.aktif, true), eq(s.pegawai.kantor, kantor), kondisiPenugasanBerlaku(periode), inArray(s.penugasan.peranKerja, ["SBK", "KSBK", "SK"])));
  const ids = [...new Set(pn.map((p) => p.pegawaiId))];
  if (!ids.length) return { dikirim: 0 };
  const pnStaf = pn.filter((p) => p.peranKerja !== "KSBK").map((p) => p.id);
  const awal = keUtc(today, kantor);
  const akhir = keUtc(tambahHari(today, 1), kantor);
  const { daftarItem } = await import("@/lib/data/item");
  const { daftarTugas } = await import("@/lib/data/tugas");
  const [item, jurnal, selesaiItem, selesaiTugas, itemBuka, tugasBuka] = await Promise.all([
    db
      .selectDistinct({ id: s.penugasan.pegawaiId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(and(inArray(s.penugasan.pegawaiId, ids), gte(s.item.dibuatPada, awal), lt(s.item.dibuatPada, akhir))),
    db.selectDistinct({ id: s.jurnal.pegawaiId }).from(s.jurnal).where(and(inArray(s.jurnal.pegawaiId, ids), eq(s.jurnal.tanggal, today))),
    db
      .selectDistinct({ id: s.penugasan.pegawaiId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(and(inArray(s.penugasan.pegawaiId, ids), gte(s.item.diajukanPada, awal), lt(s.item.diajukanPada, akhir))),
    db
      .selectDistinct({ id: s.penugasan.pegawaiId })
      .from(s.tugasKhususJadwal)
      .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.tugasKhusus.penugasanId))
      .where(and(inArray(s.penugasan.pegawaiId, ids), gte(s.tugasKhususJadwal.selesaiPada, awal), lt(s.tugasKhususJadwal.selesaiPada, akhir))),
    pnStaf.length ? daftarItem(and(inArray(s.item.penugasanId, pnStaf), inArray(s.item.status, ["terbuka", "ditolak"])), { kantor, batas: 5000 }) : Promise.resolve([]),
    pnStaf.length ? daftarTugas(and(inArray(s.tugasKhusus.penugasanId, pnStaf), inArray(s.tugasKhususJadwal.status, ["belum", "dikerjakan", "ditolak"]), lt(s.tugasKhususJadwal.tenggat, akhir)), 5000) : Promise.resolve([]),
  ]);
  const aktif = new Set([...item, ...jurnal, ...selesaiItem, ...selesaiTugas].map((x) => x.id));
  let dikirim = 0;
  let diingatkan = 0;
  for (const id of ids) {
    const milik = pn.filter((p) => p.pegawaiId === id);
    const pola = milik.some((p) => p.peranKerja === "SBK") ? "administrasi" : milik.some((p) => p.peranKerja === "SK") ? "rutin" : null;
    const it = itemBuka.filter((i) => i.pemilikId === id && !i.pendingDana && !(i.kegiatanStatus && !["jalan", "geser"].includes(i.kegiatanStatus)) && i.tenggat && i.tenggat <= today);
    const tg = tugasBuka.filter((t) => t.stafId === id);
    const pesan = pesanPengingat(
      {
        pola,
        adaAktivitas: aktif.has(id),
        belumHariIni: it.filter((i) => i.tenggat === today).length + tg.filter((t) => tanggalLokal(t.tenggat, kantor) === today).length,
        terlambat: it.filter((i) => i.tenggat! < today).length + tg.filter((t) => tanggalLokal(t.tenggat, kantor) < today).length,
      },
      today,
    );
    if (!pesan) continue;
    diingatkan++;
    dikirim += await kirimPush([id], pesan);
  }
  return { pegawai: ids.length, diingatkan, dikirim };
}

/**
 * Pagi hari kerja, untuk koordinator: pekerjaan staf (item & tugas) menunggu diperiksa > 1 hari kerja, dan — sejak
 * tgl 25 sampai batas tgl 5 — rencana kegiatan yang belum dikonfirmasi.
 */
async function pengingatVerifikasi() {
  const db = await getDb();
  const libur = await liburPerKantor(db);
  const today = hariIni("makassar");
  const lama = (d: Date | null) => !!d && hariKerjaAntara(tanggalLokal(d, "makassar"), today, libur("makassar")) >= 1;
  const kodeKoordinator = [...(await paramIndikator(db)).values()].filter((p) => p.verifikator === "koordinator").map((p) => p.kode);
  const [item, tugas] = await Promise.all([
    db
      .select({ koordinatorId: s.penugasan.koordinatorId, diajukan: s.item.diajukanPada })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(and(eq(s.item.status, "diajukan"), inArray(s.item.indikatorKode, kodeKoordinator.length ? kodeKoordinator : ["-"]))),
    db.select({ pemberi: s.tugasKhusus.dibuatOleh, selesai: s.tugasKhususJadwal.selesaiPada }).from(s.tugasKhususJadwal).innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId)).where(eq(s.tugasKhususJadwal.status, "diajukan")),
  ]);
  const per = new Map<string, number>();
  const tambah = (id: string | null) => id && per.set(id, (per.get(id) ?? 0) + 1);
  for (const r of item) if (lama(r.diajukan)) tambah(r.koordinatorId);
  for (const r of tugas) if (lama(r.selesai)) tambah(r.pemberi);
  let dikirim = 0;
  for (const [id, n] of per) dikirim += await kirimPush([id], pesanMenunggu(n, today)!);

  // Konfirmasi rencana (unit administrasi A–M).
  let rencana = 0;
  const kp = periodeKonfirmasi(today);
  if (kp) {
    const { awal, akhir } = rentangPeriode(kp.periode);
    const belum = await db
      .select({ unitId: s.kegiatan.unitId, n: count() })
      .from(s.kegiatan)
      .where(and(eq(s.kegiatan.status, "rencana"), gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, akhir)))
      .groupBy(s.kegiatan.unitId);
    if (belum.length) {
      const ko = await db
        .select({ pegawaiId: s.penugasan.pegawaiId, unitId: s.penugasan.unitId })
        .from(s.penugasan)
        .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
        .where(and(eq(s.pegawai.aktif, true), eq(s.penugasan.peranKerja, "KSBK"), inArray(s.penugasan.unitId, belum.map((b) => b.unitId)), kondisiPenugasanBerlaku(periodeDari(today))));
      const perKo = new Map<string, number>();
      for (const k of ko) perKo.set(k.pegawaiId, (perKo.get(k.pegawaiId) ?? 0) + (belum.find((b) => b.unitId === k.unitId)?.n ?? 0));
      for (const [id, n] of perKo) {
        const p = pesanRencana(n, kp, today);
        if (p) rencana += await kirimPush([id], p);
      }
    }
  }
  return { koordinator: per.size, dikirim, rencana };
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

/**
 * Harian (mis. 00.30): pastikan jadwal tugas rutin dari Set Tugas sudah terbit sampai Minggu pekan depan untuk
 * semua staf tugas rutin. Halaman Tugas juga memanggilnya, jadi cron ini hanya jaring pengaman.
 */
async function terbitkanRutin() {
  const db = await getDb();
  const { pastikanRutin } = await import("@/lib/data/set-tugas");
  let dibuat = 0;
  for (const kantor of ["makassar", "jakarta"] as const) {
    const pn = await db
      .select({ id: s.penugasan.id })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(and(eq(s.pegawai.aktif, true), eq(s.pegawai.kantor, kantor), eq(s.penugasan.peranKerja, "SK"), kondisiPenugasanBerlaku(periodeDari(hariIni(kantor)))));
    dibuat += await pastikanRutin(db, pn.map((p) => p.id), kantor);
  }
  return { dibuat };
}
