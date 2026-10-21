// Pembatas percobaan login (plan.md Bagian 10). Better Auth hanya membatasi permintaan HTTP ke
// handlernya, sedangkan login di sini lewat Server Action, jadi batasnya dicatat sendiri di tabel rate_limit.

import "server-only";
import { eq } from "drizzle-orm";
import { schema as s, type Db } from "./db";

const JENDELA_MS = 15 * 60_000;
export const MAKS_PER_AKUN = 5;
export const MAKS_PER_IP = 30;

async function baca(db: Db, key: string) {
  const [r] = await db.select().from(s.rateLimit).where(eq(s.rateLimit.key, key));
  if (!r || Date.now() - r.lastRequest > JENDELA_MS) return 0;
  return r.count;
}

export async function terkunci(db: Db, akun: string, ip: string) {
  const [a, b] = await Promise.all([baca(db, `login:${akun}`), baca(db, `login-ip:${ip}`)]);
  return a >= MAKS_PER_AKUN || b >= MAKS_PER_IP;
}

export async function catatGagal(db: Db, akun: string, ip: string) {
  for (const key of [`login:${akun}`, `login-ip:${ip}`]) {
    const n = (await baca(db, key)) + 1;
    await db
      .insert(s.rateLimit)
      .values({ id: key, key, count: n, lastRequest: Date.now() })
      .onConflictDoUpdate({ target: s.rateLimit.key, set: { count: n, lastRequest: Date.now() } });
  }
}

export async function bersihkan(db: Db, akun: string) {
  await db.delete(s.rateLimit).where(eq(s.rateLimit.key, `login:${akun}`));
}
