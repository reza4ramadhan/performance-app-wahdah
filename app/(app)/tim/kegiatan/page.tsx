import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { CalendarDays, Copy, Plus, Trash2 } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Batang, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { StatusKegiatan } from "@/components/app/status-kegiatan";
import { PilihCari } from "@/components/app/pilih-cari";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { hapusKegiatan, salinKegiatanBulanLalu, simpanKegiatan } from "@/app/aksi/tim";
import { getDb, schema as s } from "@/lib/db";
import { daftarItem } from "@/lib/data/item";
import { stafBidang } from "@/lib/data/tim";
import { unitDalamBidang } from "@/lib/data/unit";
import { TANGGAL_BATAS_INPUT, bulanWajibKegiatan } from "@/lib/kegiatan-wajib";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggal, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Jadwal kegiatan" };

/**
 * Jadwal — konfirmasi rencana (docs/rombak-v2/04 butir 1.5, mockup Kor-3). Rencana SIMAKPRO (impor tahunan) dan
 * kegiatan tambahan dikonfirmasi tiap bulan: Jalan · Geser · Tunda · Batal. Checklist staf terbit saat Jalan/Geser.
 */
export default function HalamanKegiatan(props: PageProps<"/tim/kegiatan">) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const db = await getDb();
  const unitSaya = sesi.peran.has("admin") && !sesi.penugasan.some((p) => p.peranKerja === "KSBK")
    ? await db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(eq(s.unit.jenis, "bidang"))
    : sesi.amanahPn.filter((p) => p.peranKerja === "KSBK").map((p) => ({ id: p.unitId, nama: p.unitNama }));
  if (!unitSaya.length) return <Kosong ikon={CalendarDays} judul="Khusus koordinator">Halaman ini untuk koordinator unit.</Kosong>;

  const today = hariIni(sesi.kantor);
  const kini = periodeDari(today);
  const pilihan = bulanWajibKegiatan(today);
  const unit = unitSaya.find((u) => u.id === sp.unit) ?? unitSaya[0];
  const periode = typeof sp.periode === "string" && [kini, periodeBerikut(kini, 1)].includes(sp.periode) ? sp.periode : pilihan.at(-1)!;
  const { awal, akhir } = rentangPeriode(periode);

  const [kegiatan, skuo, staf] = await Promise.all([
    db
      .select({ k: s.kegiatan, pj: s.pegawai.nama, skuoNama: s.unit.nama })
      .from(s.kegiatan)
      .leftJoin(s.pegawai, eq(s.pegawai.id, s.kegiatan.penanggungJawabId))
      .leftJoin(s.unit, eq(s.unit.id, s.kegiatan.skuoId))
      .where(and(eq(s.kegiatan.unitId, unit.id), gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, akhir)))
      .orderBy(asc(s.kegiatan.tanggal)),
    unitDalamBidang(db, unit.id).then((ids) =>
      db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(and(eq(s.unit.jenis, "skuo"), inArray(s.unit.id, ids))).orderBy(s.unit.nama),
    ),
    stafBidang(db, unit.id, periode),
  ]);
  const aktif = kegiatan.filter((x) => x.k.status !== "tunda");
  const dikonfirmasi = aktif.filter((x) => x.k.status !== "rencana").length;
  const batas = `${periode}-${String(TANGGAL_BATAS_INPUT).padStart(2, "0")}`;
  const itemKeg = kegiatan.length ? await daftarItem(inArray(s.item.kegiatanId, kegiatan.map((x) => x.k.id)), { kantor: sesi.kantor, batas: 1000 }) : [];
  const progres = new Map(
    kegiatan.map(({ k }) => {
      const items = itemKeg.filter((i) => i.kegiatanId === k.id);
      return [k.id, { n: items.length, beres: items.filter((i) => i.status === "disetujui").length, lewat: items.filter((i) => i.lewat).length }];
    }),
  );
  const BINGKAI: Record<string, string> = { jalan: "border-mint-500/40", geser: "border-gold-400/70", batal: "border-flame-500/35", tunda: "border-border opacity-70", rencana: "border-border" };

  return (
    <div className="space-y-3">
      <Kepala judul={`Rencana ${labelPeriode(periode)}`} kembali="/?segmen=tim" />
      {unitSaya.length > 1 && <ChipFilter pilihan={unitSaya.map((u) => ({ nilai: u.id, label: u.nama }))} aktif={unit.id} href={(v) => `/tim/kegiatan?unit=${v}&periode=${periode}`} />}
      <ChipFilter pilihan={[kini, periodeBerikut(kini, 1)].map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/tim/kegiatan?unit=${unit.id}&periode=${v}`} />

      {aktif.length > 0 && (
        <section className="space-y-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">
              {dikonfirmasi} dari {aktif.length} dikonfirmasi
            </span>
            <span className="font-semibold text-gold-700 dark:text-gold-100">Batas {labelTanggal(batas)}</span>
          </div>
          <Batang nilai={(dikonfirmasi / aktif.length) * 100} />
          <p className="text-xs text-muted-foreground">Status langsung tersimpan; checklist staf dibuat begitu kegiatan berstatus Jalan atau Geser. Ubah tanggal di tengah bulan: tenggat checklist ikut bergeser.</p>
        </section>
      )}

      {kegiatan.length ? (
        <ul className="space-y-2">
          {kegiatan.map(({ k, pj, skuoNama }) => (
            <li key={k.id} className={`space-y-2.5 rounded-2xl border bg-card px-3.5 py-3 ${BINGKAI[k.status]}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-heading">{k.nama}</p>
                  <p className="text-xs text-muted-foreground">
                    {[skuoNama, `${k.status === "rencana" || k.tanggalRencana ? "rencana " : ""}${labelTanggal(k.tanggalRencana ?? k.tanggal)}${k.status === "geser" ? ` → ${labelTanggal(k.tanggal)}` : ""}`, pj ? `PJ ${pj}` : "PJ belum ada"].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {k.perluSpp && <Lencana nada="brand">SPP & SPB</Lencana>}
                    {k.sumber !== "rencana" && <Lencana>Tambahan</Lencana>}
                    <LencanaProgres {...progres.get(k.id)!} />
                  </div>
                </div>
                {k.status !== "tunda" && (
                  <TombolAksi aksi={hapusKegiatan.bind(null, k.id)} konfirmasi="Hapus kegiatan ini? Hanya bisa bila checklist belum dikerjakan." varian="ghost" ukuran="icon" label="Hapus kegiatan">
                    <Trash2 className="size-4" />
                  </TombolAksi>
                )}
              </div>
              {k.status === "batal" && k.alasanBatal && <p className="text-xs text-flame-700 dark:text-flame-100">Batal: {k.alasanBatal}</p>}
              <StatusKegiatan id={k.id} status={k.status} tanggal={k.tanggal} alasan={k.alasanBatal} min={rentangPeriode(kini).awal} max={rentangPeriode(periodeBerikut(kini, 2)).akhir} />
            </li>
          ))}
        </ul>
      ) : (
        <Kosong ikon={CalendarDays} judul={`Belum ada rencana ${labelPeriode(periode)}`}>
          Rencana SIMAKPRO diimpor Admin setahun sekali. Kegiatan di luar SIMAKPRO bisa ditambahkan di bawah.
        </Kosong>
      )}

      <details className="rounded-2xl border border-primary/50 bg-card" open={!kegiatan.length}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 text-[14.5px] font-semibold text-primary">
          <Plus className="size-4" aria-hidden /> Kegiatan tambahan (di luar SIMAKPRO)
        </summary>
        <div className="border-t border-border px-4 pb-4">
          <FormAksi aksi={simpanKegiatan} tombol="Simpan kegiatan" tombolPenuh className="mt-3 space-y-3">
            <input type="hidden" name="unitId" value={unit.id} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Nama kegiatan</span>
              <Input name="nama" required placeholder="mis. Daurah Dai Wilayah" />
              <Galat nama="nama" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Tanggal</span>
                <Input name="tanggal" type="date" required min={awal} max={akhir} defaultValue={periode === kini ? today : awal} />
                <Galat nama="tanggal" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-heading">Departemen</span>
                <PilihCari name="skuoId" opsi={skuo} nilaiAwal={skuo.length === 1 ? skuo[0].id : ""} kosong={null} placeholder="Pilih…" required />
                <Galat nama="skuoId" />
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <Checkbox name="perluSppSpb" className="size-5" /> Butuh SPP & SPB
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Penanggung jawab</span>
              <PilihCari name="penanggungJawabId" opsi={staf.map((p) => ({ id: p.id, nama: p.nama }))} nilaiAwal="" kosong="Otomatis (PJ utama di Manage tim)" />
              <Galat nama="penanggungJawabId" />
            </label>
          </FormAksi>
          {periode === kini && (
            <TombolAksi aksi={salinKegiatanBulanLalu.bind(null, unit.id)} konfirmasi="Salin semua kegiatan bulan lalu ke bulan ini?" className="mt-3 w-full" varian="ghost">
              <Copy className="size-4" /> Salin dari bulan lalu
            </TombolAksi>
          )}
        </div>
      </details>
    </div>
  );
}

/** Kemajuan item staf untuk satu kegiatan; lewat tenggat didahulukan. */
function LencanaProgres({ n, beres, lewat }: { n: number; beres: number; lewat: number }) {
  if (lewat) return <Lencana nada="flame">{lewat} lewat tenggat</Lencana>;
  if (!n) return null;
  return (
    <Lencana nada={beres === n ? "mint" : "netral"}>
      {beres}/{n} item selesai
    </Lencana>
  );
}
