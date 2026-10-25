import type { Metadata } from "next";
import { Suspense } from "react";
import { FormMasuk, PesanDiganti } from "./form";

export const metadata: Metadata = { title: "Masuk" };

export default function HalamanMasuk() {
  return (
    <>
      <h1 className="mt-8 text-[34px] font-extrabold leading-[1.1] tracking-tight text-heading">
        Kerja tercatat,
        <br />
        <span className="text-primary">kinerja</span> terukur.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">Catat pekerjaan harian, pantau progres, dan lihat IKP bulanan Anda di satu tempat.</p>
      <div className="mt-auto pt-10">
        <Suspense fallback={null}>
          <PesanDiganti />
        </Suspense>
        <FormMasuk />
        <p className="mt-6 text-center text-xs text-muted-foreground">Lupa password? Hubungi Admin Data, Digitalisasi &amp; Monev.</p>
      </div>
    </>
  );
}
