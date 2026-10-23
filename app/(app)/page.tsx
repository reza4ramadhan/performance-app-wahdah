import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, count, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { BookOpen, CalendarDays, CircleAlert, CircleCheck, ClipboardCheck, Clock3, Gauge, Hourglass, ListChecks, NotebookPen, Users } from "lucide-react";
import { KartuItem } from "@/components/app/baris-item";
import { FormJurnalCepat, FormPdCepat } from "@/components/app/form-harian";
import { KartuKegiatan } from "@/components/app/kegiatan-skuo";
import { TombolCatat } from "@/components/app/tombol-catat";
import { KartuTugas } from "@/components/app/tugas";
import { Avatar, BarisTautan, Cincin, JudulBagian, Kartu, Kerangka, Kosong, Lencana, PetakIkon, Statistik, TautanKecil } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { daftarItem, kondisiItemPenugasan } from "@/lib/data/item";
import { daftarTugas, kondisiTugasMenunggu, kondisiTugasPenugasan } from "@/lib/data/tugas";
import { angka, sapaan } from "@/lib/format";
import { pemikulKegiatan } from "@/lib/ikp/k1";
import { PARAMETER } from "@/lib/ikp/tipe";
import { pimpinan } from "@/lib/akses";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, jamLokal, keUtc, labelPeriode, labelTanggalPanjang, periodeDari, rentangPeriode, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Hari Ini" };

export default function HariIni(props: PageProps<"/">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const { awal } = rentangPeriode(periode);
  const pnIds = sesi.penugasan.map((p) => p.id);
  const awalHari = keUtc(today, sesi.kantor);
  const akhirHari = keUtc(tambahHari(today, 1), sesi.kantor);
  // SBK: dashboard berisi Kegiatan SKUO, Tugas Khusus, dan Jurnal. Staf Khusus: Tugas Khusus dan Jurnal.
  const pnSbk = sesi.penugasan.filter((p) => p.peranKerja === "SBK");
  const pnTugas = sesi.penugasan.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK").map((p) => p.id);
  const bidangSbk = [...new Set(pnSbk.map((p) => p.bidangId ?? p.unitId))];

  const [perStatus, terbuka, isiHariIni, jurnalHariIni, jurnalBulanIni, pdBulanIni, kegiatanSaya, tugas, tim, tugasMenunggu] = await Promise.all([
    db
      .select({ status: s.item.status, n: count() })
      .from(s.item)
      .where(and(eq(s.item.periodeId, periode), inArray(s.item.penugasanId, pnIds.length ? pnIds : ["-"])))
      .groupBy(s.item.status),
    // Item kegiatan tampil di kartu kegiatan; di sini sisanya (surat, arsip tanpa kegiatan, laporan bidang).
    daftarItem(and(kondisiItemPenugasan(pnIds, ["terbuka", "ditolak"]), pnSbk.length ? isNull(s.item.kegiatanId) : undefined), { kantor: sesi.kantor, batas: 30 }),
    db
      .select({ n: count() })
      .from(s.item)
      .where(and(inArray(s.item.penugasanId, pnIds.length ? pnIds : ["-"]), gte(s.item.dibuatPada, awalHari), lte(s.item.dibuatPada, akhirHari))),
    db.select().from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), eq(s.jurnal.tanggal, today))),
    db.select({ n: count() }).from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, awal))),
    db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId), gte(s.pengembanganDiri.tanggal, awal))),
    pnSbk.length
      ? db
          .select({ k: s.kegiatan, skuoNama: s.unit.nama })
          .from(s.kegiatan)
          .leftJoin(s.unit, eq(s.unit.id, s.kegiatan.skuoId))
          .where(and(eq(s.kegiatan.penanggungJawabId, sesi.pegawaiId), inArray(s.kegiatan.unitId, bidangSbk), gte(s.kegiatan.tanggal, tambahHari(today, -30)), lte(s.kegiatan.tanggal, tambahHari(today, 45))))
          .orderBy(asc(s.kegiatan.tanggal))
      : Promise.resolve([]),
    pnTugas.length
      ? daftarTugas(and(kondisiTugasPenugasan(pnTugas, ["belum", "dikerjakan", "ditolak", "diajukan"]), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 8), sesi.kantor))), 8)
      : Promise.resolve([]),
    sesi.peran.has("koordinator")
      ? db
          .select({ n: count() })
          .from(s.item)
          .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
          .where(and(eq(s.penugasan.koordinatorId, sesi.pegawaiId), eq(s.item.status, "diajukan"), ne(s.item.indikatorKode, "KSBK-3")))
      : Promise.resolve(null),
    sesi.peran.has("koordinator")
      ? db.select({ n: count() }).from(s.tugasKhususJadwal).innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId)).where(kondisiTugasMenunggu(sesi.pegawaiId))
      : Promise.resolve(null),
  ]);

  // Kartu kegiatan: yang akan datang, atau yang sudah lewat tetapi masih punya pekerjaan terbuka (SPB, arsip).
  const itemKeg = kegiatanSaya.length
    ? await daftarItem(and(inArray(s.item.kegiatanId, kegiatanSaya.map((x) => x.k.id)), inArray(s.item.penugasanId, pnSbk.map((p) => p.id))), { kantor: sesi.kantor, batas: 500 })
    : [];
  const terbukaKeg = itemKeg.filter((i) => i.status === "terbuka" || i.status === "ditolak");
  const kartuKegiatan = kegiatanSaya
    .filter(({ k }) => k.tanggal >= tambahHari(today, -7) || terbukaKeg.some((i) => i.kegiatanId === k.id))
    .map(({ k, skuoNama }) => ({
      kegiatan: {
        id: k.id,
        nama: k.nama,
        tanggal: k.tanggal,
        skuoNama,
        perluSpp: k.perluSpp,
        perluSpb: k.perluSpb,
        penugasanId: pemikulKegiatan(pnSbk.filter((p) => (p.bidangId ?? p.unitId) === k.unitId), k)?.id ?? pnSbk[0].id,
      },
      items: itemKeg.filter((i) => i.kegiatanId === k.id),
    }));

  const n = (st: string) => perStatus.find((x) => x.status === st)?.n ?? 0;
  const total = perStatus.reduce((a, x) => a + x.n, 0);
  const selesai = n("diajukan") + n("disetujui");
  const lewat = [...terbuka, ...terbukaKeg].filter((i) => i.lewat).length;
  const sudahIsi = isiHariIni[0].n > 0 || jurnalHariIni.length > 0;
  const poinJurnal = Math.min(PARAMETER.tambahan.maks, jurnalBulanIni[0].n * PARAMETER.tambahan.poin);
  const menungguTim = (tim?.[0].n ?? 0) + (tugasMenunggu?.[0].n ?? 0);
  const jam = Number(jamLokal(new Date(), sesi.kantor).slice(0, 2));
  const namaPanggil = sesi.nama.replace(/^(Ust\.|Ustadz|Ustadzah)\s+/i, "").split(" ")[0];

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{sapaan(jam)},</p>
          <h1 className="text-2xl font-bold tracking-tight text-heading">{namaPanggil}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{labelTanggalPanjang(today)}</p>
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" className="ring-2 ring-card shadow-sm" />
        </Link>
      </header>

      {sp.password === "diganti" && <p className="mb-4 rounded-xl bg-mint-500/12 px-4 py-3 text-sm font-medium text-mint-700 dark:text-mint-100">Password berhasil diganti.</p>}
      {sp.akses === "ditolak" && <p className="mb-4 rounded-xl bg-flame-500/10 px-4 py-3 text-sm font-medium text-flame-700 dark:text-flame-100">Halaman itu tidak tersedia untuk peran Anda.</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5">
          {/* Progres bulan ini */}
          <Link href="/progres" className="block">
            <Kartu className="flex items-center gap-4 p-5">
              <Cincin nilai={total ? (selesai / total) * 100 : null} label={`${selesai} dari ${total} item selesai`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelPeriode(periode)}</p>
                <p className="mt-0.5 text-base font-bold text-heading">
                  {selesai} dari {total} item selesai
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  {sudahIsi ? (
                    <>
                      <CircleCheck className="size-4 text-mint-500" /> <span className="text-muted-foreground">Sudah mengisi hari ini</span>
                    </>
                  ) : (
                    <>
                      <Clock3 className="size-4 text-gold-500" /> <span className="text-muted-foreground">Belum ada isian hari ini</span>
                    </>
                  )}
                </p>
              </div>
            </Kartu>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Statistik ikon={ListChecks} nada="brand" label="Terbuka" nilai={n("terbuka")} href="/item?status=terbuka" />
            <Statistik ikon={Hourglass} nada="gold" label="Menunggu" nilai={n("diajukan")} href="/item?status=diajukan" />
            <Statistik ikon={CircleCheck} nada="mint" label="Disetujui" nilai={n("disetujui")} href="/item?status=disetujui" />
            <Statistik ikon={CircleAlert} nada="flame" label={lewat ? "Lewat tenggat" : "Ditolak"} nilai={lewat || n("ditolak")} href={lewat ? "/item?status=terbuka" : "/item?status=ditolak"} />
          </div>

          {/* Aksi cepat */}
          <section aria-label="Aksi cepat">
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/item", label: "Item", ikon: ListChecks, nada: "brand" as const },
                { href: "/jurnal", label: "Jurnal", ikon: NotebookPen, nada: "gold" as const },
                { href: "/pengembangan-diri", label: "Belajar", ikon: BookOpen, nada: "mint" as const },
                pnTugas.length ? { href: "/tugas", label: "Tugas", ikon: ClipboardCheck, nada: "ink" as const } : { href: "/progres", label: "Progres", ikon: Gauge, nada: "ink" as const },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 text-xs font-medium text-foreground transition active:scale-95">
                  <PetakIkon ikon={a.ikon} nada={a.nada} besar />
                  {a.label}
                </Link>
              ))}
            </div>
          </section>

          {/* 1. Kegiatan SKUO */}
          {pnSbk.length > 0 && (
            <section>
              <JudulBagian aksi={<TautanKecil href="/item">Semua item</TautanKecil>}>Kegiatan SKUO</JudulBagian>
              {kartuKegiatan.length ? (
                <ul className="space-y-3">
                  {kartuKegiatan.map((x) => (
                    <li key={x.kegiatan.id}>
                      <KartuKegiatan kegiatan={x.kegiatan} items={x.items} hariIni={today} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Kosong ikon={CalendarDays} judul="Belum ada kegiatan SKUO untuk Anda">
                  Kegiatan muncul setelah KSBK menginputnya dan menunjuk Anda sebagai penanggung jawab. Pengingat, SPP, dan SPB otomatis masuk ke sini.
                </Kosong>
              )}
            </section>
          )}

          {/* 2. Tugas khusus */}
          {pnTugas.length > 0 && (
            <section>
              <JudulBagian aksi={<TautanKecil href="/tugas">Lihat semua</TautanKecil>}>Tugas khusus</JudulBagian>
              {tugas.length ? (
                <ul className="space-y-2">
                  {tugas.map((t) => (
                    <li key={t.id}>
                      <KartuTugas tugas={t} sebagai="staf" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">Tidak ada tugas khusus dengan tenggat dalam sepekan.</p>
              )}
            </section>
          )}

          {/* 3. Jurnal hari ini */}
          <section>
            <JudulBagian aksi={<TautanKecil href="/jurnal">Semua jurnal</TautanKecil>}>Jurnal hari ini</JudulBagian>
            <Kartu>
              <p className="text-xs text-muted-foreground">
                Pekerjaan di luar indikator · {jurnalBulanIni[0].n} entri bulan ini
                {pnTugas.length > 0 && <> · +{angka(poinJurnal)} poin K1 (maks. {PARAMETER.tambahan.maks})</>}
              </p>
              {jurnalHariIni.map((j) => (
                <p key={j.id} className="border-b border-border/60 py-2 text-sm last:border-0">
                  {j.uraian}
                  {j.pemberiTugas && <span className="text-muted-foreground"> · {j.pemberiTugas}</span>}
                </p>
              ))}
              <FormJurnalCepat tanggal={today} />
            </Kartu>
          </section>

          {/* Item lain yang masih terbuka */}
          {(terbuka.length > 0 || !pnSbk.length) && (
            <section>
              <JudulBagian aksi={<TautanKecil href="/item">Lihat semua</TautanKecil>}>{pnSbk.length ? "Surat & item lain terbuka" : "Item terbuka"}</JudulBagian>
              {terbuka.length ? (
                <ul className="space-y-2">
                  {terbuka.slice(0, 8).map((i) => (
                    <li key={i.id}>
                      <KartuItem item={i} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Kosong ikon={ListChecks} judul="Tidak ada item terbuka">
                  Catat permintaan atau pekerjaan yang masuk hari ini supaya tenggatnya terpantau.
                </Kosong>
              )}
            </section>
          )}
          <div className="hidden lg:block">
            <TombolCatat label="Catat item" />
          </div>
        </div>

        <aside className="space-y-4">
          {tim && (
            <Kartu className="p-2">
              <BarisTautan href="/tim" ikon={Users} nada="brand" judul="Tim hari ini" sub="Pengisian & verifikasi staf" kanan={menungguTim ? <Lencana nada="gold">{menungguTim} menunggu</Lencana> : undefined} />
            </Kartu>
          )}
          {pimpinan(sesi) && (
            <Kartu className="p-2">
              <BarisTautan href="/kantor" ikon={Gauge} nada="ink" judul="Dashboard kantor" sub="Pengisian & K1 berjalan per bidang" />
            </Kartu>
          )}

          <details className="group rounded-2xl border border-border/70 bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
              <PetakIkon ikon={BookOpen} nada="mint" />
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-heading">Pengembangan diri</span>
                <span className="block text-xs text-muted-foreground">{pdBulanIni[0].n ? `${pdBulanIni[0].n} catatan bulan ini` : "Belum ada catatan bulan ini (skor K3 maks. 2)"}</span>
              </span>
            </summary>
            <div className="border-t border-border px-4 pb-4">
              <FormPdCepat tanggal={today} />
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
