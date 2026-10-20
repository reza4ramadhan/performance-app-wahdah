import type { Metadata } from "next";
import { Suspense } from "react";
import { DaftarPenugasan } from "../../components/daftar-penugasan";
import { FormK3 } from "../../components/form-k3";
import { Ikon } from "../../components/ikon";
import { Avatar, Kerangka, KepalaHalaman, Kosong, Lencana, Panel } from "../../components/ui";
import { getDb, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { LABEL_PERAN } from "@/lib/kpi/types";

export const metadata: Metadata = { title: "Perilaku K3" };

export default function Halaman(props: PageProps<"/input/k3">) {
  return (
    <>
      <KepalaHalaman
        judul="Perilaku · K3"
        sub="Koordinator memberi skor 1–5 untuk enam nilai. Skor 1, 2, dan 5 wajib disertai contoh perilaku. Pengembangan diri dihitung paling tinggi 2 bila pegawai belum mengunggah log."
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
  const dinilai = new Set(db.skorK3.filter((s) => s.periodeId === periode.id).map((s) => s.penugasanId));

  let isi = <Kosong>Pilih penugasan di daftar untuk mulai menilai.</Kosong>;
  if (t) {
    const nama = new Map(db.pegawai.map((p) => [p.id, p.nama]));
    const unit = db.units.find((u) => u.id === t.unitId)!;
    const awal = db.skorK3.find((s) => s.periodeId === periode.id && s.penugasanId === t.id);
    const adaLog = db.logPengembanganDiri.some((l) => l.periodeId === periode.id && l.pegawaiId === t.pegawaiId);
    const terkunci = periodeTerkunci(periode);

    isi = (
      <Panel
        judul={
          <span className="flex items-center gap-3">
            <Avatar nama={nama.get(t.pegawaiId)!} />
            <span className="leading-tight">
              <span className="block">{nama.get(t.pegawaiId)}</span>
              <span className="block text-xs font-normal text-muted">
                {LABEL_PERAN[t.peran]} · {unit.nama}
              </span>
            </span>
          </span>
        }
      >
        <div className="-mt-1 mb-2 flex flex-wrap gap-2">
          <Lencana>Penilai: {t.penilaiId ? nama.get(t.penilaiId) : "belum dipetakan"}</Lencana>
          {adaLog ? <Lencana nada="mint">Log pengembangan diri ada</Lencana> : <Lencana nada="gold">Log pengembangan diri belum diunggah</Lencana>}
          {terkunci && (
            <Lencana nada="flame">
              <Ikon nama="kunci" className="size-3" /> Periode terkunci
            </Lencana>
          )}
        </div>
        <FormK3 key={t.id} periodeId={periode.id} penugasanId={t.id} awal={awal} adaLog={adaLog} terkunci={terkunci} />
      </Panel>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <DaftarPenugasan db={db} periodeId={periode.id} terpilih={t?.id} basis="/input/k3" sudah={(id) => dinilai.has(id)} />
      {isi}
    </div>
  );
}
