// Tab Tugas untuk Staf Tugas Rutin (docs/rombak-v2/03 bagian A.1, mockup Rtn-1): kartu ringkasan Set Tugas aktif,
// progres hari ini, tugas berikutnya, chip K1; lalu Perlu diperbaiki, Rutin hari ini (urut jam, centang cepat),
// Terlambat, Delegasi, dan pratinjau Besok.

import Link from "next/link";
import { and, gte, inArray, lte, or } from "drizzle-orm";
import { ChevronRight, CircleCheck, Folder } from "lucide-react";
import { CentangCepat } from "@/components/app/selesai-tugas";
import { Avatar } from "@/components/app/ui";
import { getDb, schema as s } from "@/lib/db";
import { hasilPeriode } from "@/lib/data/ikp";
import { pastikanRutin } from "@/lib/data/set-tugas";
import { daftarTugas, kondisiTugasPenugasan, type BarisTugas } from "@/lib/data/tugas";
import { angka } from "@/lib/format";
import { setBerlaku } from "@/lib/set-tugas";
import type { Sesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { jamLokal, keUtc, labelTanggal, labelTanggalPanjang, periodeDari, tambahHari, tanggalLokal } from "@/lib/waktu";

const jam = (t: BarisTugas) => jamLokal(t.tenggat, t.kantor).replace(":", ".");

export async function TugasRutin({ sesi, hariIni }: { sesi: Sesi; hariIni: string }) {
  const db = await getDb();
  const pn = sesi.penugasan.filter((p) => p.peranKerja === "SK");
  const pnIds = pn.map((p) => p.id);
  await pastikanRutin(db, pnIds, sesi.kantor);
  const besok = tambahHari(hariIni, 1);
  const [tugas, { hasil }, pasang] = await Promise.all([
    daftarTugas(
      and(
        kondisiTugasPenugasan(pnIds),
        lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(hariIni, 15), sesi.kantor)),
        or(inArray(s.tugasKhususJadwal.status, ["belum", "dikerjakan", "ditolak"]), gte(s.tugasKhususJadwal.tenggat, keUtc(hariIni, sesi.kantor))),
      ),
      400,
    ),
    hasilPeriode(periodeDari(hariIni)),
    pnIds.length ? db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, pnIds)) : Promise.resolve([]),
  ]);
  const setId = setBerlaku(pasang, hariIni);
  const setDepan = setBerlaku(pasang, tambahHari(hariIni, 7));
  const namaSet = new Map(
    (setId || setDepan ? await db.select({ id: s.setTugas.id, nama: s.setTugas.nama }).from(s.setTugas).where(inArray(s.setTugas.id, [setId, setDepan].filter((x): x is string => !!x))) : []).map((x) => [x.id, x.nama]),
  );
  const k1 = hasil.find((h) => h.pegawaiId === sesi.pegawaiId)?.k1 ?? null;
  const tgl = (t: BarisTugas) => tanggalLokal(t.tenggat, t.kantor);
  const buka = (t: BarisTugas) => t.status === "belum" || t.status === "dikerjakan";

  const ditolak = tugas.filter((t) => t.status === "ditolak");
  const rutinHariIni = tugas.filter((t) => t.setTugasItemId && tgl(t) === hariIni && t.status !== "ditolak").sort((a, b) => +a.tenggat - +b.tenggat);
  const terlambat = tugas.filter((t) => buka(t) && tgl(t) < hariIni);
  const delegasi = tugas.filter((t) => !t.setTugasItemId && buka(t) && tgl(t) >= hariIni);
  const rutinBesok = tugas.filter((t) => t.setTugasItemId && tgl(t) === besok);
  const selesai = rutinHariIni.filter((t) => t.status === "diajukan" || t.status === "disetujui").length;
  const berikut = rutinHariIni.find(buka);
  const unitNama = pn.map((p) => p.unitNama).join(", ");

  return (
    <div className="mx-auto max-w-xl pb-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">{labelTanggalPanjang(hariIni)}</p>
          <h1 className="text-xl font-bold text-heading">Tugas hari ini</h1>
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" />
        </Link>
      </header>

      <section aria-label="Ringkasan hari ini" className="mb-3 space-y-2.5 rounded-2xl bg-heading p-4 text-white dark:bg-brand-900">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{setId ? namaSet.get(setId) : "Belum ada set tugas"}</span>
            <span className="block truncate text-xs text-white/70">{setId ? `Set tugas aktif pekan ini · ${unitNama}` : `Koordinator mengatur set tugas Anda · ${unitNama}`}</span>
          </span>
          <Link href="/progres" className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 text-[12.5px] text-white/75">
            K1 <strong className="text-white">{k1 === null ? "—" : angka(k1)}</strong>
          </Link>
        </div>
        {rutinHariIni.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="h-2 flex-1 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-brand-300" style={{ width: `${(selesai / rutinHariIni.length) * 100}%` }} />
            </div>
            <span className="text-[13px] font-semibold tabular-nums">
              {selesai} / {rutinHariIni.length}
            </span>
          </div>
        )}
        <p className="text-[13px]">
          {berikut ? (
            <>
              Berikutnya: <strong>{berikut.judul}</strong>, pukul {jam(berikut)}
            </>
          ) : rutinHariIni.length ? (
            "Semua tugas rutin hari ini sudah ditandai selesai."
          ) : (
            "Tidak ada tugas rutin hari ini."
          )}
        </p>
      </section>

      <div className="space-y-2">
        {ditolak.length > 0 && (
          <Bagian judul="Perlu diperbaiki" nada="flame">
            {ditolak.map((t) => (
              <Link key={t.id} href={`/tugas/${t.id}`} className="flex items-center justify-between gap-2 rounded-2xl border border-flame-500/30 bg-card px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold text-heading">{t.judul}</span>
                  <span className="block truncate text-[12.5px] text-flame-700 dark:text-flame-100">
                    {tgl(t) === tambahHari(hariIni, -1) ? "Kemarin" : labelTanggal(tgl(t))} · “{t.alasanTolak}”
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-flame-500/12 px-2 py-0.5 text-[11.5px] font-semibold text-flame-700 dark:text-flame-100">Ditolak</span>
              </Link>
            ))}
          </Bagian>
        )}

        <Bagian
          judul="Rutin hari ini"
          aksi={
            setId && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-brand-700 dark:text-brand-200">
                <Folder className="size-3" aria-hidden /> {namaSet.get(setId)} · {rutinHariIni.length}
              </span>
            )
          }
        >
          {rutinHariIni.length ? (
            <ol className="overflow-hidden rounded-2xl border border-border bg-card">
              {rutinHariIni.map((t) => (
                <BarisRutin key={t.id} t={t} sorot={t.id === berikut?.id} />
              ))}
            </ol>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              <CircleCheck className="size-4 text-mint-500" aria-hidden /> Tidak ada tugas rutin hari ini.
            </p>
          )}
        </Bagian>

        {terlambat.length > 0 && (
          <Bagian judul="Terlambat" nada="flame">
            <ol className="overflow-hidden rounded-2xl border border-flame-500/30 bg-card">
              {terlambat.map((t) => (
                <BarisRutin key={t.id} t={t} tanggal />
              ))}
            </ol>
          </Bagian>
        )}

        {delegasi.length > 0 && (
          <Bagian judul="Delegasi">
            {delegasi.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5">
                {t.linkWajib ? <Link href={`/tugas/${t.id}`} aria-label={`Buka untuk menandai selesai: ${t.judul}`} className="size-7 shrink-0 rounded-full border-2 border-muted-foreground/50" /> : <CentangCepat id={t.id} judul={t.judul} />}
                <Link href={`/tugas/${t.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-heading">{t.judul}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">
                    {t.pemberiNama} · {tgl(t) === hariIni ? "hari ini" : labelTanggal(tgl(t))} {jam(t)}
                  </span>
                </Link>
              </div>
            ))}
          </Bagian>
        )}

        <Link href="/tugas/besok" className="mt-1 flex min-h-12 items-center justify-between rounded-xl border border-border bg-card px-3.5 text-sm font-medium">
          <span>Besok{setBerlaku(pasang, besok) ? ` · ${namaSet.get(setBerlaku(pasang, besok)!) ?? ""}` : ""}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {rutinBesok.length} tugas <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
        <Link href="/tugas/usulan" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
          Usulkan tugas rutin baru
        </Link>
      </div>
    </div>
  );
}

function Bagian({ judul, nada, aksi, children }: { judul: string; nada?: "flame"; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="mt-2 flex items-center justify-between gap-2">
        <h2 className={cn("text-[12.5px] font-semibold tracking-wide uppercase", nada === "flame" ? "text-flame-700 dark:text-flame-100" : "text-muted-foreground")}>{judul}</h2>
        {aksi}
      </div>
      {children}
    </section>
  );
}

const STATUS = { diajukan: ["Diperiksa", "bg-gold-400/25 text-gold-700 dark:text-gold-100"], disetujui: ["Disetujui", "bg-mint-500/12 text-mint-700 dark:text-mint-100"] } as const;

/** Satu baris rutin: jam, judul, lalu status atau lingkaran centang (centang cepat bila link bukti tidak wajib). */
function BarisRutin({ t, sorot = false, tanggal = false }: { t: BarisTugas; sorot?: boolean; tanggal?: boolean }) {
  const selesai = t.status === "diajukan" || t.status === "disetujui";
  return (
    <li className={cn("flex items-center gap-3 border-b border-border/60 px-3.5 py-2.5 last:border-0", sorot && "bg-primary/8")}>
      <span className={cn("w-11 shrink-0 text-[12.5px] font-semibold tabular-nums", sorot ? "text-brand-700 dark:text-brand-200" : "text-muted-foreground")}>{tanggal ? labelTanggal(tanggalLokal(t.tenggat, t.kantor)) : jam(t)}</span>
      <Link href={`/tugas/${t.id}`} className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", selesai ? "text-muted-foreground line-through" : sorot ? "font-semibold text-heading" : "text-heading")}>{t.judul}</span>
        {!selesai && t.linkWajib && <span className="block text-[11.5px] text-muted-foreground">Link bukti wajib</span>}
      </Link>
      {selesai ? (
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold", STATUS[t.status as keyof typeof STATUS][1])}>{STATUS[t.status as keyof typeof STATUS][0]}</span>
      ) : t.linkWajib ? (
        <Link href={`/tugas/${t.id}`} aria-label={`Buka untuk menandai selesai: ${t.judul}`} className="-m-2 grid size-11 shrink-0 place-items-center">
          <span className="size-7 rounded-full border-2 border-muted-foreground/50" />
        </Link>
      ) : (
        <CentangCepat id={t.id} judul={t.judul} />
      )}
    </li>
  );
}
