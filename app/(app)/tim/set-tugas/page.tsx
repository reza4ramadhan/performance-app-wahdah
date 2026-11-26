// Set Tugas (docs/rombak-v2/05 KR-3): daftar set tugas unit (seperti folder), buat baru, buka untuk mengubah.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { ChevronRight, Folder } from "lucide-react";
import { SetBaru } from "@/components/app/set-tugas";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { idKoordinator } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { stafRutin } from "@/lib/data/set-tugas";
import { unitRutin } from "@/lib/data/tim-rutin";
import { jumlahUsulanMenunggu } from "@/lib/data/tugas";
import { setBerlaku } from "@/lib/set-tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Set Tugas" };

export default function HalamanSetTugas() {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Set Tugas" kembali="/?segmen=tim" />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </div>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const unit = unitRutin(sesi);
  if (!unit.length) return <Kosong ikon={Folder} judul="Khusus koordinator unit tugas rutin">Set Tugas dipakai unit N–R.</Kosong>;
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const unitIds = unit.map((u) => u.unitId);
  const [set, item, staf, nUsulan] = await Promise.all([
    db.select().from(s.setTugas).where(and(inArray(s.setTugas.unitId, unitIds), eq(s.setTugas.aktif, true))).orderBy(s.setTugas.nama),
    db.select({ setTugasId: s.setTugasItem.setTugasId }).from(s.setTugasItem).where(eq(s.setTugasItem.aktif, true)),
    stafRutin(db, unitIds, periodeDari(today)),
    jumlahUsulanMenunggu(idKoordinator(sesi)),
  ]);
  const pasang = staf.length ? await db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, staf.map((x) => x.penugasanId))) : [];
  const pemakai = (setId: string) => staf.filter((x) => setBerlaku(pasang.filter((p) => p.penugasanId === x.penugasanId), today) === setId).length;

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Set tugas berisi kumpulan tugas rutin. Berikan ke staf lewat{" "}
        <Link href="/tim/atur-tugas" className="font-semibold text-primary">
          Atur Tugas Staf
        </Link>
        ; tugasnya muncul sendiri setiap hari.
      </p>
      {nUsulan > 0 && (
        <Link href="/tim/usulan" className="flex min-h-12 items-center justify-between rounded-2xl border border-gold-400/60 bg-gold-400/15 px-3.5 text-sm font-semibold text-heading">
          {nUsulan} usulan tugas dari staf <span className="text-primary">Tinjau ›</span>
        </Link>
      )}
      {unit.map((u) => (
        <section key={u.unitId} className="space-y-2">
          {unit.length > 1 && <h2 className="text-sm font-bold text-heading">{u.unitNama}</h2>}
          <ul className="space-y-2">
            {set
              .filter((x) => x.unitId === u.unitId)
              .map((x) => (
                <li key={x.id}>
                  <Link href={`/tim/set-tugas/${x.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
                    <Folder className="size-5 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-heading">{x.nama}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.filter((i) => i.setTugasId === x.id).length} tugas · dipakai {pemakai(x.id)} staf
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
          </ul>
          <SetBaru unitId={u.unitId} />
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Set tugas hanya berlaku di unit sendiri. Bisa diduplikasi untuk membuat versi baru tanpa mulai dari nol.</p>
    </div>
  );
}
