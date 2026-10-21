// Konfigurasi Better Auth tanpa "server-only" (dipakai aplikasi dan skrip seed/impor).
// plan.md Bagian 10: login No. HP atau NIP + password, sesi 30 hari, wajib ganti password awal.
// Pendaftaran publik dimatikan; akun dibuat Admin.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import type { Db } from "./db/koneksi";
import * as schema from "./db/schema";

export function buatAuth(db: Db) {
  return betterAuth({
    appName: "IKP Pegawai WI",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, rateLimit: schema.rateLimit },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    user: {
      additionalFields: {
        pegawaiId: { type: "string", required: false, input: false },
        harusGantiPassword: { type: "boolean", required: false, defaultValue: true, input: false },
      },
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 40 }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof buatAuth>;

/** Email internal: Better Auth mewajibkan email, tetapi login memakai NIP / No. HP. */
export const emailInternal = (username: string) => `${username.replace(/[^a-zA-Z0-9._-]/g, "")}@ikp.wahdah.local`;

/** Buat akun login untuk pegawai. Username = NIP, atau No. HP bila NIP kosong. */
export async function buatAkun(auth: Auth, p: { pegawaiId: string; nama: string; username: string; password: string; harusGanti?: boolean }) {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({
    name: p.nama,
    email: emailInternal(p.username),
    username: p.username.toLowerCase(),
    displayUsername: p.username,
    pegawaiId: p.pegawaiId,
    harusGantiPassword: p.harusGanti ?? true,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: await ctx.password.hash(p.password) });
  return user;
}

/** Reset password oleh Admin: password sementara, sesi lama dicabut, wajib ganti saat login. */
export async function resetPassword(auth: Auth, userId: string, passwordBaru: string) {
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(passwordBaru));
  await ctx.internalAdapter.updateUser(userId, { harusGantiPassword: true });
  await ctx.internalAdapter.deleteUserSessions(userId);
}
