// Verifikasi koordinator (docs/rombak-v2/04 butir 1.4, mockup Kor-2): item staf + delegasi yang menunggu,
// saring per jenis, Setujui semua yang tepat waktu, dan SPB pending dana yang menunggu konfirmasi tanggal cair.

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { CircleCheck } from "lucide-react";
import { BarisPeriksa, SetujuiSemua, type BarisVerifikasi } from "@/components/app/daftar-verifikasi";
import { KonfirmasiDanaCair } from "@/components/app/pending-spb";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { schema as s } from "@/lib/db";
import { daftarItem } from "@/lib/data/item";
import { kontrolStaf, tepatWaktuItem } from "@/lib/data/kontrol-staf";
import { aksiItem } from "@/lib/data/tugas-saya";
import { wajibSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { hariKerjaAntara, labelTanggal, tanggalLokal } from "@/lib/waktu";

export const metadata: Metadata = { title: "Verifikasi" };

export default function HalamanVerifikasiTim(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-xl">
      <Kepala judul="Verifikasi" kembali="/?segmen=tim" />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const nama = (n: string) => n.split(" ").find((x) => x.length > 3 && !/^muh/i.test(x)) ?? n.split(" ")[0];

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const k = await kontrolStaf(sesi);
  const pending = await daftarItem(
    and(inArray(s.item.penugasanId, sesi.tim.map((b) => b.id).concat("-")), eq(s.item.indikatorKode, "SBK-2b"), inArray(s.item.status, ["terbuka", "ditolak"]), isNotNull(s.item.pendingDanaSejak), isNull(s.item.danaCairPada)),
    { kantor: sesi.kantor, batas: 100 },
  );

  const baris: (BarisVerifikasi & { kunci: string })[] = [
    ...k.antrean
      .filter((i) => i.pemilikId !== sesi.pegawaiId || sesi.tim.some((b) => b.id === i.penugasanId))
      .map((i) => {
        const tepat = tepatWaktuItem(i, sesi);
        const telat = tepat === false && i.tenggat && i.tglSelesai ? Math.max(1, hariKerjaAntara(i.tenggat, tanggalLokal(i.tglSelesai, sesi.kantor), k.libur)) : 0;
        return {
          kunci: i.indikatorPendek,
          jenis: "item" as const,
          id: i.id,
          judul: aksiItem(i),
          ket: [i.kegiatanNama, nama(i.pemilikNama)].filter(Boolean).join(" · "),
          linkBukti: i.linkBukti,
          tepat,
          label: tepat === false ? `Terlambat ${telat} hari kerja` : tepat ? "Tepat waktu" : `Selesai ${i.tglSelesai ? labelTanggal(tanggalLokal(i.tglSelesai, sesi.kantor)) : "—"}`,
          href: `/item/${i.id}`,
        };
      }),
    ...k.tugasMenunggu.map((t) => {
      const tepat = t.selesaiPada ? t.selesaiPada <= t.tenggat : null;
      return {
        kunci: "Delegasi",
        jenis: "tugas" as const,
        id: t.id,
        judul: t.judul,
        ket: `Delegasi · ${nama(t.stafNama)}`,
        linkBukti: t.linkBukti,
        tepat,
        label: tepat === false ? "Terlambat" : "Tepat waktu",
        href: `/tim/tugas#${t.id}`,
      };
    }),
  ];
  const jenis = [...new Set(baris.map((b) => b.kunci))];
  const pilih = typeof sp.jenis === "string" && jenis.includes(sp.jenis) ? sp.jenis : null;
  const tampil = pilih ? baris.filter((b) => b.kunci === pilih) : baris;
  const nTepat = baris.filter((b) => b.tepat !== false).length;

  return (
    <div className="space-y-3">
      {baris.length > 0 && (
        <nav aria-label="Saring jenis" className="flex flex-wrap gap-1.5">
          {[{ id: null, label: "Semua", n: baris.length }, ...jenis.map((j) => ({ id: j, label: j, n: baris.filter((b) => b.kunci === j).length }))].map((c) => (
            <Link
              key={c.id ?? "semua"}
              href={c.id ? `/tim/verifikasi?jenis=${encodeURIComponent(c.id)}` : "/tim/verifikasi"}
              aria-current={c.id === pilih ? "true" : undefined}
              className={cn("inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px]", c.id === pilih ? "bg-heading font-semibold text-white dark:bg-primary" : "border border-border bg-card")}
            >
              {c.label} <span className="tabular-nums opacity-75">{c.n}</span>
            </Link>
          ))}
        </nav>
      )}

      <SetujuiSemua n={nTepat} />

      {tampil.length ? (
        <ul className="space-y-2">
          {tampil.map((b) => (
            <BarisPeriksa key={`${b.jenis}-${b.id}`} b={b} />
          ))}
        </ul>
      ) : (
        <Kosong ikon={CircleCheck} judul="Semua sudah diperiksa">
          Pekerjaan staf yang ditandai selesai akan muncul di sini.
        </Kosong>
      )}

      {pending.length > 0 && (
        <section id="pending" className="scroll-mt-6 space-y-2 pt-2">
          <h2 className="text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase">SPB pending dana · konfirmasi tanggal cair</h2>
          <ul className="space-y-2">
            {pending.map((i) => (
              <li key={i.id} className="rounded-2xl border border-gold-400/60 bg-card p-3.5">
                <p className="text-sm font-semibold text-heading">
                  SPB · {i.kegiatanNama ?? "—"} <span className="font-normal text-muted-foreground">· {nama(i.pemilikNama)}</span>
                </p>
                <div className="mt-2">
                  <KonfirmasiDanaCair id={i.id} hariIni={k.hariIni} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">Tolak wajib disertai alasan. Item yang belum diperiksa belum dihitung ke skor staf, dan skor Anda adalah rata-rata skor staf.</p>
    </div>
  );
}
