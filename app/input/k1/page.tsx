import type { Metadata } from "next";
import { Suspense } from "react";
import { DaftarPenugasan } from "../../components/daftar-penugasan";
import { FormK1, type BarisK1 } from "../../components/form-k1";
import { Ikon } from "../../components/ikon";
import { Avatar, Kerangka, KepalaHalaman, Kosong, Lencana, Panel } from "../../components/ui";
import { getDb, parameterPeriode, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { indikatorPenugasan } from "@/lib/kpi/engine";
import { LABEL_PERAN } from "@/lib/kpi/types";

export const metadata: Metadata = { title: "Capaian K1" };

export default function Halaman(props: PageProps<"/input/k1">) {
  return (
    <>
      <KepalaHalaman
        judul="Capaian kerja · K1"
        sub="Koordinator mengisi pembilang dan penyebut per indikator beserta buktinya. Kosongkan bila belum ada data; penyebut 0 berarti tidak ada kejadian bulan ini dan indikator dikeluarkan dari rata-rata."
      />
      <Suspense fallback={<Kerangka />}>
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

  let isi = <Kosong>Pilih penugasan di daftar untuk mulai mengisi capaian K1.</Kosong>;
  if (t) {
    const pg = db.pegawai.find((p) => p.id === t.pegawaiId)!;
    const unit = db.units.find((u) => u.id === t.unitId)!;
    const terkunci = periodeTerkunci(periode);
    const katalog = indikatorPenugasan(t, db.indikator);
    const cari = (kode: string, sub?: string) =>
      db.realisasi.find((r) => r.periodeId === periode.id && r.penugasanId === t.id && r.indikatorKode === kode && r.subKode === sub);

    const baris: BarisK1[] = katalog
      .filter((i) => !i.turunan)
      .flatMap((i) =>
        (i.subTugas ?? [undefined]).map((st) => ({
          akhiran: `|${i.kode}|${st?.kode ?? ""}`,
          label: st ? `${i.kode}(${st.kode})` : i.kode,
          nama: st ? `${i.nama}: ${st.nama}` : i.nama,
          target: i.target,
          sumberData: i.sumberData,
          verifikasiKeuangan: !!i.verifikasiKeuangan,
          penyebutKecil: !!i.penyebutKecil,
          awal: cari(i.kode, st?.kode),
        })),
      );

    isi = (
      <Panel
        judul={
          <span className="flex items-center gap-3">
            <Avatar nama={pg.nama} />
            <span className="leading-tight">
              <span className="block">{pg.nama}</span>
              <span className="block text-xs font-normal text-muted">
                {LABEL_PERAN[t.peran]} · {unit.nama}
              </span>
            </span>
          </span>
        }
        aksi={terkunci && <Lencana nada="flame"><Ikon nama="kunci" className="size-3" /> Periode terkunci</Lencana>}
      >
        <FormK1
          key={t.id}
          periodeId={periode.id}
          penugasanId={t.id}
          baris={baris}
          turunan={katalog.filter((i) => i.turunan).map((i) => ({ kode: i.kode, nama: i.nama }))}
          batas={parameterPeriode(db, periode).batasSkorIndikator}
          terkunci={terkunci}
        />
      </Panel>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <DaftarPenugasan db={db} periodeId={periode.id} terpilih={t?.id} basis="/input/k1" sudah={(id) => terisi.has(id)} />
      {isi}
    </div>
  );
}
