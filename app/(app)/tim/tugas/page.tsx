import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, asc, eq, gte, inArray, isNull } from "drizzle-orm";
import { koordinatorAtauWakil, idKoordinator } from "@/lib/akses";
import { ClipboardList, Trash2 } from "lucide-react";
import { TombolAksi } from "@/components/app/tombol-aksi";
import { FormDelegasi } from "@/components/app/form-delegasi";
import { KartuUsulan, PutusanTugas } from "@/components/app/tugas";
import { Batang, JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { hapusTugasKhusus, putuskanUsulan } from "@/app/aksi/tugas";
import { getDb, schema as s } from "@/lib/db";
import { anggotaTim } from "@/lib/data/tim";
import { bebanPekanIni } from "@/lib/data/tim-koordinator";
import { unitPendek } from "@/lib/tugas-saya";
import { daftarTugas, daftarUsulan, kondisiTugasMenunggu, kondisiUsulanMenunggu, type BarisUsulan } from "@/lib/data/tugas";
import { kelompokAmanah } from "@/lib/amanah";
import { LABEL_FREKUENSI_TUGAS, LABEL_PERAN_KERJA } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, labelTanggal, periodeDari, rentangPeriode, tanggalLokal, type Kantor } from "@/lib/waktu";

export const metadata: Metadata = { title: "Delegasi" };

export default function HalamanTugasStaf() {
  return (
    <>
      <Kepala judul="Delegasi" kembali="/?segmen=tim" sub="Tugas sekali untuk staf, dengan tenggat tanggal dan jam. Selesai tepat waktu menambah K1 staf; pemeriksaan ada di Verifikasi." />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const today = hariIni(sesi.kantor);
  // Tugas khusus hanya untuk penugasan yang saya koordinasikan (bukan yang sekadar saya nilai K3-nya).
  // Satu pilihan per amanah: staf yang rangkap SKUO di bidang yang sama cukup tampil sekali (K1-nya pun gabungan).
  const tim = await anggotaTim(sesi);
  const staf = tim.flatMap((t) => {
    const amanah = kelompokAmanah(t.penugasan.filter((p) => (p.peranKerja === "SBK" || p.peranKerja === "SK") && koordinatorAtauWakil(sesi, p.koordinatorId)));
    return amanah.map((g) => ({ id: g[0].id, pegawaiId: t.pegawaiId, label: amanah.length > 1 ? `${t.nama} · ${LABEL_PERAN_KERJA[g[0].peranKerja]} ${g.map((p) => p.unitNama).join(", ")}` : t.nama }));
  });
  // Beban lintas unit: jumlah tugas staf pekan ini dari semua unit (docs/rombak-v2/01 Rangkap jabatan).
  const beban = await bebanPekanIni([...new Set(staf.map((x) => x.pegawaiId))], sesi.kantor);
  const unitSaya = new Set(sesi.penugasan.filter((p) => p.peranKerja === "KSBK").map((p) => p.unitNama));
  const db = await getDb();
  const [menunggu, usulan, induk] = await Promise.all([
    daftarTugas(kondisiTugasMenunggu(idKoordinator(sesi))),
    // Usulan tugas rutin (ke Set Tugas) diputuskan di /tim/usulan.
    daftarUsulan(and(kondisiUsulanMenunggu(idKoordinator(sesi)), isNull(s.usulanTugas.setTugasId))),
    db
      .select({ t: s.tugasKhusus, staf: s.pegawai.nama })
      .from(s.tugasKhusus)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.tugasKhusus.penugasanId))
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(and(eq(s.tugasKhusus.dibuatOleh, sesi.pegawaiId), gte(s.tugasKhusus.tanggalAkhir, rentangPeriode(periodeDari(today)).awal)))
      .orderBy(asc(s.tugasKhusus.tanggalAkhir)),
  ]);
  const jadwal = induk.length
    ? await db.select({ tugasId: s.tugasKhususJadwal.tugasId, status: s.tugasKhususJadwal.status, persen: s.tugasKhususJadwal.persen }).from(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.tugasId, induk.map((x) => x.t.id)))
    : [];

  // Usulan yang dikirim sekaligus diputuskan bersama.
  const kelompok = [...new Set(usulan.map((u) => u.kelompok))].map((k) => usulan.filter((u) => u.kelompok === k));

  if (!staf.length && !induk.length && !menunggu.length && !usulan.length) return <Kosong ikon={ClipboardList} judul="Tidak ada SBK atau Staf Khusus di tim Anda" />;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="order-2 space-y-5 lg:order-1">
        {usulan.length > 0 && (
          <section>
            <JudulBagian>Usulan dari Staf Khusus · {usulan.length}</JudulBagian>
            <ul className="space-y-4">
              {kelompok.map((k) => (
                <li key={k[0].kelompok}>
                  <KelompokUsulan usulan={k} kantor={sesi.kantor} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {menunggu.length > 0 && (
          <Link href="/tim/verifikasi?jenis=Delegasi" className="flex min-h-12 items-center justify-between rounded-2xl border border-primary/40 bg-primary/8 px-4 text-sm font-semibold text-heading">
            {menunggu.length} tugas menunggu diperiksa <span className="text-primary">Periksa ›</span>
          </Link>
        )}
        <section>
          <JudulBagian>Sudah diberikan</JudulBagian>
          {induk.length ? (
            <ul className="space-y-2">
              {induk.map(({ t, staf: nama }) => {
                const js = jadwal.filter((j) => j.tugasId === t.id);
                const selesai = js.filter((j) => j.status === "disetujui").length;
                const satu = t.frekuensi === "sekali" ? js[0] : undefined;
                return (
                  <li key={t.id} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-heading">{t.judul}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nama} · {LABEL_FREKUENSI_TUGAS[t.frekuensi]} · {t.frekuensi === "sekali" ? `tenggat ${labelTanggal(t.tanggalMulai)}` : `${labelTanggal(t.tanggalMulai)}–${labelTanggal(t.tanggalAkhir)}`} pukul {t.jamTenggat}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Batang nilai={satu ? satu.persen : js.length ? (selesai / js.length) * 100 : 0} className="flex-1" nada={selesai === js.length && js.length ? "mint" : "brand"} />
                        <Lencana nada={selesai === js.length && js.length ? "mint" : "netral"}>{satu ? (satu.status === "disetujui" ? "Selesai" : `${satu.persen}%`) : `${selesai}/${js.length} selesai`}</Lencana>
                      </div>
                    </div>
                    <TombolAksi
                      aksi={hapusTugasKhusus.bind(null, t.id)}
                      konfirmasi="Hapus tugas ini? Jadwal yang sudah disetujui tetap tercatat."
                      varian="ghost"
                      ukuran="icon"
                      label="Hapus tugas"
                    >
                      <Trash2 className="size-4" />
                    </TombolAksi>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Kosong ikon={ClipboardList} judul="Belum ada tugas bulan ini" />
          )}
        </section>
      </div>

      {staf.length > 0 && (
        <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
          <h2 className="mb-3 text-[15px] font-semibold text-heading">Tugas baru</h2>
          <FormDelegasi
            hariIni={today}
            staf={staf.map((x) => {
              const b = beban.get(x.pegawaiId);
              return { penugasanId: x.id, nama: x.label, beban: b?.n ?? 0, unitLain: [...(b?.unit ?? [])].filter((u) => !unitSaya.has(u)).map((u) => unitPendek(u).split(" ")[0]) };
            })}
          />
        </Kartu>
      )}
    </div>
  );
}

/** Satu kiriman usulan: bila lebih dari satu, bisa disetujui atau ditolak sekaligus. */
function KelompokUsulan({ usulan, kantor }: { usulan: BarisUsulan[]; kantor: Kantor }) {
  const u = usulan[0];
  if (usulan.length === 1) return <KartuUsulan usulan={u} sebagai="atasan" tampilStaf />;
  return (
    <Kartu className="space-y-3 p-3.5">
      <div>
        <p className="text-[15px] font-semibold text-heading">
          {u.stafNama} mengusulkan {usulan.length} tugas
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {u.unitNama} · dikirim {labelTanggal(tanggalLokal(u.dibuatPada, kantor))}
        </p>
      </div>
      <PutusanTugas ids={usulan.map((x) => x.id)} aksi={putuskanUsulan} labelSetuju={`Setujui semua (${usulan.length})`} labelTolak="Tolak semua" />
      <ul className="space-y-2 border-t border-border pt-3">
        {usulan.map((x) => (
          <li key={x.id}>
            <KartuUsulan usulan={x} sebagai="atasan" />
          </li>
        ))}
      </ul>
    </Kartu>
  );
}
