import "server-only";
import type { Db } from "./db";
import { schema } from "./db";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Catat perubahan pada item, penilaian, absensi, hasil IKP, dan data master (plan.md 10.1). */
export async function catatAudit(
  db: Db | Tx,
  e: { aktorId: string | null; aksi: string; entitas: string; entitasId?: string | null; sebelum?: unknown; sesudah?: unknown; alasan?: string | null },
) {
  await db.insert(schema.auditLog).values({
    aktorId: e.aktorId,
    aksi: e.aksi,
    entitas: e.entitas,
    entitasId: e.entitasId ?? null,
    sebelum: e.sebelum ?? null,
    sesudah: e.sesudah ?? null,
    alasan: e.alasan ?? null,
  });
}
