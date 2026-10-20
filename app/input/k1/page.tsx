import { Suspense } from "react";
import { simpanRealisasi } from "../../actions";
import { AksiForm } from "../../components/aksi-form";
import { PilihPenugasan } from "../../components/pilih-penugasan";
import { JudulHalaman, Kartu, Lencana, Memuat, input, labelPeriode } from "../../components/ui";
import { getDb, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import type { Indikator } from "@/lib/kpi/types";

export default function Halaman(props: PageProps<"/input/k1">) {
  return (
    <>
      <JudulHalaman judul="Input realisasi K1" sub="Koordinator mengisi pembilang dan penyebut per indikator, beserta tautan bukti." />
      <Suspense fallback={<Memuat />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { pn } = await searchParams;
  const db = await getDb();
  const periode = periodeAktif(db);
  const t = db.penugasan.find((x) => x.id === pn);
  const terisi = new Set(db.realisasi.filter((r) => r.periodeId === periode.id).map((r) => r.penugasanId));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Kartu judul={labelPeriode(periode.id)}>
        <PilihPenugasan db={db} periodeId={periode.id} terpilih={t?.id} basis="/input/k1" sudah={(id) => terisi.has(id)} />
      </Kartu>
      {t ? <FormRealisasi penugasanId={t.id} /> : <Kartu><p className="py-10 text-center text-sm text-zinc-500">Pilih penugasan di daftar untuk mulai mengisi.</p></Kartu>}
    </div>
  );
}

async function FormRealisasi({ penugasanId }: { penugasanId: string }) {
  const db = await getDb();
  const periode = periodeAktif(db);
  const t = db.penugasan.find((x) => x.id === penugasanId)!;
  const pg = db.pegawai.find((p) => p.id === t.pegawaiId)!;
  const unit = db.units.find((u) => u.id === t.unitId)!;
  const katalog = db.indikator.filter((i) => i.peran === t.peran && (!i.unitId || i.unitId === t.unitId) && i.fase === 1);
  const cari = (kode: string, sub?: string) =>
    db.realisasi.find((r) => r.periodeId === periode.id && r.penugasanId === t.id && r.indikatorKode === kode && r.subKode === sub);
  const terkunci = periodeTerkunci(periode);

  const Baris = ({ ind, sub, nama }: { ind: Indikator; sub?: string; nama: string }) => {
    const r = cari(ind.kode, sub);
    const s = `|${ind.kode}|${sub ?? ""}`;
    return (
      <div className="grid grid-cols-2 gap-2 border-t border-wi-50 py-3 sm:grid-cols-[1fr_90px_90px_1fr] dark:border-wi-900">
        <div className="col-span-2 text-sm sm:col-span-1">
          <span className="font-mono text-xs">
            {ind.kode}
            {sub ? `(${sub})` : ""}
          </span>{" "}
          {nama}
          <div className="text-xs text-zinc-500">
            Target {ind.target}% · {ind.sumberData}
          </div>
        </div>
        <label className="text-xs">
          Pembilang
          <input name={`pembilang${s}`} defaultValue={r?.pembilang} inputMode="decimal" className={input} disabled={terkunci} />
        </label>
        <label className="text-xs">
          Penyebut
          <input name={`penyebut${s}`} defaultValue={r?.penyebut} inputMode="decimal" className={input} disabled={terkunci} />
        </label>
        <div className="col-span-2 space-y-1 text-xs sm:col-span-1">
          <label>
            Bukti (tautan / keterangan)
            <input name={`bukti${s}`} defaultValue={r?.bukti} className={input} disabled={terkunci} />
          </label>
          {ind.verifikasiKeuangan && (
            <label className="flex items-center gap-2">
              <input type="checkbox" name={`verif${s}`} defaultChecked={r?.terverifikasi} disabled={terkunci} />
              Terverifikasi Keuangan
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <Kartu judul={`${pg.nama} · ${t.peran} ${unit.nama}`}>
      {terkunci && <Lencana nada="merah">Periode terkunci</Lencana>}
      <p className="mb-2 text-xs text-zinc-500">
        Kosongkan pembilang dan penyebut bila belum ada data. Penyebut 0 berarti tidak ada kejadian bulan ini, dan indikator
        dikeluarkan dari rata-rata K1.
      </p>
      <AksiForm action={simpanRealisasi} tombol="Simpan realisasi" key={t.id}>
        <input type="hidden" name="periodeId" value={periode.id} />
        <input type="hidden" name="penugasanId" value={t.id} />
        {katalog.map((ind) =>
          ind.turunan ? (
            <div key={ind.kode} className="border-t border-wi-50 py-3 text-sm text-zinc-500 dark:border-wi-900">
              <span className="font-mono text-xs">{ind.kode}</span> {ind.nama} — dihitung otomatis dari K1 staf.
            </div>
          ) : ind.subTugas ? (
            ind.subTugas.map((st) => <Baris key={`${ind.kode}${st.kode}`} ind={ind} sub={st.kode} nama={`${ind.nama}: ${st.nama}`} />)
          ) : (
            <Baris key={ind.kode} ind={ind} nama={ind.nama} />
          ),
        )}
      </AksiForm>
    </Kartu>
  );
}
