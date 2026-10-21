import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { ClipboardCheck } from "lucide-react";
import { TombolSetujuiDtr } from "@/components/app/dtr";
import { Avatar, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { anggotaTim } from "@/lib/data/tim";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelTanggal, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "DTR staf" };

export default function HalamanDtrStaf() {
  return (
    <>
      <Kepala judul="DTR staf" kembali="/tim" sub="Setujui Daftar Tugas Rutin di awal bulan, lalu setujui centang harian/mingguan secara berkala." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const periode = periodeDari(hariIni(sesi.kantor));
  const staf = (await anggotaTim(sesi.pegawaiId, sesi.kantor)).flatMap((t) => t.penugasan.filter((p) => p.peranKerja === "SK").map((p) => ({ ...p, nama: t.nama })));
  if (!staf.length) return <Kosong ikon={ClipboardCheck} judul="Tidak ada Staf Khusus di tim Anda" />;
  const db = await getDb();
  const tugas = await db.select().from(s.dtrTugas).where(and(inArray(s.dtrTugas.penugasanId, staf.map((x) => x.id)), eq(s.dtrTugas.periodeId, periode)));
  const cek = tugas.length ? await db.select().from(s.dtrCek).where(and(inArray(s.dtrCek.dtrTugasId, tugas.map((t) => t.id)), eq(s.dtrCek.disetujui, false), eq(s.dtrCek.selesai, true))) : [];

  return (
    <div className="space-y-3">
      {staf.map((st) => {
        const t = tugas.filter((x) => x.penugasanId === st.id);
        const menunggu = t.some((x) => !x.disetujuiOleh);
        const cekMenunggu = cek.filter((c) => t.some((x) => x.id === c.dtrTugasId));
        return (
          <Kartu key={st.id}>
            <div className="mb-3 flex items-center gap-3">
              <Avatar nama={st.nama} ukuran="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{st.nama}</p>
                <p className="text-xs text-muted-foreground">{st.unitNama}</p>
              </div>
              {!t.length ? <Lencana>Belum mengajukan</Lencana> : menunggu ? <Lencana nada="gold">Menunggu persetujuan</Lencana> : <Lencana nada="mint">Disetujui</Lencana>}
            </div>
            {t.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {t.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span>{x.uraian}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{x.frekuensi}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {menunggu && <TombolSetujuiDtr penugasanId={st.id} periode={periode} jenis="dtr" label="Setujui DTR" />}
              {cekMenunggu.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {cekMenunggu.length} centang menunggu ({[...new Set(cekMenunggu.map((c) => labelTanggal(c.tanggal)))].slice(0, 3).join(", ")}
                    {cekMenunggu.length > 3 ? ", …" : ""})
                  </span>
                  <TombolSetujuiDtr penugasanId={st.id} periode={periode} jenis="cek" label="Setujui centang" />
                </>
              )}
            </div>
          </Kartu>
        );
      })}
    </div>
  );
}
