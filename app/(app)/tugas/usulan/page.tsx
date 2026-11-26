import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, gte, or } from "drizzle-orm";
import { ListPlus } from "lucide-react";
import { FormUsulanRutin } from "@/components/app/form-rutin";
import { KartuUsulan } from "@/components/app/tugas";
import { JudulBagian, Kartu, Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { setBerlaku } from "@/lib/set-tugas";
import { daftarUsulan, kondisiUsulanPenugasan } from "@/lib/data/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, tambahHari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Usulan tugas" };

export default function HalamanUsulanTugas() {
  return (
    <>
      <Kepala judul="Usulkan tugas rutin" kembali="/" />
      <Suspense fallback={<Kerangka />}>
        <Isi />
      </Suspense>
    </>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const pn = sesi.penugasan.find((p) => p.peranKerja === "SK") ?? null;
  if (!pn)
    return (
      <Kosong ikon={ListPlus} judul="Khusus staf tugas rutin">
        Usulan tugas rutin untuk staf unit tugas rutin (N–R).
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
  const db = await getDb();
  const [set, item, pasang, ko] = await Promise.all([
    db.select().from(s.setTugas).where(and(eq(s.setTugas.unitId, pn.unitId), eq(s.setTugas.aktif, true))).orderBy(s.setTugas.nama),
    db.select({ setTugasId: s.setTugasItem.setTugasId }).from(s.setTugasItem).where(eq(s.setTugasItem.aktif, true)),
    db.select().from(s.setTugasStaf).where(eq(s.setTugasStaf.penugasanId, pn.id)),
    db.select({ nama: s.pegawai.nama }).from(s.pegawai).where(eq(s.pegawai.id, pn.koordinatorId)),
  ]);
  const aktif = setBerlaku(pasang, today);
  const usulan = await daftarUsulan(
    and(kondisiUsulanPenugasan([pn.id]), or(eq(s.usulanTugas.status, "diajukan"), gte(s.usulanTugas.diputusPada, keUtc(tambahHari(today, -30), sesi.kantor)))),
  );
  const menunggu = usulan.filter((u) => u.status === "diajukan");
  const diputus = usulan.filter((u) => u.status !== "diajukan");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Kartu className="lg:sticky lg:top-8 lg:order-2">
        {set.length ? (
          <FormUsulanRutin penugasanId={pn.id} koordinator={ko[0]?.nama ?? "koordinator"} set={set.map((x) => ({ id: x.id, nama: x.nama, n: item.filter((i) => i.setTugasId === x.id).length, aktif: x.id === aktif }))} />
        ) : (
          <p className="text-sm text-muted-foreground">Unit Anda belum punya set tugas. Koordinator membuatnya lebih dulu.</p>
        )}
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
