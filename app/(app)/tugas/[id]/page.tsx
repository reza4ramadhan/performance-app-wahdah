// Detail tugas rutin / delegasi (docs/rombak-v2/03 butir 1.6, mockup Rtn-2): uraian, jam tenggat, pemberi tugas,
// link bukti wajib atau tidak, jejak pekan ini (rutin), riwayat, dan Tandai selesai.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { FormSelesaiTugas } from "@/components/app/selesai-tugas";
import { PutusanTugas } from "@/components/app/tugas";
import { Kartu, Kepala, Kerangka } from "@/components/app/ui";
import { koordinatorAtauWakil } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { daftarTugas } from "@/lib/data/tugas";
import { LABEL_STATUS_TUGAS } from "@/lib/ikp/tipe";
import { LABEL_HARI } from "@/lib/set-tugas";
import { wajibSesi } from "@/lib/sesi";
import { rentangPekan } from "@/lib/tugas-saya";
import { cn } from "@/lib/utils";
import { hariDalamPekan, hariIni, jamLokal, keUtc, labelTanggal, tambahHari, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Detail tugas" };

export default function HalamanDetailTugas(props: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Kerangka />}>
        <Isi params={props.params} />
      </Suspense>
    </div>
  );
}

const LABEL_AUDIT: Record<string, string> = { ajukan: "Ditandai selesai", progres: "Progres diperbarui", setujui: "Disetujui", tolak: "Ditolak" };

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesi = await wajibSesi();
  const [t] = await daftarTugas(eq(s.tugasKhususJadwal.id, id), 1);
  if (!t) notFound();
  const db = await getDb();
  const [pn] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, t.penugasanId));
  const milik = t.stafId === sesi.pegawaiId;
  if (!milik && t.pemberiId !== sesi.pegawaiId && !koordinatorAtauWakil(sesi, pn?.koordinatorId ?? null)) notFound();

  const tgl = tanggalLokal(t.tenggat, t.kantor);
  const jam = jamLokal(t.tenggat, t.kantor).replace(":", ".");
  const today = hariIni(t.kantor);
  const pekan = rentangPekan(tgl);
  const [jejak, riwayat, item] = await Promise.all([
    t.setTugasItemId
      ? db
          .select()
          .from(s.tugasKhususJadwal)
          .where(and(eq(s.tugasKhususJadwal.tugasId, t.tugasId), gte(s.tugasKhususJadwal.tenggat, keUtc(pekan.awal, t.kantor)), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(pekan.akhir, 1), t.kantor))))
      : Promise.resolve([]),
    db.select().from(s.auditLog).where(and(eq(s.auditLog.entitas, "tugas_khusus_jadwal"), eq(s.auditLog.entitasId, id))).orderBy(desc(s.auditLog.waktu)).limit(10),
    t.setTugasItemId ? db.select().from(s.setTugasItem).where(eq(s.setTugasItem.id, t.setTugasItemId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const buka = t.status === "belum" || t.status === "dikerjakan" || t.status === "ditolak";
  const status = buka ? (t.lewat ? `Terlambat · tenggat ${labelTanggal(tgl)} ${jam}` : `Belum selesai · tenggat ${tgl === today ? "hari ini" : labelTanggal(tgl)} ${jam}`) : LABEL_STATUS_TUGAS[t.status];
  const jenis = t.setTugasItemId ? `Rutin · ${item?.frekuensi === "pekanan" && item.hari !== null ? `setiap ${LABEL_HARI[item.hari]}` : "setiap hari kerja"}` : "Delegasi · sekali";

  return (
    <div className="space-y-4">
      <Kepala judul={t.judul} kembali={milik ? "/" : "/tim/verifikasi"} />
      <span className={cn("-mt-3 inline-block rounded-md px-2.5 py-1 text-xs font-semibold", t.lewat || t.status === "ditolak" ? "bg-flame-500/10 text-flame-700 dark:text-flame-100" : buka ? "bg-gold-400/25 text-gold-700 dark:text-gold-100" : "bg-mint-500/12 text-mint-700 dark:text-mint-100")}>{status}</span>
      {t.uraian && <p className="text-sm leading-relaxed text-foreground/80">{t.uraian}</p>}
      {t.status === "ditolak" && t.alasanTolak && <p className="rounded-xl bg-flame-500/10 px-3 py-2.5 text-sm text-flame-700 dark:text-flame-100">Ditolak: “{t.alasanTolak}”</p>}

      <Kartu className="py-1">
        <dl className="divide-y divide-border text-sm">
          {[
            ["Jenis", jenis],
            ...(t.setNama ? [["Set tugas", t.setNama]] : []),
            [t.setTugasItemId ? "Dipasang oleh" : "Pemberi tugas", t.pemberiNama],
            ...(milik ? [] : [["Staf", t.stafNama]]),
            ["Link bukti", t.linkWajib ? "Wajib" : "Opsional"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className={cn("text-right font-semibold text-heading", k === "Link bukti" && t.linkWajib && "text-flame-600 dark:text-flame-100")}>{v}</dd>
            </div>
          ))}
        </dl>
      </Kartu>

      {jejak.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Pekan ini</h2>
          <div className="grid grid-cols-5 gap-1.5">
            {[...jejak]
              .sort((a, b) => +a.tenggat - +b.tenggat)
              .slice(0, 7)
              .map((j) => {
                const d = tanggalLokal(j.tenggat, t.kantor);
                const sel = j.status === "disetujui" ? "Tepat" : j.status === "ditolak" ? "Ditolak" : j.status === "diajukan" ? "Diperiksa" : d === today ? "Hari ini" : d < today ? "Lewat" : "–";
                return (
                  <span
                    key={j.id}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold",
                      sel === "Tepat" && "bg-mint-500/12 text-mint-700 dark:text-mint-100",
                      (sel === "Ditolak" || sel === "Lewat") && "bg-flame-500/10 text-flame-700 dark:text-flame-100",
                      sel === "Diperiksa" && "bg-gold-400/25 text-gold-700 dark:text-gold-100",
                      sel === "Hari ini" && "border-2 border-primary bg-primary/8",
                      sel === "–" && "bg-muted text-muted-foreground",
                    )}
                  >
                    <span>{LABEL_HARI[hariDalamPekan(d)].slice(0, 3)}</span>
                    <span>{sel}</span>
                  </span>
                );
              })}
          </div>
        </section>
      )}

      {riwayat.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">Riwayat</h2>
          <ol className="space-y-1.5 text-[13px] text-foreground/80">
            {[...riwayat].reverse().map((r) => (
              <li key={r.id}>
                {labelTanggal(tanggalLokal(r.waktu, t.kantor))} · {LABEL_AUDIT[r.aksi] ?? r.aksi}
                {r.alasan ? `: “${r.alasan}”` : ""}
              </li>
            ))}
          </ol>
        </section>
      )}

      {milik && buka && (
        <Kartu>
          <h2 className="mb-3 text-[15px] font-semibold text-heading">Tandai selesai</h2>
          <FormSelesaiTugas id={t.id} linkWajib={t.linkWajib} tenggat={`${labelTanggal(tgl)} ${jam}`} lewat={t.lewat} />
        </Kartu>
      )}
      {!milik && t.status === "diajukan" && (
        <Kartu>
          <PutusanTugas ids={[t.id]} />
        </Kartu>
      )}
    </div>
  );
}
