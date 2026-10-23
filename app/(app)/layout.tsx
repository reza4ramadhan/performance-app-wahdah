import { Suspense } from "react";
import { Cangkang } from "@/components/app/cangkang";
import { getDb } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { paramIndikator } from "@/lib/data/ikp";
import { indikatorAktif } from "@/lib/ikp/k1";
import { LABEL_PERAN_SISTEM } from "@/lib/ikp/tipe";
import { menuUntuk } from "@/lib/menu";
import { bacaSesi } from "@/lib/sesi";
import { hariIni } from "@/lib/waktu";

export default function LayoutAplikasi({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-border bg-card lg:block" />}>
        <Navigasi />
      </Suspense>
      <main className="pb-nav min-w-0 flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

async function Navigasi() {
  const sesi = await bacaSesi();
  if (!sesi || sesi.harusGantiPassword) return null;
  const db = await getDb();
  const [param, minTanggal] = await Promise.all([paramIndikator(db), tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor)]);
  const { grup, kelola, labelKelola } = menuUntuk(sesi);
  const penugasan = sesi.penugasan.map((p) => ({
    id: p.id,
    label: `${p.peranKerja} · ${p.unitNama}`,
    indikator: indikatorAktif(p.peranKerja, param)
      .filter((d) => d.tipe === "item" && d.item && !d.otomatis)
      .map((d) => ({ kode: d.kode, pendek: d.pendek, nama: d.nama })),
  }));
  const peranUtama = [...sesi.peran].filter((x) => x !== "pegawai").map((x) => LABEL_PERAN_SISTEM[x]);
  return (
    <Cangkang
      grup={grup}
      kelola={kelola}
      labelKelola={labelKelola}
      nama={sesi.nama}
      peran={peranUtama.join(", ") || sesi.penugasan[0]?.unitNama || "Pegawai"}
      penugasan={penugasan.filter((p) => p.indikator.length)}
      hariIni={hariIni(sesi.kantor)}
      minTanggal={minTanggal}
    />
  );
}
