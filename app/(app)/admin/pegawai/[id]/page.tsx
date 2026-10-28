import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { PilihCari } from "@/components/app/pilih-cari";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { bukaKunciEdit, buatAkunPegawai, resetPasswordForm, ubahPegawai } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { LABEL_PERAN_KERJA, LABEL_PERAN_SISTEM, OPSI_KANTOR, OPSI_STATUS_KEPEGAWAIAN, PERAN_MANUAL } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelTanggal, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Ubah pegawai" };

export default function HalamanUbahPegawai(props: PageProps<"/admin/pegawai/[id]">) {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi params={props.params} />
    </Suspense>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1.5 block text-sm font-medium text-heading">{children}</span>;

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const [[pg], peran, akun, penugasan, buka] = await Promise.all([
    db.select().from(s.pegawai).where(eq(s.pegawai.id, id)),
    db.select().from(s.peranSistem).where(eq(s.peranSistem.pegawaiId, id)),
    db.select({ username: s.user.displayUsername, harusGanti: s.user.harusGantiPassword }).from(s.user).where(eq(s.user.pegawaiId, id)),
    db.select({ pn: s.penugasan, unit: s.unit.nama }).from(s.penugasan).innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId)).where(eq(s.penugasan.pegawaiId, id)),
    db.select().from(s.bukaKunci).where(eq(s.bukaKunci.pegawaiId, id)).orderBy(desc(s.bukaKunci.dibuatPada)).limit(5),
  ]);
  if (!pg) notFound();
  const punya = new Set(peran.map((p) => p.peran));

  return (
    <>
      <Kepala judul={pg.nama} kembali="/admin/pegawai" sub={akun[0] ? `Login: ${akun[0].username}${akun[0].harusGanti ? " · belum mengganti password awal" : ""}` : "Belum punya akun"} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Kartu>
          <h2 className="text-[15px] font-semibold text-heading">Data & peran</h2>
          <FormAksi aksi={ubahPegawai.bind(null, id)} tombol="Simpan" className="mt-3 space-y-3">
            <label className="block">
              <Label>Nama lengkap</Label>
              <Input name="nama" defaultValue={pg.nama} required />
              <Galat nama="nama" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Label>NIP</Label>
                <Input name="nip" defaultValue={pg.nip ?? ""} />
              </label>
              <label className="block">
                <Label>No. HP</Label>
                <Input name="noHp" defaultValue={pg.noHp ?? ""} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Label>Status</Label>
                <PilihCari name="statusKepegawaian" opsi={OPSI_STATUS_KEPEGAWAIAN} nilaiAwal={pg.statusKepegawaian} kosong={null} required />
              </label>
              <label className="block">
                <Label>Kantor</Label>
                <PilihCari name="kantor" opsi={OPSI_KANTOR} nilaiAwal={pg.kantor} kosong={null} required />
              </label>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-heading">Peran fungsi</legend>
              <p className="mb-1.5 text-xs text-muted-foreground">Koordinator, Wakil Kepala Kantor, dan Kepala Kantor otomatis mengikuti Penugasan.</p>
              <div className="grid grid-cols-2 gap-x-3">
                {PERAN_MANUAL.map((p) => (
                  <label key={p} className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox name="peran" value={p} defaultChecked={punya.has(p)} className="size-5" /> {LABEL_PERAN_SISTEM[p]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <Checkbox name="aktif" defaultChecked={pg.aktif} className="size-5" /> Aktif (nonaktif = tidak bisa login & tidak dinilai)
            </label>
          </FormAksi>
        </Kartu>

        <div className="space-y-4">
          <Kartu>
            <h2 className="text-[15px] font-semibold text-heading">Penugasan</h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {penugasan.map(({ pn, unit }) => (
                <li key={pn.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {LABEL_PERAN_KERJA[pn.peranKerja]} · {unit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pn.periodeMulai}–{pn.periodeSelesai ?? "sekarang"}
                  </span>
                </li>
              ))}
              {!penugasan.length && <li className="py-2 text-muted-foreground">Belum ada. Tambahkan di menu Penugasan.</li>}
            </ul>
          </Kartu>

          {akun[0] && id !== sesi.pegawaiId && (
            <Kartu>
              <h2 className="text-[15px] font-semibold text-heading">Reset password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Membuat password sementara dan mengeluarkan semua sesi. Sampaikan langsung ke pegawai.</p>
              <FormAksi aksi={resetPasswordForm.bind(null, id)} tombol="Buat password sementara" varian="outline" pesanTetap toastBerhasil={false} konfirmasi={`Reset password ${pg.nama}?`} />
            </Kartu>
          )}

          {!akun[0] && (
            <Kartu>
              <h2 className="text-[15px] font-semibold text-heading">Buat akun</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {pg.nip || pg.noHp
                  ? `Login memakai ${pg.nip ? "NIP" : "No. HP"} ${pg.nip ?? pg.noHp} dengan password sementara. Sampaikan langsung ke pegawai.`
                  : "Isi NIP atau No. HP lalu simpan dulu untuk membuat akun login."}
              </p>
              {(pg.nip || pg.noHp) && (
                <FormAksi aksi={buatAkunPegawai.bind(null, id)} tombol="Buat akun" varian="outline" pesanTetap toastBerhasil={false} konfirmasi={`Buat akun login untuk ${pg.nama}?`} />
              )}
            </Kartu>
          )}

          <Kartu>
            <h2 className="text-[15px] font-semibold text-heading">Buka kunci isian</h2>
            <p className="mt-1 text-sm text-muted-foreground">Izinkan mengisi/mengubah log lebih dari 2 hari kerja ke belakang. Alasan tercatat di log audit.</p>
            <FormAksi aksi={bukaKunciEdit.bind(null, id)} tombol="Buka kunci" varian="outline" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <Label>Boleh mengisi sejak</Label>
                  <Input name="dariTanggal" type="date" max={hariIni(pg.kantor as "makassar" | "jakarta")} required />
                  <Galat nama="dariTanggal" />
                </label>
                <label className="block">
                  <Label>Berlaku (hari)</Label>
                  <Input name="hari" type="number" min={1} max={14} defaultValue={3} required />
                </label>
              </div>
              <label className="block">
                <Label>Alasan</Label>
                <Input name="alasan" required placeholder="mis. Sakit 3 hari, belum sempat mengisi" />
                <Galat nama="alasan" />
              </label>
            </FormAksi>
            {buka.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {buka.map((b) => (
                  <li key={b.id}>
                    Sejak {labelTanggal(b.dariTanggal)} s.d. {labelTanggal(tanggalLokal(b.berlakuSampai, "makassar"))}: {b.alasan}{" "}
                    {b.berlakuSampai > new Date() ? <Lencana nada="mint">aktif</Lencana> : null}
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>
      </div>
    </>
  );
}
