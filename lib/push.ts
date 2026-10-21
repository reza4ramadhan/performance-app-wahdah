// Kirim web push (VAPID) ke semua perangkat seorang pegawai. Langganan kedaluwarsa dihapus.

import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { getDb, schema as s } from "./db";

let siap = false;
function konfigurasi() {
  if (siap) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@wahdah.or.id", pub, priv);
  siap = true;
  return true;
}

export type PesanPush = { title: string; body: string; url?: string; tag?: string };

/** Mengembalikan jumlah notifikasi yang terkirim. */
export async function kirimPush(pegawaiIds: string[], pesan: PesanPush) {
  if (!pegawaiIds.length || !konfigurasi()) return 0;
  const db = await getDb();
  const langganan = await db.select().from(s.pushSubscription).where(inArray(s.pushSubscription.pegawaiId, pegawaiIds));
  let terkirim = 0;
  await Promise.all(
    langganan.map(async (l) => {
      try {
        await webpush.sendNotification({ endpoint: l.endpoint, keys: l.keys }, JSON.stringify(pesan), { TTL: 60 * 60 * 6 });
        terkirim++;
      } catch (e) {
        const kode = (e as { statusCode?: number }).statusCode;
        if (kode === 404 || kode === 410) await db.delete(s.pushSubscription).where(eq(s.pushSubscription.id, l.id));
      }
    }),
  );
  return terkirim;
}
