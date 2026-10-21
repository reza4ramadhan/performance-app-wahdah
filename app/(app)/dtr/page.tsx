import type { Metadata } from "next";
import { Suspense } from "react";
import { and, gte, inArray, lte } from "drizzle-orm";
import { ClipboardCheck } from "lucide-react";
import { CentangDtr, FormDtr } from "@/components/app/dtr";
import { JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, labelTanggalPanjang, periodeBerikut, periodeDari, seninPekan, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "DTR" };

export default function HalamanDtr() {
  return (
    <>
      <Kepala judul="Daftar Tugas Rutin" sub="Centang tugas yang sudah dikerjakan. Atasan menyetujui centang secara berkala." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const pnSk = sesi.penugasan.filter((p) => p.peranKerja === "SK");
  if (!pnSk.length) return <Kosong ikon={ClipboardCheck} judul="DTR khusus untuk Staf Khusus" />;
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const senin = seninPekan(today);

  const tugas = await db.select().from(s.dtrTugas).where(and(inArray(s.dtrTugas.penugasanId, pnSk.map((p) => p.id)), inArray(s.dtrTugas.periodeId, [periode, periodeBerikut(periode, -1)])));
  const cek = tugas.length
    ? await db.select().from(s.dtrCek).where(and(inArray(s.dtrCek.dtrTugasId, tugas.map((t) => t.id)), gte(s.dtrCek.tanggal, tambahHari(senin, -1)), lte(s.dtrCek.tanggal, today)))
    : [];

  return (
    <div className="space-y-5">
      {pnSk.map((pn) => {
        const kini = tugas.filter((t) => t.penugasanId === pn.id && t.periodeId === periode);
        const lalu = tugas.filter((t) => t.penugasanId === pn.id && t.periodeId === periodeBerikut(periode, -1));
        const disetujui = kini.length > 0 && kini.every((t) => t.disetujuiOleh);
        return (
          <section key={pn.id} className="space-y-3">
            {pnSk.length > 1 && <JudulBagian>{pn.unitNama}</JudulBagian>}
            {disetujui ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">{labelTanggalPanjang(today)}</p>
                {kini.map((t) => {
                  const c = t.frekuensi === "harian" ? cek.find((x) => x.dtrTugasId === t.id && x.tanggal === today) : cek.find((x) => x.dtrTugasId === t.id && seninPekan(x.tanggal) === senin);
                  return (
                    <CentangDtr
                      key={t.id}
                      tugasId={t.id}
                      tanggal={c?.tanggal ?? today}
                      uraian={t.uraian}
                      sub={t.frekuensi === "harian" ? "Harian · hari ini" : "Mingguan · pekan ini"}
                      selesai={!!c?.selesai}
                      disetujui={!!c?.disetujui}
                    />
                  );
                })}
              </>
            ) : (
              <Kartu>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-heading">DTR {labelPeriode(periode)}</h2>
                  {kini.length ? <Lencana nada="gold">Menunggu persetujuan</Lencana> : <Lencana>Belum diajukan</Lencana>}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">Ajukan 3–5 tugas rutin paling lambat tanggal 5. Untuk staf keamanan bisa berisi kepatuhan shift dan patroli.</p>
                <FormDtr penugasanId={pn.id} awal={(kini.length ? kini : lalu).map((t) => ({ uraian: t.uraian, frekuensi: t.frekuensi }))} />
              </Kartu>
            )}
          </section>
        );
      })}
    </div>
  );
}
