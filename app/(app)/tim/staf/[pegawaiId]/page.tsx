import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, MessageSquareText, ScrollText, Star } from "lucide-react";
import { KartuItem } from "@/components/app/baris-item";
import { DaftarIndikator } from "@/components/app/rincian-ikp";
import { KartuTugas } from "@/components/app/tugas";
import { Avatar, BarisTautan, JudulBagian, Kartu, Kerangka, Kosong, TautanKecil } from "@/components/app/ui";
import { VerifikasiMassal } from "@/components/app/verifikasi-massal";
import { barisAntrean } from "@/lib/data/antrean";
import { kontrolStaf, pitaK1 } from "@/lib/data/kontrol-staf";
import { angka } from "@/lib/format";
import { wajibSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { labelPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Staf" };

export default function HalamanStaf(props: PageProps<"/tim/staf/[pegawaiId]">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi params={props.params} />
    </Suspense>
  );
}

const WARNA_ISI = { baik: "bg-mint-500", sedang: "bg-gold-500", rendah: "bg-flame-500", kosong: "bg-muted" } as const;
const MAKS_LEWAT = 5;

async function Isi({ params }: { params: Promise<{ pegawaiId: string }> }) {
  const { pegawaiId } = await params;
  const sesi = await wajibSesi();
  const k = await kontrolStaf(sesi);
  // Hanya SBK binaan amanah aktif.
  const t = k.staf.find((x) => x.pegawaiId === pegawaiId);
  if (!t) notFound();
  const item = barisAntrean(t.itemMenunggu, sesi, k.libur);
  const p = pitaK1(t.k1, k.acuan);

  return (
    <>
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-primary">
        <ChevronLeft className="size-4" /> Beranda
      </Link>
      <header className="mt-1 mb-5 flex items-center gap-3.5">
        <Avatar nama={t.nama} ukuran="lg" />
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-bold tracking-tight text-heading">{t.nama}</h1>
          <p className="truncate text-sm text-muted-foreground">{t.unit.join(", ")}</p>
        </div>
      </header>

      <div className="space-y-6 lg:max-w-2xl">
        <Kartu className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted-foreground">K1 {labelPeriode(k.periode)}</p>
            <div className="relative mt-2 h-2.5 rounded-full bg-muted">
              <div className={cn("h-full rounded-full", WARNA_ISI[p])} style={{ width: `${Math.max(0, Math.min(100, t.k1 ?? 0))}%` }} />
              <span aria-hidden className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-heading/40" style={{ left: `${k.acuan}%` }} />
            </div>
          </div>
          <p className="text-4xl font-extrabold tracking-tight text-heading tabular-nums">{angka(t.k1)}</p>
        </Kartu>

        {t.menunggu > 0 && (
          <section>
            <JudulBagian aksi={<TautanKecil href="/tim/periksa">Periksa satu per satu</TautanKecil>}>Perlu persetujuan · {t.menunggu}</JudulBagian>
            <div className="space-y-2">
              {t.tugasMenunggu.map((x) => (
                <KartuTugas key={x.id} tugas={x} sebagai="pemberi" />
              ))}
              {item.length > 0 && <VerifikasiMassal items={item} sebaris tanpaPemilik />}
            </div>
          </section>
        )}

        {t.lewat > 0 && (
          <section>
            <JudulBagian>Telat · {t.lewat}</JudulBagian>
            <ul className="space-y-2">
              {t.tugasLewat.map((x) => (
                <li key={x.id}>
                  <KartuTugas tugas={x} sebagai="pemberi" />
                </li>
              ))}
              {t.itemLewat.slice(0, MAKS_LEWAT).map((i) => (
                <li key={i.id}>
                  <KartuItem item={i} />
                </li>
              ))}
            </ul>
            {t.itemLewat.length > MAKS_LEWAT && <p className="mt-1.5 text-xs text-muted-foreground">+{t.itemLewat.length - MAKS_LEWAT} item lain</p>}
          </section>
        )}

        {!t.menunggu && !t.lewat && (
          <Kosong judul="Tidak ada yang menunggu">Pekerjaan yang ditandai selesai atau lewat tenggat akan muncul di sini.</Kosong>
        )}

        <section>
          <JudulBagian>Rincian K1</JudulBagian>
          <Kartu>{t.indikator.length ? <DaftarIndikator indikator={t.indikator} ringkas /> : <p className="text-sm text-muted-foreground">Belum ada indikator yang bisa dihitung bulan ini.</p>}</Kartu>
        </section>

        <Kartu className="p-2">
          <BarisTautan href={`/tim/jurnal?pegawai=${t.pegawaiId}`} ikon={BookOpen} nada="netral" judul="Jurnal" />
          <BarisTautan href={`/tim/k3/${t.pegawaiId}`} ikon={Star} nada="netral" judul="Penilaian K3" />
          <BarisTautan href="/tim/catatan" ikon={MessageSquareText} nada="netral" judul="Catatan perilaku" />
          <BarisTautan href={`/rapor/${k.periode}/${t.pegawaiId}`} ikon={ScrollText} nada="netral" judul="Rapor" />
        </Kartu>
      </div>
    </>
  );
}
