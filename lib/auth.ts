import "server-only";
import { buatAkun as buatAkun_, buatAuth, resetPassword as reset_, type Auth } from "./auth-config";
import { getDb } from "./db";

const global_ = globalThis as unknown as { __ikpAuth?: Promise<Auth> };

/** Instans Better Auth (satu per proses). */
export function getAuth(): Promise<Auth> {
  global_.__ikpAuth ??= getDb().then(buatAuth);
  return global_.__ikpAuth;
}

export async function buatAkun(p: Parameters<typeof buatAkun_>[1]) {
  return buatAkun_(await getAuth(), p);
}

export async function resetPassword(userId: string, passwordBaru: string) {
  return reset_(await getAuth(), userId, passwordBaru);
}
