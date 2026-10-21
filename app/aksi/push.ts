"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { getDb, schema as s } from "@/lib/db";
import { kirimPush } from "@/lib/push";
import { wajibSesi } from "@/lib/sesi";

const skema = z.object({ endpoint: z.url(), keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }) });

export async function simpanLanggananPush(sub: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skema.safeParse(sub);
  if (!p.success) return gagal("Langganan notifikasi tidak valid.");
  const db = await getDb();
  await db
    .insert(s.pushSubscription)
    .values({ pegawaiId: sesi.pegawaiId, endpoint: p.data.endpoint, keys: p.data.keys })
    .onConflictDoUpdate({ target: s.pushSubscription.endpoint, set: { pegawaiId: sesi.pegawaiId, keys: p.data.keys } });
  const n = await kirimPush([sesi.pegawaiId], { title: "Notifikasi aktif", body: "Pengingat pukul 16.00 akan muncul di perangkat ini.", tag: "uji" });
  return berhasil(n ? "Notifikasi aktif. Cek notifikasi uji di perangkat Anda." : "Notifikasi tersimpan.");
}

export async function hapusLanggananPush(endpoint: string): Promise<HasilAksi> {
  await wajibSesi();
  const db = await getDb();
  await db.delete(s.pushSubscription).where(eq(s.pushSubscription.endpoint, endpoint));
  return berhasil("Notifikasi dimatikan untuk perangkat ini.");
}
