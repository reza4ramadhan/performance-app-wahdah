// Data tab Tugas · Saya: item (checklist kegiatan + dicatat sendiri) dan delegasi koordinator, digabung
// menjadi satu daftar berlabel unit (lib/tugas-saya.ts).

import "server-only";
import { and, gte, inArray, lte, or } from "drizzle-orm";
import { schema as s } from "../db";
import type { Sesi } from "../sesi";
import { rentangPekan, type BarisTugasSaya } from "../tugas-saya";
import { hariIni, jamLokal, keUtc, tambahHari, tanggalLokal } from "../waktu";
import { daftarItem, kondisiItemPenugasan, type BarisItem } from "./item";
import { daftarTugas, kondisiTugasPenugasan } from "./tugas";

/** Apa yang harus dilakukan untuk satu item, dalam kata kerja. */
export function aksiItem(i: Pick<BarisItem, "indikatorKode" | "data" | "judul">): string {
  switch (i.indikatorKode) {
    case "SBK-3":
      return `Kirim pengingat ke-${i.data.ke ?? "1"}`;
    case "SBK-2a":
      return "Input SPP di SIMAKPRO";
    case "SBK-2b":
      return "Input SPB di SIMAKPRO";
    case "SBK-1":
      return i.data.perihal ? `Surat: ${i.data.perihal}` : "Buat surat";
    case "SBK-4":
      return i.data.jenis ? `Siapkan layanan ${i.data.jenis.toLowerCase()}` : "Siapkan layanan";
    case "SBK-5":
      return i.data.judul ? `Arsipkan: ${i.data.judul}` : "Arsipkan dokumen";
    default:
      return i.judul;
  }
}

const STATUS_ITEM = { terbuka: "buka", ditolak: "ditolak", diajukan: "menunggu", disetujui: "disetujui" } as const;
const STATUS_TUGAS = { belum: "buka", dikerjakan: "buka", ditolak: "ditolak", diajukan: "menunggu", disetujui: "disetujui" } as const;

export async function muatTugasSaya(sesi: Sesi) {
  const today = hariIni(sesi.kantor);
  const sejak = keUtc(rentangPekan(today).awal, sesi.kantor);
  const pn = sesi.penugasan.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK");
  const unitPn = new Map(pn.map((p) => [p.id, { unitId: p.unitId, unitNama: p.unitNama }]));
  const pnIds = pn.map((p) => p.id);

  const [item, delegasi] = await Promise.all([
    daftarItem(and(kondisiItemPenugasan(pnIds), or(inArray(s.item.status, ["terbuka", "ditolak"]), gte(s.item.diajukanPada, sejak))), { kantor: sesi.kantor, batas: 300 }),
    daftarTugas(
      and(
        kondisiTugasPenugasan(pnIds),
        or(inArray(s.tugasKhususJadwal.status, ["belum", "dikerjakan", "ditolak"]), gte(s.tugasKhususJadwal.selesaiPada, sejak)),
        lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 60), sesi.kantor)),
      ),
      300,
    ),
  ]);

  // Checklist kegiatan yang ditunda/batal dan belum dikerjakan tidak lagi menjadi tugas.
  const keluar = (i: BarisItem) => !!i.kegiatanStatus && !["jalan", "geser"].includes(i.kegiatanStatus) && (i.status === "terbuka" || i.status === "ditolak");
  const baris: BarisTugasSaya[] = [
    ...item.filter((i) => !keluar(i)).map((i) => ({
      id: i.id,
      jenis: "item" as const,
      judul: aksiItem(i),
      konteks: i.kegiatanNama,
      unitId: i.unitId,
      unitNama: i.unitNama,
      tenggat: i.tenggat,
      jam: null,
      lewat: i.lewat,
      status: STATUS_ITEM[i.status],
      alasanTolak: i.alasanTolak,
      pending: i.pendingDana,
      selesaiPada: i.diajukanPada,
      href: `/item/${i.id}`,
    })),
    ...delegasi.map((t) => ({
      id: t.id,
      jenis: "delegasi" as const,
      judul: t.judul,
      konteks: t.pemberiNama,
      unitId: unitPn.get(t.penugasanId)?.unitId ?? "",
      unitNama: unitPn.get(t.penugasanId)?.unitNama ?? "",
      tenggat: tanggalLokal(t.tenggat, t.kantor),
      jam: jamLokal(t.tenggat, t.kantor).replace(":", "."),
      lewat: t.lewat,
      status: STATUS_TUGAS[t.status],
      alasanTolak: t.alasanTolak,
      pending: false,
      selesaiPada: t.selesaiPada,
      href: `/tugas/${t.id}`,
    })),
  ];
  return { baris };
}
