import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Scale } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { KembalikanK3 } from "@/components/app/kembalikan-k3";
import { Batang, JudulBagian, Kartu, Kepala, Kerangka, Kosong, Lencana } from "@/components/app/ui";
import { punya } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { hitungK3 } from "@/lib/ikp/hitung";
import { rataRata } from "@/lib/ikp/k1";
import { LABEL_NILAI_K3, NILAI_K3 } from "@/lib/ikp/tipe";
import { angka, kelompokkan } from "@/lib/format";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, labelPeriode, periodeBerikut, periodeDari } from "@/lib/waktu";

export const metadata: Metadata = { title: "Kalibrasi K3" };

export default function HalamanKalibrasi(props: PageProps<"/kantor/kalibrasi">) {
  return (
    <>
      <Kepala judul="Kalibrasi K3" kembali="/kantor" sub="Bandingkan sebaran skor antar penilai. Penilai yang murah hati langsung menaikkan IKP, jadi skor 5 perlu contoh yang meyakinkan." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("waka", "kepala", "sekretariat");
  const sp = await searchParams;
  const kini = periodeDari(hariIni(sesi.kantor));
  const pilihan = [periodeBerikut(kini, -2), periodeBerikut(kini, -1), kini];
  const periode = pilihan.includes(String(sp.periode)) ? String(sp.periode) : periodeBerikut(kini, -1);
  const db = await getDb();
  const penilai = alias(s.pegawai, "penilai");
  const rows = await db
    .select({ k: s.penilaianK3, pegawai: s.pegawai.nama, penilai: penilai.nama, pegawaiId: s.penugasan.pegawaiId })
    .from(s.penilaianK3)
    .innerJoin(s.penugasan, eq(s.penugasan.id, s.penilaianK3.penugasanId))
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(penilai, eq(penilai.id, s.penilaianK3.penilaiId))
    .where(and(eq(s.penilaianK3.periodeId, periode), inArray(s.penilaianK3.status, ["dikirim", "dikembalikan", "draf"])));
  const bisaKembalikan = punya(sesi, "waka", "kepala");

  const dikirim = rows.filter((r) => r.k.status === "dikirim");
  const perPenilai = [...kelompokkan(dikirim, (r) => r.penilai)].map(([nama, xs]) => {
    const semua = xs.flatMap((x) => NILAI_K3.map((n) => x.k.skor[n]));
    return {
      nama,
      jumlah: xs.length,
      rata: rataRata(xs.map((x) => hitungK3(x.k.skor, true).k3)),
      sebaran: [1, 2, 3, 4, 5].map((v) => semua.filter((x) => x === v).length / (semua.length || 1)),
    };
  });
  const rataKantor = rataRata(dikirim.map((x) => hitungK3(x.k.skor, true).k3));
  const skorLima = dikirim.filter((r) => NILAI_K3.some((n) => r.k.skor[n] === 5));
  const draf = rows.filter((r) => r.k.status === "draf").length;
  const kembali = rows.filter((r) => r.k.status === "dikembalikan").length;

  return (
    <>
      <ChipFilter pilihan={pilihan.map((p) => ({ nilai: p, label: labelPeriode(p) }))} aktif={periode} href={(v) => `/kantor/kalibrasi?periode=${v}`} />
      {!rows.length ? (
        <Kosong ikon={Scale} judul={`Belum ada penilaian K3 ${labelPeriode(periode)}`} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <Kartu>
            <JudulBagian aksi={<span className="text-sm text-muted-foreground">rata-rata kantor {angka(rataKantor)}</span>}>Sebaran per penilai</JudulBagian>
            <ul className="space-y-4">
              {perPenilai.map((p) => (
                <li key={p.nama}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-heading">{p.nama}</span>
                    <span className="tabular-nums">
                      {p.jumlah} dinilai · <strong>{angka(p.rata)}</strong>
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-5 gap-1 text-center text-[11px] text-muted-foreground">
                    {p.sebaran.map((v, i) => (
                      <div key={i}>
                        <Batang nilai={v * 100} nada={i === 4 ? "gold" : i < 2 ? "flame" : "brand"} />
                        <span>
                          {i + 1}: {Math.round(v * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {draf} draf belum dikirim · {kembali} dikembalikan ke penilai.
            </p>
          </Kartu>

          <Kartu>
            <JudulBagian>Skor 5 dan contohnya ({skorLima.length})</JudulBagian>
            {skorLima.length ? (
              <ul className="divide-y divide-border">
                {skorLima.map((r) => (
                  <li key={r.k.id} className="py-3 first:pt-0">
                    <p className="text-sm">
                      <strong className="text-heading">{r.pegawai}</strong> <span className="text-muted-foreground">oleh {r.penilai}</span>
                    </p>
                    {NILAI_K3.filter((n) => r.k.skor[n] === 5).map((n) => (
                      <p key={n} className="mt-1 text-sm">
                        <Lencana nada="gold">{LABEL_NILAI_K3[n]}</Lencana> {r.k.contoh[n] ?? <em className="text-flame-600">tanpa contoh</em>}
                      </p>
                    ))}
                    {bisaKembalikan && r.pegawaiId !== sesi.pegawaiId && (
                      <div className="mt-2 flex">
                        <KembalikanK3 id={r.k.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada skor 5 bulan ini.</p>
            )}
          </Kartu>
        </div>
      )}
    </>
  );
}
