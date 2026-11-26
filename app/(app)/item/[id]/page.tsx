import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { PutusanItem, UbahItem } from "@/components/app/aksi-item";
import { KonfirmasiDanaCair, PendingSpb } from "@/components/app/pending-spb";
import { Kartu, Kepala, Kerangka, Lencana, LencanaStatus } from "@/components/app/ui";
import { bolehVerifikasiItem, koordinatorAtauWakil, pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { paramIndikator } from "@/lib/data/ikp";
import { daftarItem } from "@/lib/data/item";
import { aksiItem } from "@/lib/data/tugas-saya";
import { indikatorDari } from "@/lib/ikp/katalog";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, jamLokal, labelTanggal, tambahHari, tanggalLokal, type Kantor } from "@/lib/waktu";

export const metadata: Metadata = { title: "Detail tugas" };

export default function HalamanRincian(props: PageProps<"/item/[id]">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

/** Label riwayat untuk aksi audit log item. */
const LABEL_AUDIT: Record<string, string> = {
  "pending-dana": "Ditandai pending: dana belum cair",
  "batal-pending-dana": "Tanda pending dicabut",
  "dana-cair": "Tanggal dana cair dikonfirmasi",
};

const waktuTeks = (d: Date | null, kantor: Kantor, denganJam = false) =>
  d ? `${labelTanggal(tanggalLokal(d, kantor), true)}${denganJam ? `, ${jamLokal(d, kantor)}` : ""}` : "—";

async function Isi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sesi = await wajibSesi();
  const db = await getDb();
  const [item] = await daftarItem(eq(s.item.id, id), { kantor: sesi.kantor, batas: 1 });
  if (!item) notFound();
  const [[pn], param] = await Promise.all([db.select().from(s.penugasan).where(eq(s.penugasan.id, item.penugasanId)), paramIndikator(db)]);
  const def = indikatorDari(item.indikatorKode)!;
  const verifikator = param.get(item.indikatorKode)?.verifikator ?? "koordinator";
  const pemilik = item.pemilikId === sesi.pegawaiId;
  const bisaVerifikasi = bolehVerifikasiItem(sesi, { pemilikId: item.pemilikId, koordinatorId: pn.koordinatorId, verifikator }).boleh;
  if (!pemilik && !bisaVerifikasi && !koordinatorAtauWakil(sesi, pn.koordinatorId) && !pimpinan(sesi)) notFound();

  const kantor = (await db.select({ k: s.pegawai.kantor }).from(s.pegawai).where(eq(s.pegawai.id, item.pemilikId)))[0].k as Kantor;
  const pakaiJam = def.item?.selesai.jenis === "waktu";
  const [verifNama, riwayat, saudara] = await Promise.all([
    db
      .select({ nama: s.pegawai.nama, waktu: s.item.diverifikasiPada })
      .from(s.item)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.item.verifikatorId))
      .where(eq(s.item.id, id)),
    db.select().from(s.auditLog).where(and(eq(s.auditLog.entitas, "item"), eq(s.auditLog.entitasId, id))).orderBy(desc(s.auditLog.waktu)).limit(10),
    // Checklist kegiatan ini: item lain dari kegiatan yang sama milik penugasan yang sama.
    item.kegiatanId ? daftarItem(and(eq(s.item.kegiatanId, item.kegiatanId), eq(s.item.penugasanId, item.penugasanId)), { kantor: sesi.kantor, batas: 20 }) : Promise.resolve([]),
  ]);
  const today = hariIni(sesi.kantor);
  const spbBuka = item.indikatorKode === "SBK-2b" && (item.status === "terbuka" || item.status === "ditolak") && !item.danaCairPada;

  let form = null;
  if (pemilik && item.status !== "disetujui" && !item.pendingDana) {
    const [kegiatan, skuo, minTanggal] = await Promise.all([
      db
        .select({ id: s.kegiatan.id, nama: s.kegiatan.nama, tanggal: s.kegiatan.tanggal })
        .from(s.kegiatan)
        .where(and(eq(s.kegiatan.unitId, sesi.penugasan.find((p) => p.id === pn.id)?.bidangId ?? pn.unitId), gte(s.kegiatan.tanggal, tambahHari(today, -60)), lte(s.kegiatan.tanggal, tambahHari(today, 60)))),
      db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.jenis, ["skuo", "bidang", "unit_pendukung"])),
      tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor),
    ]);
    const fmt = (d: Date | null, jenis: "tanggal" | "waktu" | undefined) => (d ? (jenis === "waktu" ? `${tanggalLokal(d, sesi.kantor)}T${jamLokal(d, sesi.kantor)}` : tanggalLokal(d, sesi.kantor)) : "");
    form = (
      <UbahItem
        id={id}
        kode={item.indikatorKode}
        hariIni={today}
        minTanggal={minTanggal}
        pilihan={{ kegiatan, skuo }}
        bisaHapus={!def.otomatis}
        kunciKegiatan={def.otomatis}
        bukaAwal={item.status === "ditolak" || sp.selesai === "1"}
        awal={{
          kegiatanId: item.kegiatanId ?? "",
          masuk: fmt(item.tglMasuk, def.item?.masuk?.jenis),
          selesai: fmt(item.tglSelesai, def.item?.selesai.jenis),
          linkBukti: item.linkBukti ?? "",
          data: item.data,
          sudahSelesai: !!item.tglSelesai,
        }}
      />
    );
  }

  const baris: [string, React.ReactNode][] = [
    ["Indikator", `${def.kode} · ${def.nama}`],
    ...(pemilik ? [] : ([["Pegawai", `${item.pemilikNama} · ${item.unitNama}`]] as [string, React.ReactNode][])),
    ...(item.kegiatanNama ? ([["Kegiatan", item.kegiatanNama]] as [string, React.ReactNode][]) : []),
    ...(def.item?.field ?? []).filter((f) => item.data[f.nama]).map((f) => [f.label, item.data[f.nama]] as [string, React.ReactNode]),
    ...(def.item?.masuk ? ([[def.item.masuk.label, waktuTeks(item.tglMasuk, kantor, def.item.masuk.jenis === "waktu")]] as [string, React.ReactNode][]) : []),
    [def.item?.selesai.label ?? "Selesai", waktuTeks(item.tglSelesai, kantor, pakaiJam)],
  ];

  return (
    <>
      <Kepala judul={pemilik ? aksiItem(item) : item.judul} kembali={pemilik ? "/" : "/verifikasi"} sub={<span className="inline-flex flex-wrap items-center gap-2"><LencanaStatus status={item.status} />{item.verifikatorId === item.pemilikId && <Lencana nada="gold">Diverifikasi sendiri</Lencana>}{item.sisa && <Lencana nada={item.sisa.nada}>{item.sisa.teks}</Lencana>}</span>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {item.status === "ditolak" && item.alasanTolak && (
            <p className="rounded-2xl bg-flame-500/10 px-4 py-3 text-sm text-flame-700 dark:text-flame-100">
              <strong>Ditolak:</strong> {item.alasanTolak}. Perbaiki lalu ajukan lagi.
            </p>
          )}
          <Kartu>
            <dl className="divide-y divide-border text-sm">
              {baris.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium text-heading">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-2.5">
                <dt className="text-muted-foreground">Link bukti</dt>
                <dd className="min-w-0 text-right">
                  {item.linkBukti ? (
                    <a href={item.linkBukti} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                      <span className="truncate">Buka bukti</span> <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Belum ada</span>
                  )}
                </dd>
              </div>
            </dl>
          </Kartu>

          {pemilik && spbBuka && (
            <Kartu>
              <PendingSpb id={id} pending={item.pendingDana} />
            </Kartu>
          )}
          {!pemilik && item.pendingDana && koordinatorAtauWakil(sesi, pn.koordinatorId) && (
            <Kartu>
              <KonfirmasiDanaCair id={id} hariIni={today} />
            </Kartu>
          )}
          {form && <Kartu>{form}</Kartu>}
          {saudara.length > 1 && (
            <Kartu>
              <h2 className="mb-2 text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Checklist kegiatan ini</h2>
              <ul className="divide-y divide-border text-sm">
                {saudara
                  .sort((a, b) => (a.tenggat ?? "").localeCompare(b.tenggat ?? ""))
                  .map((x) => (
                    <li key={x.id} className={x.id === id ? "-mx-2 rounded-lg bg-primary/8 px-2" : ""}>
                      <a href={`/item/${x.id}`} className="flex min-h-11 items-center justify-between gap-3">
                        <span className={x.id === id ? "font-semibold text-heading" : "text-muted-foreground"}>
                          {aksiItem(x)}
                          {x.tenggat && ` · s.d. ${labelTanggal(x.tenggat)}`}
                        </span>
                        {x.id === id ? <span className="text-xs font-semibold text-primary">Sedang dibuka</span> : x.pendingDana ? <Lencana nada="gold">Pending dana</Lencana> : <LencanaStatus status={x.status} />}
                      </a>
                    </li>
                  ))}
              </ul>
            </Kartu>
          )}
          {bisaVerifikasi && item.status === "diajukan" && (
            <Kartu>
              <p className="mb-3 text-sm text-muted-foreground">
                {pemilik ? "Item Anda sendiri: Anda koordinator penugasan ini, jadi verifikasi tercatat sebagai \"diverifikasi sendiri\". " : ""}
                Periksa bukti sebelum memutuskan. {verifikator === "keuangan" ? "Setujui = sesuai SOP; tolak = dikembalikan." : ""}
              </p>
              <PutusanItem ids={[id]} />
            </Kartu>
          )}
        </div>

        <Kartu>
          <h2 className="mb-3 text-[15px] font-semibold text-heading">Riwayat</h2>
          <ol className="space-y-3 border-l-2 border-border pl-4 text-sm">
            <li>
              <p className="font-medium text-heading">Dicatat</p>
              <p className="text-xs text-muted-foreground">{waktuTeks(item.tglMasuk, kantor, pakaiJam)}</p>
            </li>
            {item.diajukanPada && (
              <li>
                <p className="font-medium text-heading">Diajukan untuk verifikasi</p>
                <p className="text-xs text-muted-foreground">{waktuTeks(item.diajukanPada, kantor, true)}</p>
              </li>
            )}
            {[...riwayat]
              .reverse()
              .filter((r) => LABEL_AUDIT[r.aksi])
              .map((r) => (
                <li key={r.id}>
                  <p className="font-medium text-heading">{LABEL_AUDIT[r.aksi]}</p>
                  <p className="text-xs text-muted-foreground">
                    {waktuTeks(r.waktu, kantor, true)}
                    {r.alasan && ` · ${r.alasan}`}
                  </p>
                </li>
              ))}
            {verifNama[0] && (
              <li>
                <p className="font-medium text-heading">{item.status === "ditolak" ? "Ditolak" : "Disetujui"} oleh {verifNama[0].nama}</p>
                <p className="text-xs text-muted-foreground">{waktuTeks(verifNama[0].waktu, kantor, true)}</p>
              </li>
            )}
          </ol>
          {riwayat.length > 1 && <p className="mt-3 text-xs text-muted-foreground">{riwayat.length} perubahan tercatat di log audit.</p>}
        </Kartu>
      </div>
    </>
  );
}
