import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Kartu, Kepala, Kerangka, Lencana, type Nada } from "@/components/app/ui";
import { buatPeriode } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { LABEL_STATUS_PERIODE, type StatusPeriode } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Periode" };

const NADA: Record<StatusPeriode, Nada> = { berjalan: "brand", verifikasi: "gold", kalibrasi: "gold", sementara: "ink", disahkan: "mint" };

export default function HalamanPeriode() {
  return (
    <>
      <Kepala judul="Periode" kembali="/tim" sub="Satu bulan kalender. Periode baru dibuat otomatis oleh cron penutupan bulan; bisa juga dibuat manual. Perubahan status dilakukan di Rekap IKP." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const rows = await db.select().from(s.periode).orderBy(desc(s.periode.id));
  const berikut = periodeBerikut(periodeDari(hariIni(sesi.kantor)), 1);
  return (
    <Kartu>
      <ul className="divide-y divide-border">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <Link href={`/kantor/rekap?periode=${p.id}`} className="font-medium text-heading hover:underline">
              {labelPeriode(p.id)}
            </Link>
            <Lencana nada={NADA[p.status]}>{LABEL_STATUS_PERIODE[p.status]}</Lencana>
          </li>
        ))}
      </ul>
      {!rows.some((p) => p.id === berikut) && (
        <TombolAksi aksi={buatPeriode.bind(null, berikut)} className="mt-3 w-full">
          <Plus className="size-4" /> Buat periode {labelPeriode(berikut)}
        </TombolAksi>
      )}
    </Kartu>
  );
}
