"use server";

import { eq, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { COOKIE_AMANAH } from "@/lib/amanah";
import { getAuth } from "@/lib/auth";
import { bersihkan, catatGagal, terkunci } from "@/lib/batas-login";
import { getDb, schema as s } from "@/lib/db";
import { bacaSesi, wajibSesi } from "@/lib/sesi";

const bersihkanNomor = (x: string) => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0").toLowerCase();

/** Login dengan NIP atau No. HP + password. */
export async function masuk(_: HasilAksi | null, fd: FormData): Promise<HasilAksi | null> {
  const identitas = bersihkanNomor(String(fd.get("identitas") ?? ""));
  const password = String(fd.get("password") ?? "");
  if (!identitas || !password) return gagal("Isi NIP/No. HP dan password.");

  const db = await getDb();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "lokal";
  if (await terkunci(db, identitas, ip)) return gagal("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");

  // NIP atau No. HP → username akun.
  const [akun] = await db
    .select({ username: s.user.username })
    .from(s.pegawai)
    .innerJoin(s.user, eq(s.user.pegawaiId, s.pegawai.id))
    .where(or(eq(s.pegawai.nip, identitas), eq(s.pegawai.noHp, identitas), eq(s.user.username, identitas)));

  try {
    if (!akun?.username) throw new Error("Akun tidak ditemukan");
    await (await getAuth()).api.signInUsername({ body: { username: akun.username, password, rememberMe: true }, headers: h });
  } catch (e) {
    // Catat penyebab sebenarnya di log server (tanpa password) agar salah konfigurasi
    // (mis. BETTER_AUTH_URL tidak cocok) tidak tersamar sebagai "password salah".
    const err = e as { message?: string; status?: string; body?: { code?: string } };
    console.error(`[masuk] gagal untuk ${identitas}:`, err.body?.code ?? err.status ?? "", err.message ?? e);
    await catatGagal(db, identitas, ip);
    return gagal("NIP/No. HP atau password salah.");
  }
  await bersihkan(db, identitas);
  redirect("/");
}

const skemaGanti = z
  .object({
    lama: z.string().min(1, "Isi password saat ini."),
    baru: z.string().min(8, "Password baru minimal 8 karakter.").max(128),
    ulang: z.string(),
  })
  .refine((x) => x.baru === x.ulang, { path: ["ulang"], message: "Ulangi password baru dengan sama persis." })
  .refine((x) => x.baru !== x.lama, { path: ["baru"], message: "Password baru harus berbeda dari password lama." });

export async function gantiPassword(_: HasilAksi | null, fd: FormData): Promise<HasilAksi | null> {
  const sesi = await bacaSesi();
  if (!sesi) redirect("/masuk");
  const p = skemaGanti.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa kembali isian.", Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])));
  try {
    await (await getAuth()).api.changePassword({ body: { currentPassword: p.data.lama, newPassword: p.data.baru, revokeOtherSessions: true }, headers: await headers() });
  } catch {
    return gagal("Password saat ini salah.", { lama: "Password saat ini salah." });
  }
  const db = await getDb();
  await db.update(s.user).set({ harusGantiPassword: false }).where(eq(s.user.id, sesi.userId));
  // Klien menampilkan notifikasi lalu memanggil `keluar` agar pengguna masuk ulang dengan password baru.
  return berhasil("Password berhasil diganti.");
}

export async function keluar() {
  await (await getAuth()).api.signOut({ headers: await headers() });
  redirect("/masuk");
}

/** Pindah Amanah: pilih penugasan yang menjadi konteks menu dan halaman kerja. */
export async function pindahAmanah(penugasanId: string) {
  const sesi = await wajibSesi();
  if (!sesi.penugasan.some((p) => p.id === penugasanId)) redirect("/akun");
  (await cookies()).set(COOKIE_AMANAH, penugasanId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  redirect("/");
}
