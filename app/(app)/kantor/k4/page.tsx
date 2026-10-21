import type { Metadata } from "next";
import { Suspense } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { ExternalLink, Lightbulb } from "lucide-react";
import { TetapkanK4 } from "@/components/app/putusan-k4";
import { JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { punya } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";
import { labelPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Penetapan K4" };

export default function HalamanPenetapanK4() {
  return (
    <>
      <Kepala judul="Penetapan K4" kembali="/kantor" sub="Tetapkan tingkat dan poin inovasi yang sudah diperiksa atasan. Poin disahkan bersama IKP." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibPeran("waka", "kepala");
  const db = await getDb();
  const rows = await db
    .select({ k: s.k4Pengajuan, nama: s.pegawai.nama })
    .from(s.k4Pengajuan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.k4Pengajuan.diajukanOleh))
    .where(inArray(s.k4Pengajuan.status, ["diperiksa", "ditetapkan"]))
    .orderBy(desc(s.k4Pengajuan.dibuatPada));
  const ids = rows.map((r) => r.k.id);
  const pengusul = ids.length
    ? await db.select({ k4Id: s.k4Pengusul.k4Id, nama: s.pegawai.nama, id: s.pegawai.id }).from(s.k4Pengusul).innerJoin(s.pegawai, eq(s.pegawai.id, s.k4Pengusul.pegawaiId)).where(inArray(s.k4Pengusul.k4Id, ids))
    : [];
  const antre = rows.filter((r) => r.k.status === "diperiksa");
  const sudah = rows.filter((r) => r.k.status === "ditetapkan");
  const waka = punya(sesi, "waka");

  return (
    <div className="space-y-5">
      <section>
        <JudulBagian>Menunggu penetapan ({antre.length})</JudulBagian>
        {antre.length ? (
          <div className="space-y-3">
            {antre.map(({ k }) => {
              const orang = pengusul.filter((p) => p.k4Id === k.id);
              const milikSaya = orang.some((p) => p.id === sesi.pegawaiId);
              return (
                <Kartu key={k.id}>
                  <p className="text-[15px] font-semibold text-heading">{k.judul}</p>
                  <p className="text-xs text-muted-foreground">
                    {orang.map((p) => p.nama).join(", ")} · {labelPeriode(k.periodeId)} · usul tingkat {k.tingkatUsulan}
                    {k.inovasiIndukId && " · naik tingkat"}
                  </p>
                  {k.uraian && <p className="mt-2 text-sm">{k.uraian}</p>}
                  <a href={k.linkBukti} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary">
                    Buka bukti <ExternalLink className="size-3.5" />
                  </a>
                  {waka && !milikSaya ? <TetapkanK4 id={k.id} usulan={k.tingkatUsulan} /> : <p className="mt-2 text-xs text-muted-foreground">{milikSaya ? "Inovasi Anda sendiri — ditetapkan WaKa lain." : "Ditetapkan oleh WaKa."}</p>}
                </Kartu>
              );
            })}
          </div>
        ) : (
          <Kosong ikon={Lightbulb} judul="Tidak ada antrean" />
        )}
      </section>
      {sudah.length > 0 && (
        <section>
          <JudulBagian>Sudah ditetapkan, menunggu pengesahan</JudulBagian>
          <Kartu>
            <ul className="divide-y divide-border text-sm">
              {sudah.map(({ k }) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-heading">{k.judul}</span>
                    <span className="block text-xs text-muted-foreground">{pengusul.filter((p) => p.k4Id === k.id).map((p) => p.nama).join(", ")}</span>
                  </span>
                  <Lencana nada="brand">
                    {k.tingkatDitetapkan} · {k.poin} poin
                  </Lencana>
                </li>
              ))}
            </ul>
          </Kartu>
        </section>
      )}
    </div>
  );
}
