"use client";

// Tugas khusus: kartu jadwal, pembaruan status oleh staf, form tugas baru, putusan pemberi tugas,
// serta usulan tugas dari Staf Khusus.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, ListChecks, ListPlus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ajukanUsulanTugas, batalkanUsulan, perbaruiTugas, putuskanUsulan, simpanTugasKhusus, verifikasiTugas } from "@/app/aksi/tugas";
import type { HasilAksi } from "@/lib/aksi";
import type { BarisTugas, BarisUsulan } from "@/lib/data/tugas";
import { MAKS_USULAN, pecahDaftarJudul } from "@/lib/ikp/tugas";
import { FREKUENSI_TUGAS, LABEL_FREKUENSI_TUGAS, LABEL_STATUS_TUGAS, type FrekuensiTugas, type StatusTugas } from "@/lib/ikp/tipe";
import { cn } from "@/lib/utils";
import { jamLokal, labelTanggal, LABEL_ZONA, tanggalLokal } from "@/lib/waktu";
import { FormAksi, Galat } from "./form-aksi";
import { Chip, Kolom, kelasPilihan, kelasTeks } from "./kolom";
import { TombolAksi } from "./tombol-aksi";
import { Batang, Lencana, type Nada } from "./ui";

const NADA_STATUS: Record<StatusTugas, Nada> = { belum: "netral", dikerjakan: "brand", diajukan: "gold", disetujui: "mint", ditolak: "flame" };

const labelTenggat = (t: BarisTugas) => `${labelTanggal(tanggalLokal(t.tenggat, t.kantor))}, ${jamLokal(t.tenggat, t.kantor)} ${LABEL_ZONA[t.kantor]}`;

/** Satu jadwal tugas khusus. Staf bisa memperbarui; pemberi tugas bisa memverifikasi. */
export function KartuTugas({ tugas: t, sebagai, tampilStaf = false }: { tugas: BarisTugas; sebagai: "staf" | "pemberi"; tampilStaf?: boolean }) {
  const [buka, setBuka] = useState(false);
  const bisaUbah = sebagai === "staf" && (t.status === "belum" || t.status === "dikerjakan" || t.status === "ditolak");
  return (
    <div id={t.id} className="rounded-2xl border border-border/70 bg-card p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-heading">{t.judul}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tampilStaf ? `${t.stafNama} · ` : sebagai === "staf" ? `dari ${t.pemberiNama} · ` : ""}
            {LABEL_FREKUENSI_TUGAS[t.frekuensi]} · tenggat {labelTenggat(t)}
          </p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Lencana nada={NADA_STATUS[t.status]}>{t.status === "dikerjakan" ? `${t.persen}%` : LABEL_STATUS_TUGAS[t.status]}</Lencana>
          {t.lewat && <Lencana nada="flame">Lewat tenggat</Lencana>}
        </span>
      </div>
      {t.uraian && <p className="mt-2 text-sm text-muted-foreground">{t.uraian}</p>}
      {t.status === "dikerjakan" && <Batang nilai={t.persen} className="mt-2" />}
      {t.status === "ditolak" && t.alasanTolak && <p className="mt-2 text-xs font-medium text-flame-600">Ditolak: {t.alasanTolak}</p>}
      {(t.catatan || t.linkBukti) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.catatan}
          {t.linkBukti && (
            <a href={t.linkBukti} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary">
              bukti <ExternalLink className="size-3" />
            </a>
          )}
        </p>
      )}
      {bisaUbah &&
        (buka ? (
          <UbahStatusTugas tugas={t} tutup={() => setBuka(false)} />
        ) : (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setBuka(true)}>
            <Pencil className="size-4" /> Perbarui status
          </Button>
        ))}
      {sebagai === "pemberi" && t.status === "diajukan" && (
        <div className="mt-3">
          <PutusanTugas ids={[t.id]} />
        </div>
      )}
    </div>
  );
}

/** Dropdown status: Sementara dikerjakan (wajib persentase) atau Selesai. */
function UbahStatusTugas({ tugas: t, tutup }: { tugas: BarisTugas; tutup: () => void }) {
  const [status, setStatus] = useState<"" | "dikerjakan" | "selesai">(t.status === "dikerjakan" ? "dikerjakan" : "");
  const [persen, setPersen] = useState(t.status === "dikerjakan" ? String(t.persen) : "");
  const [catatan, setCatatan] = useState(t.catatan ?? "");
  const [linkBukti, setLinkBukti] = useState(t.linkBukti ?? "");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [proses, mulai] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-3 space-y-3 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!status) return setGalat({ status: "Pilih status." });
        mulai(async () => {
          const r = await perbaruiTugas(t.id, { status, persen, catatan, linkBukti });
          if (!r.ok) {
            setGalat(r.galat ?? {});
            toast.error(r.pesan);
            return;
          }
          toast.success(r.pesan);
          tutup();
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Kolom label="Status" galat={galat.status} className={status === "dikerjakan" ? "" : "col-span-2"}>
          <select className={kelasPilihan} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-invalid={!!galat.status}>
            <option value="">Pilih status…</option>
            <option value="dikerjakan">{LABEL_STATUS_TUGAS.dikerjakan}</option>
            <option value="selesai">Selesai</option>
          </select>
        </Kolom>
        {status === "dikerjakan" && (
          <Kolom label="Persentase" galat={galat.persen}>
            <div className="relative">
              <Input type="number" inputMode="numeric" min={1} max={99} required value={persen} onChange={(e) => setPersen(e.target.value)} className="pr-8" aria-invalid={!!galat.persen} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </Kolom>
        )}
      </div>
      <Kolom label="Catatan (opsional)" galat={galat.catatan}>
        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={kelasTeks} placeholder="mis. Menunggu data dari SKUO" />
      </Kolom>
      <Kolom label="Link bukti (opsional)" galat={galat.linkBukti}>
        <Input type="url" inputMode="url" value={linkBukti} onChange={(e) => setLinkBukti(e.target.value)} placeholder="https://drive.google.com/…" />
      </Kolom>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={proses}>
          {proses ? "Menyimpan…" : status === "selesai" ? "Tandai selesai & ajukan" : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={tutup}>
          Batal
        </Button>
      </div>
    </form>
  );
}

/** Pemberi tugas: setujui atau tolak dengan alasan. Dipakai juga untuk usulan tugas (`aksi={putuskanUsulan}`). */
export function PutusanTugas({
  ids,
  aksi = verifikasiTugas,
  labelSetuju = "Setujui",
  labelTolak = "Tolak",
}: {
  ids: string[];
  aksi?: (ids: string[], keputusan: "setuju" | "tolak", alasan?: string) => Promise<HasilAksi>;
  labelSetuju?: string;
  labelTolak?: string;
}) {
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [proses, mulai] = useTransition();
  const router = useRouter();
  const kirim = (k: "setuju" | "tolak") =>
    mulai(async () => {
      const r = await aksi(ids, k, alasan);
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      setTolak(false);
      setAlasan("");
      router.refresh();
    });

  if (tolak)
    return (
      <div className="space-y-2">
        <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} placeholder="Alasan penolakan, mis. hasil belum sesuai arahan" className={kelasTeks} aria-label="Alasan penolakan" />
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" disabled={proses || !alasan.trim()} onClick={() => kirim("tolak")}>
            Tolak
          </Button>
          <Button variant="outline" onClick={() => setTolak(false)}>
            Batal
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex gap-2">
      <Button className="flex-1" disabled={proses} onClick={() => kirim("setuju")}>
        <Check className="size-4" /> {labelSetuju}
      </Button>
      <Button variant="outline" className="flex-1" disabled={proses} onClick={() => setTolak(true)}>
        <X className="size-4" /> {labelTolak}
      </Button>
    </div>
  );
}

/** Form tugas baru untuk koordinator. Tugas berulang butuh tanggal berakhir. */
export function FormTugasBaru({ staf, hariIni }: { staf: { id: string; label: string }[]; hariIni: string }) {
  const [frekuensi, setFrekuensi] = useState<FrekuensiTugas>("sekali");
  const [putaran, setPutaran] = useState(0);
  return (
    <FormAksi key={putaran} aksi={simpanTugasKhusus} tombol="Berikan tugas" tombolPenuh className="mt-3 space-y-3" setelahBerhasil={() => setPutaran((x) => x + 1)}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Staf</span>
        <select name="penugasanId" className={kelasPilihan} defaultValue={staf.length === 1 ? staf[0].id : ""} required>
          <option value="">Pilih staf…</option>
          {staf.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Galat nama="penugasanId" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Judul tugas</span>
        <Input name="judul" required placeholder="mis. Menyiapkan bahan rapat pimpinan" />
        <Galat nama="judul" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Uraian (opsional)</span>
        <textarea name="uraian" rows={2} className={kelasTeks} placeholder="Arahan singkat, hasil yang diharapkan" />
      </label>
      <IsianJadwal frekuensi={frekuensi} setFrekuensi={setFrekuensi} hariIni={hariIni} />
    </FormAksi>
  );
}

/** Frekuensi, tanggal, dan jam tenggat; dipakai form tugas baru dan form usulan. */
function IsianJadwal({ frekuensi, setFrekuensi, hariIni }: { frekuensi: FrekuensiTugas; setFrekuensi: (f: FrekuensiTugas) => void; hariIni: string }) {
  return (
    <>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-heading">Frekuensi</span>
        <input type="hidden" name="frekuensi" value={frekuensi} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Frekuensi">
          {FREKUENSI_TUGAS.map((f) => (
            <Chip key={f} aktif={frekuensi === f} onClick={() => setFrekuensi(f)} role="radio" aria-checked={frekuensi === f}>
              {LABEL_FREKUENSI_TUGAS[f]}
            </Chip>
          ))}
        </div>
      </div>
      <div className={cn("grid gap-3", frekuensi === "sekali" ? "grid-cols-2" : "grid-cols-3")}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">{frekuensi === "sekali" ? "Tenggat" : "Mulai"}</span>
          <Input name="tanggalMulai" type="date" required min={hariIni} defaultValue={hariIni} />
          <Galat nama="tanggalMulai" />
        </label>
        {frekuensi !== "sekali" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Sampai</span>
            <Input name="tanggalAkhir" type="date" required min={hariIni} />
            <Galat nama="tanggalAkhir" />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-heading">Jam</span>
          <Input name="jamTenggat" type="time" required defaultValue="16:00" />
          <Galat nama="jamTenggat" />
        </label>
      </div>
      {frekuensi !== "sekali" && (
        <p className="text-xs text-muted-foreground">
          {frekuensi === "harian" ? "Satu jadwal tiap hari kerja dalam rentang ini." : "Satu jadwal tiap 7 hari sejak tanggal mulai."} Tiap jadwal dinilai dan diverifikasi sendiri.
        </p>
      )}
    </>
  );
}

// ── Usulan tugas (Staf Khusus) ────────────────────────────────────────────────

/** Staf Khusus mengusulkan tugas: satu per satu (dengan uraian) atau sekaligus banyak (satu baris satu tugas). */
export function FormUsulanTugas({ penugasanId, hariIni }: { penugasanId: string; hariIni: string }) {
  const [cara, setCara] = useState<"satu" | "banyak">("satu");
  const [frekuensi, setFrekuensi] = useState<FrekuensiTugas>("sekali");
  const [daftar, setDaftar] = useState("");
  const [putaran, setPutaran] = useState(0);
  const judul = pecahDaftarJudul(daftar);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Cara mengisi">
        {(
          [
            ["satu", "Satu per satu", ListPlus],
            ["banyak", "Sekaligus banyak", ListChecks],
          ] as const
        ).map(([c, label, Ikon]) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cara === c}
            onClick={() => setCara(c)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition",
              cara === c ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Ikon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <FormAksi
        key={`${cara}-${putaran}`}
        aksi={ajukanUsulanTugas}
        tombol={cara === "banyak" && judul.length > 1 ? `Ajukan ${judul.length} tugas` : "Ajukan ke atasan"}
        tombolPenuh
        className="space-y-3"
        setelahBerhasil={() => {
          setDaftar("");
          setPutaran((x) => x + 1);
        }}
      >
        <input type="hidden" name="penugasanId" value={penugasanId} />
        <input type="hidden" name="cara" value={cara} />
        {cara === "satu" ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Judul tugas</span>
              <Input name="judul" required placeholder="mis. Patroli keamanan gedung" />
              <Galat nama="judul" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Uraian (opsional)</span>
              <textarea name="uraian" rows={2} className={kelasTeks} placeholder="Apa yang dikerjakan dan hasil yang diharapkan" />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Daftar tugas</span>
            <textarea
              name="daftarJudul"
              rows={6}
              value={daftar}
              onChange={(e) => setDaftar(e.target.value)}
              className={kelasTeks}
              placeholder={"Satu baris satu tugas, mis.\nPatroli keamanan gedung\nCek CCTV dan rekaman\nLaporan serah terima piket"}
            />
            <Galat nama="daftarJudul" />
            <span className="mt-1 block text-xs text-muted-foreground">
              Bisa ditempel dari catatan; nomor dan tanda butir di awal baris dibuang otomatis. Maks. {MAKS_USULAN} tugas. Frekuensi dan tenggat di bawah berlaku untuk semua.
            </span>
          </label>
        )}
        {cara === "banyak" && judul.length > 0 && (
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className={cn("text-xs font-semibold", judul.length > MAKS_USULAN ? "text-destructive" : "text-muted-foreground")}>
              {judul.length} tugas akan diajukan{judul.length > MAKS_USULAN ? ` (maks. ${MAKS_USULAN})` : ""}
            </p>
            <ol className="mt-1.5 max-h-48 list-decimal space-y-0.5 overflow-y-auto pl-5 text-sm text-heading">
              {judul.map((j) => (
                <li key={j}>{j}</li>
              ))}
            </ol>
          </div>
        )}
        <IsianJadwal frekuensi={frekuensi} setFrekuensi={setFrekuensi} hariIni={hariIni} />
      </FormAksi>
    </div>
  );
}

const NADA_USULAN: Record<BarisUsulan["status"], Nada> = { diajukan: "gold", disetujui: "mint", ditolak: "flame" };
const LABEL_USULAN: Record<BarisUsulan["status"], string> = { diajukan: "Menunggu persetujuan", disetujui: "Disetujui", ditolak: "Ditolak" };

const labelRentang = (u: BarisUsulan) =>
  `${LABEL_FREKUENSI_TUGAS[u.frekuensi]} · ${u.frekuensi === "sekali" ? `tenggat ${labelTanggal(u.tanggalMulai)}` : `${labelTanggal(u.tanggalMulai)}–${labelTanggal(u.tanggalAkhir)}`} pukul ${u.jamTenggat}`;

/** Satu usulan. Staf bisa membatalkan selama belum diputuskan; atasan bisa menyetujui atau menolak. */
export function KartuUsulan({ usulan: u, sebagai, tampilStaf = false }: { usulan: BarisUsulan; sebagai: "staf" | "atasan"; tampilStaf?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-heading">{u.judul}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tampilStaf && `${u.stafNama} · `}
            {labelRentang(u)}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <Lencana nada={NADA_USULAN[u.status]}>{LABEL_USULAN[u.status]}</Lencana>
          {sebagai === "staf" && u.status === "diajukan" && (
            <TombolAksi aksi={batalkanUsulan.bind(null, u.id)} konfirmasi="Batalkan usulan ini?" varian="ghost" ukuran="icon" label="Batalkan usulan">
              <Trash2 className="size-4" />
            </TombolAksi>
          )}
        </span>
      </div>
      {u.uraian && <p className="mt-2 text-sm text-muted-foreground">{u.uraian}</p>}
      {u.status === "ditolak" && u.alasanTolak && (
        <p className="mt-2 text-xs font-medium text-flame-600">
          Ditolak{u.pemutusNama ? ` ${u.pemutusNama}` : ""}: {u.alasanTolak}
        </p>
      )}
      {sebagai === "atasan" && u.status === "diajukan" && (
        <div className="mt-3">
          <PutusanTugas ids={[u.id]} aksi={putuskanUsulan} />
        </div>
      )}
    </div>
  );
}
