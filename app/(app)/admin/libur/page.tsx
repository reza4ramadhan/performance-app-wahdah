import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, gte } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { hapusLibur, tambahLibur } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelTanggalPanjang, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Hari libur" };

export default function HalamanLibur() {
  return (
    <>
      <Kepala judul="Hari libur" kembali="/tim" sub="Dipakai untuk menghitung hari kerja dan tenggat. Libur bisa berlaku di semua kantor atau hanya Makassar/Jakarta." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const rows = await db.select().from(s.hariLibur).where(gte(s.hariLibur.tanggal, tambahHari(hariIni(sesi.kantor), -60))).orderBy(asc(s.hariLibur.tanggal));
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Kartu className="order-2 lg:order-1">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.tanggal + (r.kantor ?? "")} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-heading">{labelTanggalPanjang(r.tanggal)}</span>
                <span className="block text-xs text-muted-foreground">{r.keterangan}</span>
              </span>
              <Lencana>{r.kantor ? (r.kantor === "makassar" ? "Makassar" : "Jakarta") : "Semua kantor"}</Lencana>
              <TombolAksi aksi={hapusLibur.bind(null, r.tanggal, r.kantor)} konfirmasi="Hapus hari libur ini?" varian="ghost" ukuran="icon" label="Hapus">
                <Trash2 className="size-4" />
              </TombolAksi>
            </li>
          ))}
          {!rows.length && <li className="py-2 text-sm text-muted-foreground">Belum ada hari libur.</li>}
        </ul>
      </Kartu>
      <Kartu className="order-1 lg:order-2">
        <h2 className="text-[15px] font-semibold text-heading">Tambah hari libur</h2>
        <FormAksi aksi={tambahLibur} tombol="Tambah" tombolPenuh className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Tanggal</span>
            <Input name="tanggal" type="date" required />
            <Galat nama="tanggal" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Keterangan</span>
            <Input name="keterangan" required placeholder="mis. Idul Adha" />
            <Galat nama="keterangan" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Berlaku di</span>
            <select name="kantor" className={kelasPilihan} defaultValue="">
              <option value="">Semua kantor</option>
              <option value="makassar">Makassar</option>
              <option value="jakarta">Jakarta</option>
            </select>
          </label>
        </FormAksi>
      </Kartu>
    </div>
  );
}
