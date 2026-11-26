// Pratinjau tugas besok (docs/rombak-v2/03 butir 1.7, mockup Rtn-4).

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, gte, inArray, lt } from "drizzle-orm";
import { Folder } from "lucide-react";
import { Kepala, Kerangka } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { pastikanRutin } from "@/lib/data/set-tugas";
import { daftarTugas, kondisiTugasPenugasan } from "@/lib/data/tugas";
import { seninDari, setBerlaku } from "@/lib/set-tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, jamLokal, keUtc, labelTanggal, labelTanggalPanjang, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Tugas besok" };

export default function HalamanBesok() {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </div>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const besok = tambahHari(today, 1);
  const pnIds = sesi.penugasan.filter((p) => p.peranKerja === "SK" || p.peranKerja === "SBK").map((p) => p.id);
  await pastikanRutin(db, pnIds, sesi.kantor);
  const [tugas, pasang] = await Promise.all([
    daftarTugas(and(kondisiTugasPenugasan(pnIds), gte(s.tugasKhususJadwal.tenggat, keUtc(besok, sesi.kantor)), lt(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(besok, 1), sesi.kantor)))),
    pnIds.length ? db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, pnIds)) : Promise.resolve([]),
  ]);
  const setBesok = setBerlaku(pasang, besok);
  const seninDepan = tambahHari(seninDari(today), 7);
  const setDepan = setBerlaku(pasang, seninDepan);
  const ids = [setBesok, setDepan].filter((x): x is string => !!x);
  const nama = new Map((ids.length ? await db.select({ id: s.setTugas.id, nama: s.setTugas.nama }).from(s.setTugas).where(inArray(s.setTugas.id, ids)) : []).map((x) => [x.id, x.nama]));
  const rutin = tugas.filter((t) => t.setTugasItemId);
  const delegasi = tugas.filter((t) => !t.setTugasItemId);
  const jam = (d: Date) => jamLokal(d, sesi.kantor).replace(":", ".");

  return (
    <div className="space-y-4">
      <Kepala judul={`Besok · ${labelTanggalPanjang(besok).replace(/ \d{4}$/, "")}`} kembali="/" />
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Folder className="size-3.5" aria-hidden /> Set tugas
        </p>
        <p className="text-base font-bold text-heading">{setBesok ? nama.get(setBesok) : "Tidak ada set tugas"}</p>
        <p className="text-[12.5px] text-muted-foreground">{rutin.length} tugas rutin</p>
      </section>
      {rutin.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Rutin · {rutin.length} tugas</h2>
          <ol className="overflow-hidden rounded-2xl border border-border bg-card">
            {rutin.map((t) => (
              <li key={t.id} className="flex gap-3 border-b border-border/60 px-3.5 py-2.5 text-sm last:border-0">
                <span className="w-11 shrink-0 text-[12.5px] font-semibold text-muted-foreground tabular-nums">{jam(t.tenggat)}</span>
                <span>
                  {t.judul}
                  {t.linkWajib && <span className="block text-[11.5px] text-muted-foreground">Link bukti wajib</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {delegasi.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Delegasi</h2>
          {delegasi.map((t) => (
            <div key={t.id} className="flex justify-between gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm">
              <span>{t.judul}</span>
              <span className="text-[12.5px] text-muted-foreground">{jam(t.tenggat)}</span>
            </div>
          ))}
        </section>
      )}
      {setDepan && setDepan !== setBesok && (
        <p className="text-[12.5px] text-muted-foreground">
          Pekan depan ({labelTanggal(seninDepan)}–{labelTanggal(tambahHari(seninDepan, 6))}), set tugas: <strong className="text-heading">{nama.get(setDepan)}</strong>
        </p>
      )}
      <Link href="/tugas/usulan" className="flex min-h-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 text-sm font-semibold text-primary">
        Usulkan tugas rutin baru
      </Link>
    </div>
  );
}
