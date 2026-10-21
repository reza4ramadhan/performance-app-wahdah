import type { Metadata } from "next";
import { Suspense } from "react";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Lightbulb } from "lucide-react";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan, kelasTeks } from "@/components/app/kolom";
import { Kartu, Kepala, Kerangka, Kosong, Lencana, type Nada } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { ajukanK4 } from "@/app/aksi/k4";
import { getDb, schema as s } from "@/lib/db";
import { periodeK4Terbuka } from "@/lib/data/k4";
import { POIN_K4, type StatusK4 } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { labelPeriode } from "@/lib/waktu";

export const metadata: Metadata = { title: "Inovasi K4" };

const STATUS: Record<StatusK4, { label: string; nada: Nada }> = {
  diajukan: { label: "Diperiksa atasan", nada: "gold" },
  diperiksa: { label: "Menunggu penetapan WaKa", nada: "gold" },
  ditetapkan: { label: "Ditetapkan", nada: "brand" },
  disahkan: { label: "Disahkan", nada: "mint" },
  ditolak: { label: "Ditolak", nada: "flame" },
};

export default function HalamanK4() {
  return (
    <>
      <Kepala judul="Inovasi Plus (K4)" sub="Poin tambahan 0–25 per bulan. Tingkat I = 5, II = 10, III = 15/20, IV = 25. Naik tingkat hanya menambah selisih." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [periode, milik, rekan] = await Promise.all([
    periodeK4Terbuka(sesi.kantor),
    db
      .select({ k: s.k4Pengajuan })
      .from(s.k4Pengajuan)
      .innerJoin(s.k4Pengusul, eq(s.k4Pengusul.k4Id, s.k4Pengajuan.id))
      .where(eq(s.k4Pengusul.pegawaiId, sesi.pegawaiId))
      .orderBy(desc(s.k4Pengajuan.dibuatPada)),
    db.select({ id: s.pegawai.id, nama: s.pegawai.nama }).from(s.pegawai).where(and(eq(s.pegawai.aktif, true), ne(s.pegawai.id, sesi.pegawaiId))).orderBy(s.pegawai.nama),
  ]);
  const ids = milik.map((m) => m.k.id);
  const pengusul = ids.length
    ? await db.select({ k4Id: s.k4Pengusul.k4Id, nama: s.pegawai.nama }).from(s.k4Pengusul).innerJoin(s.pegawai, eq(s.pegawai.id, s.k4Pengusul.pegawaiId)).where(inArray(s.k4Pengusul.k4Id, ids))
    : [];
  const bisaNaik = milik.filter((m) => m.k.status === "ditetapkan" || m.k.status === "disahkan");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="order-2 space-y-2 lg:order-1">
        {milik.length ? (
          milik.map(({ k }) => (
            <Kartu key={k.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-heading">{k.judul}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelPeriode(k.periodeId)} · usul tingkat {k.tingkatUsulan}
                    {k.tingkatDitetapkan && ` · ditetapkan ${k.tingkatDitetapkan} (${k.poin} poin)`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Pengusul: {pengusul.filter((p) => p.k4Id === k.id).map((p) => p.nama).join(", ")}</p>
                  {k.catatan && <p className="mt-1 text-sm text-foreground/80">“{k.catatan}”</p>}
                </div>
                <Lencana nada={STATUS[k.status].nada}>{STATUS[k.status].label}</Lencana>
              </div>
            </Kartu>
          ))
        ) : (
          <Kosong ikon={Lightbulb} judul="Belum ada pengajuan">
            Ajukan inovasi yang sudah berjalan dan punya bukti, paling lambat 5 hari kerja setelah bulan berakhir.
          </Kosong>
        )}
      </section>

      <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
        <h2 className="text-[15px] font-semibold text-heading">Ajukan inovasi</h2>
        <FormAksi aksi={ajukanK4} tombol="Ajukan" tombolPenuh className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Periode</span>
            <select name="periodeId" className={kelasPilihan} defaultValue={periode.at(-1)}>
              {periode.map((p) => (
                <option key={p} value={p}>
                  {labelPeriode(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Judul inovasi</span>
            <Input name="judul" required placeholder="mis. Template laporan bidang otomatis" />
            <Galat nama="judul" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Uraian singkat</span>
            <textarea name="uraian" rows={3} className={kelasTeks} placeholder="Masalah apa yang diselesaikan dan dampaknya" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Tingkat yang diusulkan</span>
            <select name="tingkatUsulan" className={kelasPilihan} defaultValue="I" required>
              {Object.entries(POIN_K4).map(([t, p]) => (
                <option key={t} value={t}>
                  Tingkat {t} · {p.join("/")} poin
                </option>
              ))}
            </select>
            <Galat nama="tingkatUsulan" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Link bukti</span>
            <Input name="linkBukti" type="url" inputMode="url" required placeholder="https://…" />
            <Galat nama="linkBukti" />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-heading">Rekan pengusul (maks. 2)</legend>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <select key={i} name="rekan" className={kelasPilihan} defaultValue="" aria-label={`Rekan ${i + 1}`}>
                  <option value="">—</option>
                  {rekan.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
              ))}
            </div>
            <Galat nama="rekan" />
          </fieldset>
          {bisaNaik.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Naik tingkat dari inovasi sebelumnya?</span>
              <select name="inovasiIndukId" className={kelasPilihan} defaultValue="">
                <option value="">Tidak, inovasi baru</option>
                {bisaNaik.map(({ k }) => (
                  <option key={k.id} value={k.id}>
                    {k.judul} (tingkat {k.tingkatDitetapkan})
                  </option>
                ))}
              </select>
            </label>
          )}
        </FormAksi>
      </Kartu>
    </div>
  );
}
