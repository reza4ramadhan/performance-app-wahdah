// Ubah set tugas (docs/rombak-v2/05 KR-4): nama, daftar tugas (jam, frekuensi, link wajib), tambah/ubah/hapus.
// Perubahan berlaku mulai besok untuk semua staf pemakai set ini; tugas hari ini tidak berubah.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";
import { BarisItemSet, GantiHari, NamaSet, TambahItemSet, TombolDuplikat } from "@/components/app/set-tugas";
import { Kartu, Kepala, Kerangka } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { pemakaiSet } from "@/lib/data/set-tugas";
import { wajibSesi } from "@/lib/sesi";

export const metadata: Metadata = { title: "Ubah set tugas" };

export default function HalamanUbahSet(props: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Ubah set tugas" kembali="/tim/set-tugas" />
      <Suspense fallback={<Kerangka />}>
        <Isi params={props.params} />
      </Suspense>
    </div>
  );
}

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesi = await wajibSesi();
  const db = await getDb();
  const [set] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, id));
  if (!set || !(sesi.peran.has("admin") || sesi.penugasan.some((p) => p.peranKerja === "KSBK" && p.unitId === set.unitId))) notFound();
  const [item, pemakai] = await Promise.all([
    db.select().from(s.setTugasItem).where(and(eq(s.setTugasItem.setTugasId, id), eq(s.setTugasItem.aktif, true))).orderBy(asc(s.setTugasItem.jamTenggat), asc(s.setTugasItem.urutan)),
    pemakaiSet(db, id),
  ]);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-heading">Nama set tugas</span>
        <NamaSet id={id} nama={set.nama} />
      </label>
      <section className="space-y-2">
        <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Tugas dalam set ini · {item.length}</h2>
        {item.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {item.map((i) => (
              <BarisItemSet key={i.id} setId={id} item={i} />
            ))}
          </ul>
        )}
        <TambahItemSet setId={id} />
      </section>
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12.5px] text-muted-foreground">
        Perubahan berlaku mulai besok{pemakai.length ? ` untuk ${pemakai.length} staf yang memakai set tugas ini` : ""}. Tugas hari ini tidak berubah.
      </p>
      {sesi.peran.has("admin") && (
        <Kartu className="space-y-1">
          <h2 className="text-sm font-semibold text-heading">Tugas lewat tengah malam (Admin)</h2>
          <p className="text-xs text-muted-foreground">Untuk shift malam: tugas berjam lebih awal dari jam ini dijadwalkan pada hari berikutnya. Kosongkan bila semua tugas di hari yang sama.</p>
          <GantiHari id={id} jam={set.gantiHariJam} />
        </Kartu>
      )}
      <TombolDuplikat id={id} />
    </div>
  );
}
