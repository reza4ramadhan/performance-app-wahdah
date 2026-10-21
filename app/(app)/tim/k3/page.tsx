import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { ChevronRight, Star } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { Avatar, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { hitungK3 } from "@/lib/ikp/hitung";
import { angka } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Penilaian K3" };

export default function HalamanK3(props: PageProps<"/tim/k3">) {
  return (
    <>
      <Kepala judul="Penilaian K3" kembali="/tim" sub="Satu penilaian per penugasan yang Anda koordinasikan. Isi setelah bulan berakhir, paling lambat 5 hari kerja." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const lalu = periodeBerikut(kini, -1);
  const periode = sp.periode === kini ? kini : lalu;
  const db = await getDb();
  const pn = await db
    .select({ pn: s.penugasan, nama: s.pegawai.nama, unitNama: s.unit.nama })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(and(eq(s.penugasan.koordinatorId, sesi.pegawaiId), kondisiPenugasanBerlaku(periode)));
  const ids = pn.filter((p) => p.pn.pegawaiId !== sesi.pegawaiId && p.pn.peranKerja !== "KAKAN" && p.pn.peranKerja !== "WAKA").map((p) => p.pn.id);
  const nilai = ids.length
    ? await db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periode), inArray(s.penilaianK3.penugasanId, ids), eq(s.penilaianK3.penilaiId, sesi.pegawaiId)))
    : [];
  const daftar = pn.filter((p) => ids.includes(p.pn.id));
  const selesai = nilai.filter((n) => n.status === "dikirim").length;

  return (
    <>
      <ChipFilter pilihan={[lalu, kini].map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/tim/k3?periode=${v}`} />
      {daftar.length ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {selesai} dari {daftar.length} penilaian sudah dikirim.
          </p>
          <ul className="space-y-2">
            {daftar.map(({ pn: p, nama, unitNama }) => {
              const n = nilai.find((x) => x.penugasanId === p.id);
              return (
                <li key={p.id}>
                  <Link href={`/tim/k3/${p.id}?periode=${periode}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition hover:border-primary/30">
                    <Avatar nama={nama} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-heading">{nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.peranKerja} · {unitNama}
                      </span>
                    </span>
                    {n?.status === "dikirim" ? (
                      <Lencana nada="mint">{angka(hitungK3(n.skor, true).k3)}</Lencana>
                    ) : n?.status === "dikembalikan" ? (
                      <Lencana nada="flame">Dikembalikan</Lencana>
                    ) : n ? (
                      <Lencana nada="gold">Draf</Lencana>
                    ) : (
                      <Lencana>Belum</Lencana>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Kosong ikon={Star} judul="Tidak ada yang perlu dinilai" />
      )}
    </>
  );
}
