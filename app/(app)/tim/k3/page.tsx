import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { ChevronRight, Star } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { Avatar, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { penugasanDinilai } from "@/lib/data/k3";
import { hitungK3 } from "@/lib/ikp/hitung";
import { angka, kelompokkan } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Penilaian K3" };

export default function HalamanK3(props: PageProps<"/tim/k3">) {
  return (
    <>
      <Kepala judul="Penilaian K3" kembali="/tim" sub="Satu penilaian per pegawai yang Anda koordinasikan, walau ia memegang beberapa amanah. Isi setelah bulan berakhir, paling lambat 5 hari kerja." />
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
  // Hanya binaan amanah aktif; amanah lain dinilai setelah Pindah Amanah.
  const tim = new Set(sesi.tim.map((b) => b.id));
  const pn = (await penugasanDinilai(db, periode)).filter((p) => p.penilaiId === sesi.pegawaiId && p.pegawaiId !== sesi.pegawaiId && tim.has(p.id));
  const nilai = pn.length ? await db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periode), eq(s.penilaianK3.penilaiId, sesi.pegawaiId))) : [];
  const daftar = [...kelompokkan(pn, (p) => p.pegawaiId)];
  const selesai = daftar.filter(([id]) => nilai.some((n) => n.pegawaiId === id && n.status === "dikirim")).length;

  return (
    <>
      <ChipFilter pilihan={[lalu, kini].map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/tim/k3?periode=${v}`} />
      {daftar.length ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {selesai} dari {daftar.length} penilaian sudah dikirim.
          </p>
          <ul className="space-y-2">
            {daftar.map(([pegawaiId, amanah]) => {
              const n = nilai.find((x) => x.pegawaiId === pegawaiId);
              return (
                <li key={pegawaiId}>
                  <Link href={`/tim/k3/${pegawaiId}?periode=${periode}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition hover:border-primary/30">
                    <Avatar nama={amanah[0].nama} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-heading">{amanah[0].nama}</span>
                      <span className="block truncate text-xs text-muted-foreground">{amanah.map((p) => `${p.peranKerja} · ${p.unitNama}`).join(" / ")}</span>
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
