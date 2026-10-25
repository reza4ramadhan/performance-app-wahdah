import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, gte, or } from "drizzle-orm";
import { ListPlus } from "lucide-react";
import { FormUsulanTugas, KartuUsulan } from "@/components/app/tugas";
import { JudulBagian, Kartu, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { schema as s } from "@/lib/db";
import { daftarUsulan, kondisiUsulanPenugasan } from "@/lib/data/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Usulan tugas" };

export default function HalamanUsulanTugas() {
  return (
    <>
      <Kepala
        judul="Usulan tugas"
        kembali="/tugas"
        sub="Usulkan tugas yang Anda kerjakan kepada atasan. Usulan yang disetujui otomatis masuk ke daftar tugas khusus Anda."
      />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const pn = sesi.amanah?.peranKerja === "SK" ? sesi.amanah : null;
  if (!pn)
    return (
      <Kosong ikon={ListPlus} judul="Usulan tugas untuk Staf Khusus">
        Pindah ke amanah Staf Khusus lewat profil untuk mengusulkan tugas.
      </Kosong>
    );
  if (!pn.koordinatorId || pn.koordinatorId === sesi.pegawaiId)
    return (
      <Kosong ikon={ListPlus} judul="Atasan belum ditetapkan">
        Amanah {pn.unitNama} belum punya atasan yang bisa menyetujui usulan. Hubungi Admin.
      </Kosong>
    );

  const today = hariIni(sesi.kantor);
  // Yang sudah diputuskan cukup ditampilkan 30 hari terakhir.
  const usulan = await daftarUsulan(
    and(kondisiUsulanPenugasan([pn.id]), or(eq(s.usulanTugas.status, "diajukan"), gte(s.usulanTugas.diputusPada, keUtc(tambahHari(today, -30), sesi.kantor)))),
  );
  const menunggu = usulan.filter((u) => u.status === "diajukan");
  const diputus = usulan.filter((u) => u.status !== "diajukan");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Kartu className="lg:sticky lg:top-8 lg:order-2">
        <h2 className="mb-3 text-[15px] font-semibold text-heading">Usulan baru</h2>
        <FormUsulanTugas penugasanId={pn.id} hariIni={today} />
      </Kartu>

      <div className="space-y-5 lg:order-1">
        <section>
          <JudulBagian>Menunggu persetujuan{menunggu.length ? ` · ${menunggu.length}` : ""}</JudulBagian>
          {menunggu.length ? (
            <ul className="space-y-2">
              {menunggu.map((u) => (
                <li key={u.id}>
                  <KartuUsulan usulan={u} sebagai="staf" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada usulan yang menunggu.</p>
          )}
        </section>
        {diputus.length > 0 && (
          <section>
            <JudulBagian>Sudah diputuskan</JudulBagian>
            <ul className="space-y-2">
              {diputus.map((u) => (
                <li key={u.id}>
                  <KartuUsulan usulan={u} sebagai="staf" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
