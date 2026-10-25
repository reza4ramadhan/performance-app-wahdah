import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { ExternalLink, Lightbulb } from "lucide-react";
import { PeriksaK4 } from "@/components/app/putusan-k4";
import { Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { wajibSesi } from "@/lib/sesi";
import { labelPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Periksa K4" };

export default function HalamanPeriksaK4() {
  return (
    <>
      <Kepala judul="Periksa inovasi K4" kembali="/tim" sub="Pastikan inovasi benar berjalan dan buktinya bisa dibuka, lalu teruskan ke WaKa untuk penetapan tingkat." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  // Pengajuan untuk amanah binaan amanah aktif (atasan = penilai K3 amanah itu). Pengajuan lama tanpa amanah:
  // dari pegawai yang punya penugasan dengan koordinator = saya.
  const pnTim = sesi.tim.filter((b) => b.pegawaiId !== sesi.pegawaiId).map((b) => b.id);
  const stafLama = [...new Set(sesi.tim.filter((b) => b.koordinatorId === sesi.pegawaiId && b.pegawaiId !== sesi.pegawaiId).map((b) => b.pegawaiId))];
  const daftar = pnTim.length
    ? await db
        .select({ k: s.k4Pengajuan, nama: s.pegawai.nama })
        .from(s.k4Pengajuan)
        .innerJoin(s.pegawai, eq(s.pegawai.id, s.k4Pengajuan.diajukanOleh))
        .where(
          and(
            eq(s.k4Pengajuan.status, "diajukan"),
            or(inArray(s.k4Pengajuan.penugasanId, pnTim), stafLama.length ? and(isNull(s.k4Pengajuan.penugasanId), inArray(s.k4Pengajuan.diajukanOleh, stafLama)) : undefined),
          ),
        )
    : [];
  if (!daftar.length) return <Kosong ikon={Lightbulb} judul="Tidak ada pengajuan yang menunggu" />;
  return (
    <div className="space-y-3">
      {daftar.map(({ k, nama }) => (
        <Kartu key={k.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-heading">{k.judul}</p>
              <p className="text-xs text-muted-foreground">
                {nama} · {labelPeriode(k.periodeId)} · usul tingkat {k.tingkatUsulan}
              </p>
            </div>
            <Lencana nada="gold">Menunggu</Lencana>
          </div>
          {k.uraian && <p className="mt-2 text-sm">{k.uraian}</p>}
          <a href={k.linkBukti} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary">
            Buka bukti <ExternalLink className="size-3.5" />
          </a>
          <PeriksaK4 id={k.id} />
        </Kartu>
      ))}
    </div>
  );
}
