// Bagian layar Hari Ini yang dipakai bersama dashboard SBK/umum dan dashboard Staf Khusus.

import Link from "next/link";
import { ArrowLeftRight, BookOpen } from "lucide-react";
import { FormJurnalCepat, FormPdCepat } from "@/components/app/form-harian";
import { Avatar, JudulBagian, Kartu, PetakIkon, TautanKecil } from "@/components/app/ui";
import { angka, sapaan } from "@/lib/format";
import { PARAMETER } from "@/lib/ikp/tipe";
import type { Sesi } from "@/lib/sesi";
import { jamLokal, labelTanggalPanjang } from "@/lib/waktu";

/** Sapaan, tanggal, pindah amanah, avatar, dan pesan dari redirect. */
export function SapaanHariIni({ sesi, hariIni, sp }: { sesi: Sesi; hariIni: string; sp: Record<string, string | string[] | undefined> }) {
  const jam = Number(jamLokal(new Date(), sesi.kantor).slice(0, 2));
  const namaPanggil = sesi.nama.replace(/^(Ust\.|Ustadz|Ustadzah)\s+/i, "").split(" ")[0];
  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{sapaan(jam)},</p>
          <h1 className="text-2xl font-bold tracking-tight text-heading">{namaPanggil}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{labelTanggalPanjang(hariIni)}</p>
          {sesi.penugasan.length > 1 && sesi.amanah && (
            <Link href="/akun#amanah" className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
              <ArrowLeftRight className="size-3.5" /> {sesi.amanah.peranKerja} · {sesi.amanah.unitNama}
            </Link>
          )}
        </div>
        <Link href="/akun" aria-label="Akun">
          <Avatar nama={sesi.nama} ukuran="lg" className="ring-2 ring-card shadow-sm" />
        </Link>
      </header>

      {sp.password === "diganti" && <p className="mb-4 rounded-xl bg-mint-500/12 px-4 py-3 text-sm font-medium text-mint-700 dark:text-mint-100">Password berhasil diganti.</p>}
      {sp.akses === "ditolak" && <p className="mb-4 rounded-xl bg-flame-500/10 px-4 py-3 text-sm font-medium text-flame-700 dark:text-flame-100">Halaman itu tidak tersedia untuk peran Anda.</p>}
    </>
  );
}

/** Jurnal hari ini dengan form cepat. `poin`: tampilkan poin tambahan K1 (SBK dan Staf Khusus). */
export function BagianJurnal({ hariIni, entri, jumlahBulanIni, poin }: { hariIni: string; entri: { id: string; uraian: string; pemberiTugas: string | null }[]; jumlahBulanIni: number; poin: boolean }) {
  const poinJurnal = Math.min(PARAMETER.tambahan.maks, jumlahBulanIni * PARAMETER.tambahan.poin);
  return (
    <section>
      <JudulBagian aksi={<TautanKecil href="/jurnal">Semua jurnal</TautanKecil>}>Jurnal hari ini</JudulBagian>
      <Kartu>
        <p className="text-xs text-muted-foreground">
          Pekerjaan di luar indikator · {jumlahBulanIni} entri bulan ini
          {poin && <> · +{angka(poinJurnal)} poin K1 (maks. {PARAMETER.tambahan.maks})</>}
        </p>
        {entri.map((j) => (
          <p key={j.id} className="border-b border-border/60 py-2 text-sm last:border-0">
            {j.uraian}
            {j.pemberiTugas && <span className="text-muted-foreground"> · {j.pemberiTugas}</span>}
          </p>
        ))}
        <FormJurnalCepat tanggal={hariIni} />
      </Kartu>
    </section>
  );
}

/** Panel lipat pengembangan diri dengan form cepat. */
export function PanelPengembanganDiri({ hariIni, jumlahBulanIni }: { hariIni: string; jumlahBulanIni: number }) {
  return (
    <details className="group rounded-2xl border border-border/70 bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
        <PetakIkon ikon={BookOpen} nada="mint" />
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-heading">Pengembangan diri</span>
          <span className="block text-xs text-muted-foreground">{jumlahBulanIni ? `${jumlahBulanIni} catatan bulan ini` : "Belum ada catatan bulan ini (skor K3 maks. 2)"}</span>
        </span>
      </summary>
      <div className="border-t border-border px-4 pb-4">
        <FormPdCepat tanggal={hariIni} />
      </div>
    </details>
  );
}
