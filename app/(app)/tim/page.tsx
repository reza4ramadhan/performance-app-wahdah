import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { AlarmClock, BadgeCheck, UserRoundX, Users } from "lucide-react";
import { KartuItem } from "@/components/app/baris-item";
import { IKON_MENU } from "@/components/app/ikon-menu";
import { Avatar, BarisTautan, JudulBagian, Kartu, Kepala, Kerangka, Statistik } from "@/components/app/ui";
import { schema as s } from "@/lib/db";
import { kondisiAntrean } from "@/lib/data/antrean";
import { daftarItem } from "@/lib/data/item";
import { anggotaTim } from "@/lib/data/tim";
import { menuUntuk } from "@/lib/menu";
import { wajibSesi } from "@/lib/sesi";
import { labelTanggalPanjang, hariIni } from "@/lib/waktu";

export const metadata: Metadata = { title: "Tim" };

export default function HalamanTim() {
  return (
    <Suspense fallback={<Kerangka />}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const sesi = await wajibSesi();
  const { grup, kelola, labelKelola } = menuUntuk(sesi);
  if (!kelola) redirect("/");
  const [tim, antrean] = await Promise.all([anggotaTim(sesi.pegawaiId, sesi.kantor), daftarItem(await kondisiAntrean(sesi), { kantor: sesi.kantor, batas: 300 })]);
  const pnTim = tim.flatMap((t) => t.penugasan.map((p) => p.id));
  const lewat = pnTim.length ? (await daftarItem(inArray(s.item.penugasanId, pnTim), { kantor: sesi.kantor, batas: 400 })).filter((i) => i.lewat) : [];
  const belum = tim.filter((t) => !t.isiHariIni);

  return (
    <>
      <Kepala judul={labelKelola === "Tim" ? "Tim hari ini" : "Kelola"} sub={labelTanggalPanjang(hariIni(sesi.kantor))} />
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-5">
          {tim.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Statistik ikon={UserRoundX} nada="gold" label="Belum mengisi" nilai={`${belum.length}/${tim.length}`} />
                <Statistik ikon={BadgeCheck} nada="brand" label="Menunggu" nilai={antrean.length} href="/verifikasi" />
                <Statistik ikon={AlarmClock} nada="flame" label="Lewat tenggat" nilai={lewat.length} />
              </div>

              <Kartu>
                <JudulBagian>Belum mengisi hari ini</JudulBagian>
                {belum.length ? (
                  <ul className="divide-y divide-border">
                    {belum.map((t) => (
                      <li key={t.pegawaiId} className="flex items-center gap-3 py-2.5">
                        <Avatar nama={t.nama} ukuran="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-heading">{t.nama}</span>
                          <span className="block truncate text-xs text-muted-foreground">{t.penugasan.map((p) => `${p.peranKerja} · ${p.unitNama}`).join(", ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Semua anggota tim sudah mengisi.</p>
                )}
              </Kartu>

              {lewat.length > 0 && (
                <section>
                  <JudulBagian>Item lewat tenggat</JudulBagian>
                  <ul className="space-y-2">
                    {lewat.slice(0, 10).map((i) => (
                      <li key={i.id}>
                        <KartuItem item={i} pemilik />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
          {!tim.length && antrean.length > 0 && (
            <Kartu className="p-2">
              <BarisTautan href="/verifikasi" ikon={BadgeCheck} nada="brand" judul="Verifikasi" sub={`${antrean.length} item menunggu keputusan Anda`} />
            </Kartu>
          )}
        </div>

        <aside className="space-y-4 lg:hidden">
          {grup.slice(1).map((g) => (
            <Kartu key={g.judul} className="p-2">
              <p className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.judul}</p>
              {g.item.map((m) => (
                <BarisTautan key={m.href + m.label} href={m.href} ikon={IKON_MENU[m.ikon] ?? Users} judul={m.label} />
              ))}
            </Kartu>
          ))}
        </aside>
      </div>
    </>
  );
}
