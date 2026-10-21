import type { Metadata } from "next";
import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { Archive } from "lucide-react";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasTeks } from "@/components/app/kolom";
import { Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { simpanUjiPetik } from "@/app/aksi/tim";
import { getDb, schema as s } from "@/lib/db";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Uji petik arsip" };

export default function HalamanUjiPetik() {
  return (
    <>
      <Kepala judul="Uji petik arsip" kembali="/tim" sub="KSBK-1e: periksa minimal 10 dokumen arsip bidang setiap bulan. Hitung yang lengkap dan sesuai indeks." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const unit = sesi.penugasan.filter((p) => p.peranKerja === "KSBK");
  if (!unit.length) return <Kosong ikon={Archive} judul="Khusus KSBK" />;
  const kini = periodeDari(hariIni(sesi.kantor));
  const db = await getDb();
  const periodeDiisi = [periodeBerikut(kini, -1), kini];
  const rows = await db.select().from(s.ujiPetikArsip).where(inArray(s.ujiPetikArsip.periodeId, periodeDiisi));

  return (
    <div className="space-y-4">
      {unit.map((u) =>
        periodeDiisi.map((periode) => {
          const ada = rows.find((r) => r.unitId === u.unitId && r.periodeId === periode);
          return (
            <Kartu key={u.unitId + periode}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-heading">
                  {u.unitNama} · {labelPeriode(periode)}
                </h2>
                {ada ? <Lencana nada="mint">{ada.jumlahSesuai}/{ada.jumlahDiuji} sesuai</Lencana> : <Lencana>Belum diisi</Lencana>}
              </div>
              <FormAksi aksi={simpanUjiPetik} tombol={ada ? "Perbarui" : "Simpan"} className="mt-3 space-y-3">
                <input type="hidden" name="unitId" value={u.unitId} />
                <input type="hidden" name="periodeId" value={periode} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-heading">Dokumen diuji</span>
                    <Input name="jumlahDiuji" type="number" inputMode="numeric" min={10} defaultValue={ada?.jumlahDiuji ?? 10} required />
                    <Galat nama="jumlahDiuji" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-heading">Lengkap & sesuai indeks</span>
                    <Input name="jumlahSesuai" type="number" inputMode="numeric" min={0} defaultValue={ada?.jumlahSesuai} required />
                    <Galat nama="jumlahSesuai" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-heading">Catatan</span>
                  <textarea name="catatan" rows={2} className={kelasTeks} defaultValue={ada?.catatan ?? ""} placeholder="Temuan, mis. 2 notulensi belum diberi nomor indeks" />
                </label>
              </FormAksi>
            </Kartu>
          );
        }),
      )}
    </div>
  );
}
