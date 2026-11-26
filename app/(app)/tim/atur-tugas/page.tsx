// Atur Tugas Staf (docs/rombak-v2/05 KR-5): set tugas per staf per pekan. Susunan pekan lalu otomatis berlanjut;
// ubah hanya staf yang dirotasi. Pekan ini: berlaku mulai besok.

import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { PilihSetStaf } from "@/components/app/set-tugas";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { koordinatorAtauWakil } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { stafRutin } from "@/lib/data/set-tugas";
import { unitRutin } from "@/lib/data/tim-rutin";
import { seninDari, setBerlaku } from "@/lib/set-tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelTanggal, periodeDari, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Atur Tugas Staf" };

export default function HalamanAturTugas(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Atur Tugas Staf" kembali="/?segmen=tim" />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const unit = unitRutin(sesi);
  if (!unit.length) return <Kosong ikon={CalendarDays} judul="Khusus koordinator unit tugas rutin" />;
  const pekan: "ini" | "depan" = sp.pekan === "ini" ? "ini" : "depan";
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const senin = tambahHari(seninDari(today), pekan === "ini" ? 0 : 7);
  const unitIds = unit.map((u) => u.unitId);
  const [staf, set] = await Promise.all([
    stafRutin(db, unitIds, periodeDari(today)),
    db.select({ id: s.setTugas.id, nama: s.setTugas.nama, unitId: s.setTugas.unitId }).from(s.setTugas).where(and(inArray(s.setTugas.unitId, unitIds), eq(s.setTugas.aktif, true))).orderBy(s.setTugas.nama),
  ]);
  const milik = staf.filter((x) => koordinatorAtauWakil(sesi, x.koordinatorId) && x.pegawaiId !== sesi.pegawaiId);
  const pasang = milik.length ? await db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, milik.map((x) => x.penugasanId))) : [];
  const nama = new Map(set.map((x) => [x.id, x.nama]));

  return (
    <div className="space-y-3">
      <ChipFilter
        pilihan={[
          { nilai: "ini", label: "Pekan ini" },
          { nilai: "depan", label: "Pekan depan" },
        ]}
        aktif={pekan}
        href={(v) => `/tim/atur-tugas?pekan=${v}`}
      />
      <p className="text-sm font-semibold text-heading">
        {labelTanggal(senin)} – {labelTanggal(tambahHari(senin, 6), true)}
      </p>
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
        Pengaturan pekan sebelumnya <strong className="text-heading">berlanjut otomatis</strong>. Ubah hanya staf yang dirotasi; tersimpan langsung{pekan === "ini" ? " dan berlaku mulai besok" : ""}.
      </p>
      {milik.length ? (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {milik.map((x) => {
            const p = pasang.filter((q) => q.penugasanId === x.penugasanId);
            const kini = setBerlaku(p, senin);
            const sebelum = setBerlaku(p, tambahHari(senin, -7));
            const berubah = kini !== sebelum;
            return (
              <li key={x.penugasanId} className="flex min-h-14 items-center gap-3 border-b border-border/60 px-3.5 py-2.5 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading">{x.nama}</span>
                  {berubah && <span className="block truncate text-xs text-gold-700 dark:text-gold-100">Berubah dari {sebelum ? nama.get(sebelum) : "tanpa set"}</span>}
                </span>
                <PilihSetStaf key={`${x.penugasanId}-${pekan}-${kini}`} penugasanId={x.penugasanId} set={set.filter((y) => y.unitId === x.unitId)} nilai={kini} pekan={pekan} berubah={berubah} />
              </li>
            );
          })}
        </ul>
      ) : (
        <Kosong ikon={CalendarDays} judul="Belum ada staf tugas rutin" />
      )}
      {!set.length && <p className="text-sm text-muted-foreground">Buat set tugas lebih dulu di menu Set Tugas.</p>}
    </div>
  );
}
