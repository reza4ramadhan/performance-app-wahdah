// Usulan tugas rutin dari staf (docs/rombak-v2/05 KR-6): koordinator menerima dan boleh memasukkannya ke Set Tugas
// mana pun di unitnya, atau menolak dengan alasan.

import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { ListPlus } from "lucide-react";
import { PutusanUsulanRutin } from "@/components/app/set-tugas";
import { Kartu, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { idKoordinator } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { daftarUsulan, kondisiUsulanMenunggu } from "@/lib/data/tugas";
import { LABEL_HARI } from "@/lib/set-tugas";
import { wajibSesi } from "@/lib/sesi";
import { labelTanggal, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Usulan tugas dari staf" };

export default function HalamanUsulanTim() {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Usulan dari staf" kembali="/?segmen=tim" />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </div>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const db = await getDb();
  const usulan = await daftarUsulan(kondisiUsulanMenunggu(idKoordinator(sesi)));
  if (!usulan.length) return <Kosong ikon={ListPlus} judul="Tidak ada usulan yang menunggu" />;
  const ids = usulan.map((u) => u.id);
  const [rows, pn] = await Promise.all([
    db.select({ id: s.usulanTugas.id, setTugasId: s.usulanTugas.setTugasId, hari: s.usulanTugas.hari }).from(s.usulanTugas).where(inArray(s.usulanTugas.id, ids)),
    db.select({ id: s.penugasan.id, unitId: s.penugasan.unitId }).from(s.penugasan).where(inArray(s.penugasan.id, usulan.map((u) => u.penugasanId))),
  ]);
  const unitIds = [...new Set(pn.map((p) => p.unitId))];
  const set = await db.select({ id: s.setTugas.id, nama: s.setTugas.nama, unitId: s.setTugas.unitId }).from(s.setTugas).where(and(inArray(s.setTugas.unitId, unitIds), eq(s.setTugas.aktif, true))).orderBy(s.setTugas.nama);

  return (
    <div className="space-y-3">
      {usulan.map((u) => {
        const r = rows.find((x) => x.id === u.id);
        const unitId = pn.find((p) => p.id === u.penugasanId)?.unitId;
        const frek = u.frekuensi === "pekanan" ? `Sepekan sekali · ${r?.hari != null ? LABEL_HARI[r.hari] : ""}` : u.frekuensi === "harian" ? "Setiap hari kerja" : "Sekali";
        return (
          <Kartu key={u.id} className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {u.stafNama} · {labelTanggal(tanggalLokal(u.dibuatPada, sesi.kantor))}
              </p>
              <p className="text-[15px] font-semibold text-heading">{u.judul}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Frekuensi</dt>
                <dd className="font-medium">{frek}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Jam tenggat</dt>
                <dd className="font-medium">{u.jamTenggat.replace(":", ".")}</dd>
              </div>
              {u.uraian && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Alasan</dt>
                  <dd>{u.uraian}</dd>
                </div>
              )}
            </dl>
            {set.some((x) => x.unitId === unitId) ? (
              <PutusanUsulanRutin id={u.id} set={set.filter((x) => x.unitId === unitId)} awal={r?.setTugasId ?? null} />
            ) : (
              <p className="text-sm text-muted-foreground">Buat set tugas lebih dulu untuk menerima usulan ini.</p>
            )}
          </Kartu>
        );
      })}
      <p className="text-xs text-muted-foreground">Disetujui: berlaku mulai besok untuk semua staf pengguna set tugas tujuan. Tolak wajib disertai alasan.</p>
    </div>
  );
}
