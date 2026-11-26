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
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { bebanPekanIni, unitKoordinator } from "@/lib/data/tim-koordinator";
import { petaBidang } from "@/lib/data/unit";
import { angka, labelDurasi } from "@/lib/format";
import { plotBerlaku } from "@/lib/plot";
import { unitPendek } from "@/lib/tugas-saya";
import { wajibSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { labelPeriode, labelTanggal } from "@/lib/waktu";

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
  // Hanya staf binaan saya.
  const t = k.staf.find((x) => x.pegawaiId === pegawaiId);
  if (!t) notFound();
  const item = barisAntrean(t.itemMenunggu, sesi, k.libur);
  const p = pitaK1(t.k1, k.acuan);
  const db = await getDb();
  const unitSaya = unitKoordinator(sesi).map((u) => u.unitId);
  const [beban, plot, jurnal, unitLain] = await Promise.all([
    bebanPekanIni([pegawaiId], sesi.kantor),
    unitSaya.length ? db.select().from(s.plotSkuo).where(and(inArray(s.plotSkuo.unitId, unitSaya), eq(s.plotSkuo.pegawaiId, pegawaiId))) : Promise.resolve([]),
    db.select().from(s.jurnal).where(eq(s.jurnal.pegawaiId, pegawaiId)).orderBy(desc(s.jurnal.tanggal), desc(s.jurnal.dibuatPada)).limit(5),
    db
      .select({ nama: s.unit.nama, unitId: s.unit.id })
      .from(s.penugasan)
      .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
      .where(and(eq(s.penugasan.pegawaiId, pegawaiId), inArray(s.penugasan.peranKerja, ["SBK", "SK"]), kondisiPenugasanBerlaku(k.periode))),
  ]);
  const bidang = await petaBidang(db);
  const lain = [...new Set(unitLain.filter((u) => !unitSaya.includes(bidang.get(u.unitId) ?? u.unitId)).map((u) => unitPendek(u.nama).split(" ")[0]))];
  const berlaku = plotBerlaku(plot, k.hariIni);
  const namaSkuo = berlaku.length ? new Map((await db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.id, berlaku.map((x) => x.skuoId)))).map((u) => [u.id, u.nama])) : new Map<string, string>();
  const b = beban.get(pegawaiId);

  return (
    <>
      <Link href="/?segmen=tim" className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-primary">
        <ChevronLeft className="size-4" /> Tim
      </Link>
      <header className="mt-1 mb-5 flex items-center gap-3.5">
        <Avatar nama={t.nama} ukuran="lg" />
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-bold tracking-tight text-heading">{t.nama}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {t.unit.join(", ")}
            {lain.length ? ` · juga di ${lain.join(", ")}` : ""}
          </p>
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

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-xl font-bold tabular-nums">{b?.n ?? 0}</p>
            <p className="text-xs text-muted-foreground">Tugas pekan ini (semua unit)</p>
          </div>
          <div className="rounded-xl bg-flame-500/10 px-3 py-2.5 text-flame-700 dark:text-flame-100">
            <p className="text-xl font-bold tabular-nums">{t.lewat}</p>
            <p className="text-xs">Terlambat</p>
          </div>
        </div>

        <section>
          <JudulBagian aksi={<TautanKecil href="/tim/plot">Ubah</TautanKecil>}>Departemen</JudulBagian>
          {berlaku.length ? (
            <div className="flex flex-wrap gap-1.5">
              {berlaku.map((x) => (
                <span key={x.skuoId} className={cn("inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs", x.utama ? "bg-primary/12 font-semibold text-brand-700 dark:text-brand-200" : "bg-muted")}>
                  {x.utama && <Star className="size-3 fill-current" aria-hidden />}
                  {namaSkuo.get(x.skuoId) ?? "—"}
                  {!x.utama && berlaku.length > 0 && " (cadangan)"}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum diplot ke departemen.</p>
          )}
        </section>

        {t.menunggu > 0 && (
          <section>
            <JudulBagian aksi={<TautanKecil href="/tim/verifikasi">Buka Verifikasi</TautanKecil>}>Perlu persetujuan · {t.menunggu}</JudulBagian>
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
          <JudulBagian aksi={<TautanKecil href={`/tim/jurnal?pegawai=${t.pegawaiId}`}>Semua</TautanKecil>}>Jurnal terbaru</JudulBagian>
          {jurnal.length ? (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card text-[13.5px]">
              {jurnal.map((j) => (
                <li key={j.id} className="flex justify-between gap-3 border-b border-border/60 px-3.5 py-2.5 last:border-0">
                  <span className="min-w-0">{j.uraian}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {labelTanggal(j.tanggal)}
                    {j.durasiMenit ? ` · ${labelDurasi(j.durasiMenit)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada jurnal.</p>
          )}
        </section>

        <Link href={`/tim/catatan?pegawai=${t.pegawaiId}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary text-[14.5px] font-semibold text-primary">
          <MessageSquareText className="size-4" aria-hidden /> Tulis catatan perilaku
        </Link>

        <section>
          <JudulBagian>Rincian K1</JudulBagian>
          <Kartu>{t.indikator.length ? <DaftarIndikator indikator={t.indikator} ringkas /> : <p className="text-sm text-muted-foreground">Belum ada indikator yang bisa dihitung bulan ini.</p>}</Kartu>
        </section>

        <Kartu className="p-2">
          <BarisTautan href={`/tim/jurnal?pegawai=${t.pegawaiId}`} ikon={BookOpen} nada="netral" judul="Jurnal" />
          <BarisTautan href={`/tim/k3/${t.pegawaiId}`} ikon={Star} nada="netral" judul="Penilaian K3" />
          <BarisTautan href={`/tim/catatan?pegawai=${t.pegawaiId}`} ikon={MessageSquareText} nada="netral" judul="Catatan perilaku" />
          <BarisTautan href={`/rapor/${k.periode}/${t.pegawaiId}`} ikon={ScrollText} nada="netral" judul="Rapor" />
        </Kartu>
      </div>
    </>
  );
}
