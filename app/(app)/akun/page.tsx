import type { Metadata } from "next";
import { Suspense } from "react";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ArrowLeftRight, BookOpen, ClipboardCheck, KeyRound, Lightbulb, LogOut, NotebookPen, Smartphone } from "lucide-react";
import { PanduanPasang, SakelarNotifikasi } from "@/components/app/pwa";
import { PilihanTema } from "@/components/app/tema";
import { Avatar, BarisTautan, Kartu, Kerangka, Lencana } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { keluar, pindahAmanah } from "@/app/aksi/akun";
import { getDb, schema as s } from "@/lib/db";
import { liburPerKantor } from "@/lib/data/ikp";
import { LABEL_PERAN_KERJA, LABEL_PERAN_SISTEM } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { LABEL_ZONA, geserHariKerja, hariIni, hariKerjaPeriode, isHariKerja, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Akun" };

export default function HalamanAkun() {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const { awal, akhir } = rentangPeriode(periode);
  const tz = sesi.kantor === "makassar" ? "Asia/Makassar" : "Asia/Jakarta";
  const pnIds = sesi.penugasan.map((p) => p.id).concat("-");

  const binaanSaya = sesi.binaan.filter((b) => b.koordinatorId === sesi.pegawaiId).map((b) => b.id);
  const [[pg], [nItem], hariItem, hariJurnal, libur, menunggu] = await Promise.all([
    db.select().from(s.pegawai).where(eq(s.pegawai.id, sesi.pegawaiId)),
    db.select({ n: count() }).from(s.item).where(and(inArray(s.item.penugasanId, pnIds), eq(s.item.periodeId, periode))),
    db.selectDistinct({ d: sql<string>`(${s.item.dibuatPada} at time zone ${tz})::date::text` }).from(s.item).where(inArray(s.item.penugasanId, pnIds)),
    db.selectDistinct({ d: s.jurnal.tanggal }).from(s.jurnal).where(and(eq(s.jurnal.pegawaiId, sesi.pegawaiId), gte(s.jurnal.tanggal, geserHariKerja(today, -60, new Set())), lte(s.jurnal.tanggal, akhir))),
    liburPerKantor(db),
    // Antrean verifikasi per penugasan binaan, agar profil menunjukkan amanah lain yang perlu dibuka.
    binaanSaya.length
      ? db
          .select({ pn: s.item.penugasanId, n: count() })
          .from(s.item)
          .where(and(inArray(s.item.penugasanId, binaanSaya), eq(s.item.status, "diajukan")))
          .groupBy(s.item.penugasanId)
      : [],
  ]);
  const antreanAmanah = new Map<string, number>();
  for (const m of menunggu) {
    const a = sesi.binaan.find((b) => b.id === m.pn)?.amanahId;
    if (a) antreanAmanah.set(a, (antreanAmanah.get(a) ?? 0) + m.n);
  }
  const terisi = new Set([...hariItem.map((x) => x.d), ...hariJurnal.map((x) => x.d)]);
  const hkBulan = hariKerjaPeriode(periode, libur(sesi.kantor), today);
  // Beruntun: hari kerja berturut-turut terisi sampai hari ini (hari ini boleh belum diisi).
  let beruntun = 0;
  for (let t = terisi.has(today) || !isHariKerja(today, libur(sesi.kantor)) ? today : geserHariKerja(today, -1, libur(sesi.kantor)); ; t = geserHariKerja(t, -1, libur(sesi.kantor))) {
    if (!isHariKerja(t, libur(sesi.kantor))) continue;
    if (!terisi.has(t)) break;
    beruntun++;
    if (beruntun > 300) break;
  }
  const bisaTugas = sesi.amanah?.peranKerja === "SBK" || sesi.amanah?.peranKerja === "SK";
  const peran = [...sesi.peran].filter((p) => p !== "pegawai");
  const rangkap = sesi.daftarAmanah.length > 1;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lg dark:bg-brand-900">
        <span aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-brand-400/20" />
        <span aria-hidden className="absolute -bottom-16 left-10 size-36 rounded-full bg-gold-400/10" />
        <div className="relative flex items-center gap-4">
          <Avatar nama={sesi.nama} ukuran="xl" className="ring-4 ring-white/15" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{sesi.nama}</h1>
            <p className="truncate text-sm text-white/70">
              {pg.nip ? `NIP ${pg.nip}` : pg.noHp} · {pg.kantor === "makassar" ? "Makassar" : "Jakarta"} ({LABEL_ZONA[sesi.kantor]})
            </p>
            <p className="truncate text-xs text-white/60">{pg.statusKepegawaian}</p>
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/8 py-3 text-center">
          <div>
            <dt className="text-xs text-white/65">Item bulan ini</dt>
            <dd className="text-xl font-bold tabular-nums">{nItem.n}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/65">Hari terisi</dt>
            <dd className="text-xl font-bold tabular-nums">
              {hkBulan.filter((d) => terisi.has(d)).length}/{hkBulan.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/65">Beruntun</dt>
            <dd className="text-xl font-bold tabular-nums">{beruntun} hari</dd>
          </div>
        </dl>
      </section>

      <Kartu id="amanah">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rangkap ? "Pindah amanah" : "Amanah bulan ini"}</p>
        {rangkap && <p className="mb-2 text-sm text-muted-foreground">Menu, dashboard, item, dan tim mengikuti amanah yang aktif.</p>}
        <ul className="divide-y divide-border text-sm">
          {sesi.daftarAmanah.map((grup) => {
            const p = grup[0];
            const aktif = grup.some((x) => x.id === sesi.amanah?.id);
            const n = grup.reduce((a, x) => a + (antreanAmanah.get(x.id) ?? 0), 0);
            return (
              <li key={p.id} className="flex min-h-14 items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-heading">{LABEL_PERAN_KERJA[p.peranKerja]}</span>
                  {grup.map((x) => (
                    <span key={x.id} className="block truncate text-xs text-muted-foreground">
                      {x.unitNama}
                    </span>
                  ))}
                </span>
                {n > 0 && <Lencana nada="gold">{n} menunggu verifikasi</Lencana>}
                {aktif ? (
                  rangkap && <Lencana nada="brand">Aktif</Lencana>
                ) : (
                  <form action={pindahAmanah.bind(null, p.id)}>
                    <Button type="submit" variant="outline" size="sm" className="rounded-xl">
                      <ArrowLeftRight className="size-4" /> Pindah
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
          {!sesi.penugasan.length && <li className="py-2 text-muted-foreground">Belum ada penugasan. Hubungi Admin.</li>}
        </ul>
        {peran.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {peran.map((p) => (
              <Lencana key={p} nada="brand">
                {LABEL_PERAN_SISTEM[p]}
              </Lencana>
            ))}
          </div>
        )}
      </Kartu>

      <Kartu className="p-2">
        <BarisTautan href="/jurnal" ikon={NotebookPen} nada="gold" judul="Jurnal kerja" />
        <BarisTautan href="/pengembangan-diri" ikon={BookOpen} nada="mint" judul="Pengembangan diri" />
        {bisaTugas && <BarisTautan href="/tugas" ikon={ClipboardCheck} nada="ink" judul="Tugas khusus" />}
        <BarisTautan href="/k4" ikon={Lightbulb} nada="brand" judul="Inovasi Plus (K4)" />
        <BarisTautan href="/ganti-password" ikon={KeyRound} nada="netral" judul="Ganti password" />
      </Kartu>

      <Kartu className="space-y-4">
        <PilihanTema />
        <div className="border-t border-border pt-4">
          <SakelarNotifikasi />
        </div>
        <div className="border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-2 text-[15px] font-medium text-heading">
            <Smartphone className="size-5 text-primary" /> Pasang di Home Screen
          </p>
          <PanduanPasang />
        </div>
      </Kartu>

      <form action={keluar}>
        <Button type="submit" variant="outline" size="lg" className="w-full rounded-2xl">
          <LogOut className="size-4" /> Keluar
        </Button>
      </form>
      <p className="pb-2 text-center text-xs text-muted-foreground">IKP Pegawai · Kantor Pusat Wahdah Islamiyah · uji coba ({awal.slice(0, 4)})</p>
    </div>
  );
}
