// Lengkapi item otomatis (Pengingat 1 & 2, SPP, SPB) untuk kegiatan yang dibuat sebelum fitur item otomatis ada.
//   npm run lengkapi:kegiatan            (uji coba: hanya laporan, perubahan dibatalkan)
//   npm run lengkapi:kegiatan -- --tulis (menulis ke basis data)
// Hanya kegiatan di periode yang belum dikunci. Aman dijalankan berulang.

import "./env";
import { parseArgs } from "node:util";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { buatDb, type Db } from "../lib/db/koneksi";
import * as s from "../lib/db/schema";
import { buatItemOtomatis } from "../lib/data/kegiatan";
import { periodeDari } from "../lib/waktu";

const { values: a } = parseArgs({ options: { tulis: { type: "boolean", default: false } } });
const BATAL = new Error("uji coba");

async function main() {
  const { db, tutup, jenis } = await buatDb(process.env.DATABASE_URL);
  console.log(`Basis data: ${jenis}${a.tulis ? "" : " (uji coba)"}`);
  const terkunci = (await db.select({ id: s.periode.id }).from(s.periode).where(inArray(s.periode.status, ["sementara", "disahkan"]))).map((p) => p.id);
  const kegiatan = (await db.select().from(s.kegiatan).where(isNotNull(s.kegiatan.penanggungJawabId))).filter((k) => !terkunci.includes(periodeDari(k.tanggal)));

  try {
    await db.transaction(async (tx) => {
      let total = 0;
      for (const k of kegiatan) {
        const sebelum = await tx.select({ id: s.item.id, data: s.item.data }).from(s.item).where(eq(s.item.kegiatanId, k.id));
        const n = await buatItemOtomatis(tx as unknown as Db, [k], k.dibuatOleh);
        const tanpaKe = sebelum.filter((i) => !i.data.ke).map((i) => i.id);
        const diberiNomor = tanpaKe.length
          ? (await tx.select({ data: s.item.data }).from(s.item).where(inArray(s.item.id, tanpaKe))).filter((i) => i.data.ke).length
          : 0;
        if (n || diberiNomor) console.log(`${k.tanggal} · ${k.nama}: +${n} item${diberiNomor ? `, ${diberiNomor} pengingat lama diberi nomor` : ""}`);
        total += n;
      }
      console.log(`\n${kegiatan.length} kegiatan diperiksa, ${total} item dibuat.`);
      if (!a.tulis) throw BATAL;
    });
    if (a.tulis) console.log("Tersimpan.");
  } catch (e) {
    if (e !== BATAL) throw e;
    console.log("Uji coba: tidak ada yang ditulis. Jalankan dengan --tulis untuk menyimpan.");
  } finally {
    await tutup();
  }
}

main();
