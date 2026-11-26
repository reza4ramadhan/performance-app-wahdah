"use client";

// + Catat (rombak v2, mockup Adm-4/Adm-5): bottom sheet. Pilih jenis pekerjaan (surat, layanan, arsip) → unit
// (dilewati bila hanya satu) → field. Pengingat, SPP, dan SPB tidak dicatat di sini: muncul otomatis dari kegiatan.
// Optimistic: sheet langsung tertutup; bila jaringan gagal, draf disimpan di perangkat dan dikirim ulang saat online.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Archive, ChevronLeft, ChevronRight, Mail, Users, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ambilPilihanCatat, simpanItem } from "@/app/aksi/item";
import { indikatorDari } from "@/lib/ikp/katalog";
import { Chip } from "./kolom";
import { FieldItem, keIsian, nilaiAwal, type NilaiForm, type Pilihan } from "./form-item";

export type PenugasanCatat = { id: string; label: string; indikator: { kode: string; pendek: string; nama: string }[] };
/** Pilihan awal saat sheet dibuka dari kartu kegiatan. */
export type PresetCatat = { penugasanId: string; kode: string; kegiatanId?: string };

/** Tampilan pilihan jenis pekerjaan di langkah pertama. */
const JENIS: Record<string, { judul: string; sub: string; Ikon: LucideIcon; nada: string }> = {
  "SBK-1": { judul: "Pembuatan surat", sub: "Kegiatan SKUO · selesai ≤ 1 hari kerja", Ikon: Mail, nada: "bg-primary/10 text-brand-700 dark:text-brand-200" },
  "SBK-4": { judul: "Koordinasi layanan", sub: "Media, Zoom, sertifikat, konsumsi, akomodasi", Ikon: Users, nada: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-200" },
  "SBK-5": { judul: "Dokumen arsip", sub: "Notulensi, dokumen kegiatan · ≤ 3 hari kerja", Ikon: Archive, nada: "bg-gold-400/25 text-gold-700 dark:text-gold-100" },
};

const KUNCI_DRAF = "ikp-draf-item";
const KUNCI_TERAKHIR = "ikp-catat-terakhir";

type Draf = Record<string, unknown> & { idKlien: string };
const bacaDraf = (): Draf[] => {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_DRAF) ?? "[]");
  } catch {
    return [];
  }
};
const tulisDraf = (d: Draf[]) => {
  try {
    localStorage.setItem(KUNCI_DRAF, JSON.stringify(d));
  } catch {}
};

/** Kirim ulang draf yang tertunda (dipanggil saat online / halaman dibuka). */
export function useKirimDraf() {
  const kirim = useCallback(async () => {
    const draf = bacaDraf();
    if (!draf.length || !navigator.onLine) return;
    const sisa: Draf[] = [];
    let terkirim = 0;
    for (const d of draf) {
      try {
        const r = await simpanItem(d);
        if (r.ok) terkirim++;
        else toast.error(`Draf tidak bisa dikirim: ${r.pesan}`);
      } catch {
        sisa.push(d);
      }
    }
    tulisDraf(sisa);
    if (terkirim) toast.success(`${terkirim} draf terkirim.`);
  }, []);
  useEffect(() => {
    kirim();
    window.addEventListener("online", kirim);
    return () => window.removeEventListener("online", kirim);
  }, [kirim]);
}

function nilaiUntuk(kode: string, hariIni: string, kegiatanId?: string) {
  const b = kode ? indikatorDari(kode)?.item : undefined;
  return b ? nilaiAwal(b, hariIni, kegiatanId ? { kegiatanId } : undefined) : null;
}

/** Preset dari tombol, atau penugasan & indikator terakhir yang dipakai di perangkat ini. */
function terakhirDipakai(penugasan: PenugasanCatat[], preset?: PresetCatat) {
  let t: { pnId?: string; kode?: string } = preset ? { pnId: preset.penugasanId, kode: preset.kode } : {};
  try {
    if (!preset && typeof window !== "undefined") t = JSON.parse(localStorage.getItem(KUNCI_TERAKHIR) ?? "{}");
  } catch {}
  const p = penugasan.find((x) => x.id === t.pnId) ?? penugasan[0];
  return { pnId: p?.id ?? "", kode: p?.indikator.some((i) => i.kode === t.kode) ? t.kode! : (p?.indikator[0]?.kode ?? "") };
}

export function SheetCatat({
  buka,
  setBuka,
  penugasan,
  hariIni,
  minTanggal,
  preset,
}: {
  buka: boolean;
  setBuka: (b: boolean) => void;
  penugasan: PenugasanCatat[];
  hariIni: string;
  minTanggal: string;
  preset?: PresetCatat;
}) {
  // Sheet dipasang ulang setiap dibuka (lihat Cangkang), jadi keadaan awal cukup dihitung sekali di sini.
  const [awal] = useState(() => terakhirDipakai(penugasan, preset));
  // Tanpa preset, mulai dari pilihan jenis pekerjaan.
  const [langkah, setLangkah] = useState<"jenis" | "isi">(preset ? "isi" : "jenis");
  const [pnId, setPnId] = useState(awal.pnId);
  const [kode, setKode] = useState(awal.kode);
  const [nilai, setNilai] = useState<NilaiForm | null>(() => nilaiUntuk(awal.kode, hariIni, awal.kode === preset?.kode ? preset?.kegiatanId : undefined));
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pilihan, setPilihan] = useState<Record<string, Pilihan>>({});
  const [menyimpan, mulai] = useTransition();
  const idKlien = useRef("");

  const pn = penugasan.find((p) => p.id === pnId);
  const bentuk = kode ? indikatorDari(kode)?.item : undefined;

  useEffect(() => {
    if (!buka || !pnId || pilihan[pnId]) return;
    ambilPilihanCatat(pnId).then((p) => setPilihan((x) => ({ ...x, [pnId]: p })));
  }, [buka, pnId, pilihan]);

  const pilihKode = (k: string) => {
    setKode(k);
    setNilai(nilaiUntuk(k, hariIni));
    setGalat({});
  };
  const pilihPenugasan = (id: string) => {
    setPnId(id);
    const ind = penugasan.find((p) => p.id === id)?.indikator ?? [];
    if (!ind.some((i) => i.kode === kode)) pilihKode(ind[0]?.kode ?? "");
  };
  // Jenis pekerjaan gabungan dari semua penugasan, urut katalog.
  const jenis = [...new Map(penugasan.flatMap((p) => p.indikator).map((i) => [i.kode, i])).values()];
  const pilihJenis = (k: string) => {
    const p = pn?.indikator.some((i) => i.kode === k) ? pn : penugasan.find((x) => x.indikator.some((i) => i.kode === k));
    if (p) setPnId(p.id);
    pilihKode(k);
    setLangkah("isi");
  };
  // Unit yang bisa dipilih untuk jenis ini (staf rangkap).
  const pnJenis = penugasan.filter((p) => p.indikator.some((i) => i.kode === kode));

  const simpan = () => {
    if (!bentuk || !nilai || !pn) return;
    idKlien.current ||= crypto.randomUUID();
    const payload = { idKlien: idKlien.current, penugasanId: pn.id, indikatorKode: kode, ...keIsian(bentuk, nilai) };
    try {
      localStorage.setItem(KUNCI_TERAKHIR, JSON.stringify({ pnId: pn.id, kode }));
    } catch {}
    mulai(async () => {
      try {
        const r = await simpanItem(payload);
        if (!r.ok) {
          setGalat(r.galat ?? {});
          toast.error(r.pesan);
          return;
        }
        toast.success(r.pesan);
        setBuka(false);
      } catch {
        // Jaringan putus: simpan draf, tutup sheet, kirim ulang otomatis.
        tulisDraf([...bacaDraf(), payload]);
        toast.info("Sedang luring. Draf disimpan di perangkat dan dikirim otomatis saat online.");
        setBuka(false);
      }
    });
  };

  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-0 rounded-t-3xl p-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-3xl">
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/25 lg:hidden" />
        <SheetHeader className="px-5 pt-3 pb-2">
          <SheetTitle className="flex items-center gap-1 text-lg font-bold text-heading">
            {langkah === "isi" && !preset && (
              <button type="button" onClick={() => setLangkah("jenis")} aria-label="Kembali ke pilihan jenis" className="-ml-2 grid size-10 place-items-center rounded-xl">
                <ChevronLeft className="size-5" />
              </button>
            )}
            {langkah === "jenis" ? "Catat pekerjaan" : (JENIS[kode]?.judul ?? "Catat item")}
          </SheetTitle>
          <SheetDescription>{!pn ? "Anda belum punya penugasan aktif." : langkah === "jenis" ? "Pilih jenis pekerjaan yang baru masuk." : pn.label}</SheetDescription>
        </SheetHeader>

        {pn && langkah === "jenis" ? (
          <div className="space-y-3 overflow-y-auto px-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            {jenis.map((i) => {
              const j = JENIS[i.kode];
              const Ikon = j?.Ikon ?? Mail;
              return (
                <button key={i.kode} type="button" onClick={() => pilihJenis(i.kode)} className="flex w-full items-center gap-3.5 rounded-2xl border border-border p-3.5 text-left transition hover:border-primary/40 active:scale-[0.99]">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${j?.nada ?? "bg-muted"}`}>
                    <Ikon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-heading">{j?.judul ?? i.nama}</span>
                    <span className="block text-[12.5px] text-muted-foreground">{j?.sub ?? i.pendek}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </button>
              );
            })}
            <p className="rounded-xl bg-muted px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">Pengingat, SPP, dan SPB tidak dicatat di sini. Ketiganya muncul otomatis di Tugas dari jadwal kegiatan koordinator.</p>
          </div>
        ) : pn ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              simpan();
            }}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4">
              {pnJenis.length > 1 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-heading">Unit</p>
                  <div className="flex flex-wrap gap-2">
                    {pnJenis.map((p) => (
                      <Chip key={p.id} aktif={p.id === pnId} onClick={() => pilihPenugasan(p.id)}>
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {!pn.indikator.length && <p className="text-sm text-muted-foreground">Penugasan ini tidak punya indikator yang dicatat per item.</p>}
              {kode && !JENIS[kode] && <p className="text-xs text-muted-foreground">{indikatorDari(kode)?.nama}</p>}
              {bentuk && nilai && (
                <FieldItem bentuk={bentuk} nilai={nilai} ubah={setNilai} galat={galat} pilihan={pilihan[pnId] ?? null} hariIni={hariIni} minTanggal={minTanggal} />
              )}
            </div>
            <div className="border-t border-border bg-card px-5 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <Button type="submit" size="lg" className="w-full" disabled={!bentuk || menyimpan}>
                {menyimpan ? "Menyimpan…" : nilai?.sudahSelesai ? "Simpan & ajukan verifikasi" : "Simpan"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="px-5 pb-8 text-sm text-muted-foreground">Hubungi Admin untuk menetapkan penugasan Anda.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
