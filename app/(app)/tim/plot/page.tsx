// Manage tim (docs/rombak-v2/04 butir 1.7, mockup Kor-5): plot setiap staf unit ke departemen (SKUO) yang ia
// layani, dengan PJ utama. PJ utama otomatis menerima checklist setiap kegiatan departemen itu.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq, gte, inArray } from "drizzle-orm";
import { Star, Users } from "lucide-react";
import { FormPlot } from "@/components/app/form-plot";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { stafBidang } from "@/lib/data/tim";
import { unitKoordinator } from "@/lib/data/tim-koordinator";
import { unitDalamBidang } from "@/lib/data/unit";
import { plotBerlaku } from "@/lib/plot";
import { wajibSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { hariIni, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Manage tim" };

export default function HalamanPlot() {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Manage tim" kembali="/?segmen=tim" />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </div>
  );
}

const pendek = (n: string) => n.split(" ").find((x) => x.length > 3 && !/^muh/i.test(x)) ?? n.split(" ")[0];

async function Isi() {
  const sesi = await wajibSesi();
  const unit = unitKoordinator(sesi);
  if (!unit.length) return <Kosong ikon={Users} judul="Khusus koordinator">Halaman ini untuk koordinator unit.</Kosong>;
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);

  const per = await Promise.all(
    unit.map(async (u) => {
      const ids = (await unitDalamBidang(db, u.unitId)).filter((x) => x !== u.unitId);
      const [departemen, staf, plot, kegiatan] = await Promise.all([
        ids.length ? db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.id, ids)).orderBy(s.unit.nama) : Promise.resolve([]),
        stafBidang(db, u.unitId, periode),
        db.select().from(s.plotSkuo).where(eq(s.plotSkuo.unitId, u.unitId)),
        db
          .select({ skuoId: s.kegiatan.skuoId, pj: s.kegiatan.penanggungJawabId })
          .from(s.kegiatan)
          .where(and(eq(s.kegiatan.unitId, u.unitId), gte(s.kegiatan.tanggal, today), inArray(s.kegiatan.status, ["rencana", "jalan", "geser"]))),
      ]);
      return { u, departemen, staf, plot: plotBerlaku(plot, today), kegiatan };
    }),
  );

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Plot staf ke departemen yang ia layani. <strong className="text-heading">PJ utama</strong> otomatis menerima checklist setiap kegiatan departemen itu.
      </p>
      {per.map(({ u, departemen, staf, plot, kegiatan }) => (
        <div key={u.unitId} className="space-y-4">
          {per.length > 1 && <h2 className="text-base font-bold text-heading">{u.unitNama}</h2>}
          <section className="space-y-2">
            <h3 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Departemen · {departemen.length}</h3>
            {departemen.length ? (
              departemen.map((d) => {
                const di = plot.filter((p) => p.skuoId === d.id);
                const utama = di.find((p) => p.utama)?.pegawaiId ?? (di.length === 1 ? di[0].pegawaiId : null);
                const tanpaPj = kegiatan.filter((k) => k.skuoId === d.id && !k.pj).length;
                const namaDari = (id: string) => staf.find((t) => t.id === id)?.nama ?? "—";
                return (
                  <details key={d.id} className={cn("rounded-2xl border bg-card", di.length ? "border-border" : "border-flame-500/35")} open={!di.length}>
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3.5 py-3">
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-[14.5px] font-semibold text-heading">{d.nama}</span>
                        {di.length ? (
                          <span className="flex flex-wrap gap-1.5">
                            {[...di]
                              .sort((a, b) => Number(b.pegawaiId === utama) - Number(a.pegawaiId === utama))
                              .map((p) => (
                                <span key={p.pegawaiId} className={cn("inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-xs", p.pegawaiId === utama ? "bg-primary/12 font-semibold text-brand-700 dark:text-brand-200" : "bg-muted")}>
                                  {p.pegawaiId === utama && <Star className="size-3 fill-current" aria-hidden />}
                                  {pendek(namaDari(p.pegawaiId))}
                                  {p.pegawaiId === utama && " · PJ utama"}
                                </span>
                              ))}
                          </span>
                        ) : (
                          <span className="text-[12.5px] font-semibold text-flame-600 dark:text-flame-100">Belum ada staf{tanpaPj ? ` · ${tanpaPj} kegiatan tanpa PJ` : ""}</span>
                        )}
                      </span>
                      <span className={cn("shrink-0 text-[13px] font-semibold", di.length ? "text-primary" : "rounded-xl bg-primary px-3 py-2 text-primary-foreground")}>{di.length ? "Ubah" : "Plot"}</span>
                    </summary>
                    <div className="border-t border-border px-3.5 py-3">
                      {staf.length ? (
                        <FormPlot unitId={u.unitId} skuoId={d.id} staf={staf.map((t) => ({ id: t.id, nama: t.nama }))} awal={di.map((p) => p.pegawaiId)} utamaAwal={utama} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Belum ada staf di unit ini.</p>
                      )}
                    </div>
                  </details>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">Unit ini belum punya departemen. Departemen (SKUO) ditambahkan Admin di menu Unit.</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Anggota unit (sesuai SK)</h3>
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {staf.map((t) => (
                <li key={t.id} className="border-b border-border/60 last:border-0">
                  <Link href={`/tim/staf/${t.id}`} className="flex min-h-11 items-center justify-between gap-2 px-3.5 text-[13.5px]">
                    <span>{t.nama}</span>
                    <span className="text-muted-foreground">{plot.filter((p) => p.pegawaiId === t.id).length} departemen</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">Anggota unit diatur Admin sesuai SK. Perubahan plot di tengah bulan hanya memindahkan kegiatan yang belum berjalan, dan tercatat di riwayat.</p>
          </section>
        </div>
      ))}
    </div>
  );
}
