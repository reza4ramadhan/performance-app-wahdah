import { Suspense } from "react";
import { simpanSkorK3 } from "../../actions";
import { AksiForm } from "../../components/aksi-form";
import { PilihPenugasan } from "../../components/pilih-penugasan";
import { JudulHalaman, Kartu, Lencana, Memuat, input, labelPeriode } from "../../components/ui";
import { getDb, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { LABEL_NILAI_K3, NILAI_K3 } from "@/lib/kpi/types";

export default function Halaman(props: PageProps<"/input/k3">) {
  return (
    <>
      <JudulHalaman
        judul="Input K3 — perilaku"
        sub="Skor 1–5 untuk 6 nilai. Skor 1, 2, dan 5 wajib disertai contoh perilaku. Pengembangan diri dibatasi 2 bila log tidak diunggah."
      />
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
  const dinilai = new Set(db.skorK3.filter((s) => s.periodeId === periode.id).map((s) => s.penugasanId));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Kartu judul={labelPeriode(periode.id)}>
        <PilihPenugasan db={db} periodeId={periode.id} terpilih={t?.id} basis="/input/k3" sudah={(id) => dinilai.has(id)} />
      </Kartu>
      {t ? <FormK3 penugasanId={t.id} /> : <Kartu><p className="py-10 text-center text-sm text-zinc-500">Pilih penugasan di daftar untuk mulai mengisi.</p></Kartu>}
    </div>
  );
}

async function FormK3({ penugasanId }: { penugasanId: string }) {
  const db = await getDb();
  const periode = periodeAktif(db);
  const t = db.penugasan.find((x) => x.id === penugasanId)!;
  const nama = new Map(db.pegawai.map((p) => [p.id, p.nama]));
  const unit = db.units.find((u) => u.id === t.unitId)!;
  const lama = db.skorK3.find((s) => s.periodeId === periode.id && s.penugasanId === t.id);
  const adaLog = db.logPengembanganDiri.some((l) => l.periodeId === periode.id && l.pegawaiId === t.pegawaiId);
  const terkunci = periodeTerkunci(periode);

  return (
    <Kartu judul={`${nama.get(t.pegawaiId)} · ${t.peran} ${unit.nama}`}>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Lencana>Penilai: {t.penilaiId ? nama.get(t.penilaiId) : "belum dipetakan"}</Lencana>
        {adaLog ? <Lencana nada="hijau">Log pengembangan diri ada</Lencana> : <Lencana nada="kuning">Log pengembangan diri belum diunggah</Lencana>}
        {terkunci && <Lencana nada="merah">Periode terkunci</Lencana>}
      </div>
      <AksiForm action={simpanSkorK3} tombol="Simpan skor K3" key={t.id}>
        <input type="hidden" name="periodeId" value={periode.id} />
        <input type="hidden" name="penugasanId" value={t.id} />
        {NILAI_K3.map((n) => (
          <div key={n} className="grid gap-2 border-t border-wi-50 py-3 sm:grid-cols-[200px_1fr] dark:border-wi-900">
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{LABEL_NILAI_K3[n]}</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <label key={v} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`skor-${n}`}
                      value={v}
                      defaultChecked={(lama?.skor[n] ?? 3) === v}
                      className="peer sr-only"
                      disabled={terkunci}
                    />
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-sm font-semibold peer-checked:border-wi-600 peer-checked:bg-wi-600 peer-checked:text-white peer-focus-visible:ring-2 dark:border-zinc-700">
                      {v}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-xs">
              Contoh perilaku (wajib untuk skor 1, 2, 5)
              <textarea name={`contoh-${n}`} defaultValue={lama?.contoh[n]} rows={2} className={input} disabled={terkunci} />
            </label>
          </div>
        ))}
      </AksiForm>
    </Kartu>
  );
}
