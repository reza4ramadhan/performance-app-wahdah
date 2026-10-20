import Link from "next/link";
import { Suspense } from "react";
import { majukanStatus } from "./actions";
import { AksiForm } from "./components/aksi-form";
import { BatangMendatar, BatangTegak } from "./components/grafik";
import { Ikon } from "./components/ikon";
import { labelPenugasan, tindakan } from "./components/label";
import { Avatar, Kemajuan, Kerangka, KepalaHalaman, Kosong, Lencana, LencanaPredikat, Panel, Statistik, TautanPanel } from "./components/ui";
import { URUTAN_STATUS } from "@/lib/data/schema";
import { getDb, hasilPeriode, penugasanBerlaku, periodeAktif } from "@/lib/data/store";
import { angka, labelPeriode, rupiah } from "@/lib/format";
import type { HasilPegawai } from "@/lib/kpi/engine";
import { DAFTAR_PREDIKAT, type StatusPeriode } from "@/lib/kpi/types";

export default function Dasbor() {
  return (
    <Suspense fallback={<Kerangka />}>
      <IsiDasbor />
    </Suspense>
  );
}

async function IsiDasbor() {
  const db = await getDb();
  const periode = periodeAktif(db);
  const hasil = hasilPeriode(db, periode.id);
  const namaUnit = new Map(db.units.map((u) => [u.id, u.nama]));

  const dinilai = hasil.filter((h) => !h.hanyaK2);
  const lengkap = dinilai.filter((h) => h.ikpAkhir !== null);
  const rataIkp = lengkap.length ? lengkap.reduce((a, h) => a + h.ikpAkhir!, 0) / lengkap.length : null;
  const totalTunjangan = lengkap.reduce((a, h) => a + (h.tunjangan ?? 0), 0);
  const perluTindakan = dinilai.filter((h) => tindakan(h));

  // Kelengkapan data periode berjalan.
  const di = <T extends { periodeId: string }>(xs: T[]) => xs.filter((x) => x.periodeId === periode.id);
  const pimpinan = new Set(db.pegawai.filter((p) => p.pimpinan).map((p) => p.id));
  const pn = penugasanBerlaku(db, periode.id).filter((t) => !pimpinan.has(t.pegawaiId));
  const terisiK1 = new Set(di(db.realisasi).map((r) => r.penugasanId));
  const terisiK3 = new Set(di(db.skorK3).map((s) => s.penugasanId));
  const adaAbsen = new Set(di(db.absensi).map((a) => a.pegawaiId));
  const adaLog = new Set(di(db.logPengembanganDiri).map((l) => l.pegawaiId));
  const aktif = db.pegawai.filter((p) => p.aktif);
  const staf = aktif.filter((p) => !p.pimpinan);

  const perUnit = db.units.flatMap((u) => {
    const anggota = lengkap.filter((h) => h.penugasan.some((x) => x.unitId === u.id));
    if (!anggota.length) return [];
    const rata = anggota.reduce((a, h) => a + h.ikpAkhir!, 0) / anggota.length;
    return [{ label: u.nama, nilai: rata, ket: `${u.nama}: rata-rata ${angka(rata)} dari ${anggota.length} pegawai` }];
  });

  const kolom: { judul: string; ket: string; aksen: string; isi: HasilPegawai[] }[] = [
    { judul: "Belum lengkap", ket: "IKP belum bisa dihitung", aksen: "bg-surface-2", isi: dinilai.filter((h) => h.ikpAkhir === null) },
    { judul: "Perlu perhatian", ket: "IKP Akhir < 70 atau gugur syarat", aksen: "bg-flame-500/6", isi: lengkap.filter((h) => h.ikpAkhir! < 70 || !h.syarat.lolos) },
    { judul: "Baik", ket: "IKP Akhir 70–89,99", aksen: "bg-gold-400/10", isi: lengkap.filter((h) => h.syarat.lolos && h.ikpAkhir! >= 70 && h.ikpAkhir! < 90) },
    { judul: "Sangat baik", ket: "IKP Akhir ≥ 90", aksen: "bg-brand-500/7", isi: lengkap.filter((h) => h.syarat.lolos && h.ikpAkhir! >= 90) },
  ];

  return (
    <>
      <KepalaHalaman
        judul="Assalamu'alaikum"
        sub={
          <>
            Ringkasan penilaian kinerja <strong className="text-body">{labelPeriode(periode.id)}</strong>.{" "}
            {periode.hasilBeku ? "Hasil akhir sudah disahkan dan terkunci." : "Angka di bawah adalah IKP sementara dan diperbarui setiap ada data baru."}
          </>
        }
      />

      <AlurPeriode periodeId={periode.id} status={periode.status} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik ikon="pegawai" nada="brand" label="IKP lengkap" nilai={`${lengkap.length} / ${dinilai.length}`} ket="pegawai dinilai" />
        <Statistik ikon="grafik" nada="mint" label="Rata-rata IKP Akhir" nilai={angka(rataIkp)} ket={`dari ${lengkap.length} pegawai lengkap`} />
        <Statistik ikon="dompet" nada="gold" label="Kebutuhan tunjangan" nilai={rupiah(totalTunjangan)} ket="sementara, belum final" />
        <Statistik ikon="awas" nada="flame" label="Perlu tindakan" nilai={perluTindakan.length} ket="data kurang atau gugur syarat" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel judul="Kelengkapan data" aksi={<TautanPanel href="/input/k1">Isi data</TautanPanel>}>
          <div className="space-y-5">
            <Kemajuan ikon="target" label="Capaian K1 terisi" nilai={pn.filter((t) => terisiK1.has(t.id)).length} total={pn.length} ket="per penugasan" />
            <Kemajuan ikon="kalender" label="Rekap absensi K2" nilai={aktif.filter((p) => adaAbsen.has(p.id)).length} total={aktif.length} ket="per pegawai, termasuk pimpinan" />
            <Kemajuan ikon="bintang" label="Perilaku K3 dinilai" nilai={pn.filter((t) => terisiK3.has(t.id)).length} total={pn.length} ket="per penugasan, oleh koordinator" />
            <Kemajuan ikon="dokumen" label="Log pengembangan diri" nilai={staf.filter((p) => adaLog.has(p.id)).length} total={staf.length} ket="tanpa log, skor pengembangan diri maks. 2" />
          </div>
        </Panel>

        <Panel judul="Sebaran predikat" aksi={<TautanPanel href="/pegawai">Semua pegawai</TautanPanel>}>
          <p className="mb-4 text-sm text-muted">Jumlah pegawai per predikat, dari {lengkap.length} pegawai dengan IKP lengkap.</p>
          <BatangMendatar
            data={DAFTAR_PREDIKAT.map((p) => {
              const n = lengkap.filter((h) => h.predikat === p).length;
              return { kunci: p, label: <LencanaPredikat predikat={p} />, nilai: n, ket: `${p}: ${n} pegawai` };
            })}
          />
        </Panel>

      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-5">
        <Panel judul="Perlu tindakan" className="xl:col-span-2">
          {perluTindakan.length === 0 ? (
            <Kosong>Semua pegawai lengkap dan memenuhi syarat.</Kosong>
          ) : (
            <ul className="-mx-2 space-y-1">
              {perluTindakan.map((h) => {
                const t = tindakan(h)!;
                return (
                  <li key={h.pegawaiId}>
                    <Link href={`/pegawai/${h.pegawaiId}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                      <Avatar nama={h.nama} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{h.nama}</span>
                        <span className="block truncate text-xs text-muted">{labelPenugasan(h, namaUnit)}</span>
                      </span>
                      <Lencana nada={t.nada}>{t.teks}</Lencana>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel judul="Rata-rata IKP Akhir per unit" className="xl:col-span-3">
          {perUnit.length ? (
            <BatangTegak data={perUnit} judul="Rata-rata IKP Akhir per unit" catatan="Hanya pegawai dengan IKP lengkap. Pegawai rangkap dihitung di setiap unitnya." />
          ) : (
            <Kosong>Belum ada pegawai dengan IKP lengkap.</Kosong>
          )}
        </Panel>
      </div>

      <Panel judul="Papan pegawai" aksi={<TautanPanel href="/pegawai">Lihat tabel</TautanPanel>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kolom.map((k) => (
            <section key={k.judul} className={`rounded-xl p-3 ${k.aksen}`} aria-label={k.judul}>
              <div className="mb-1 flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-ink">{k.judul}</h3>
                <span className="rounded-full bg-surface px-2 text-xs font-semibold tabular-nums text-muted ring-1 ring-line">{k.isi.length}</span>
              </div>
              <p className="mb-3 px-1 text-xs text-muted">{k.ket}</p>
              <ul className="space-y-2">
                {k.isi.map((h) => (
                  <li key={h.pegawaiId}>
                    <Link href={`/pegawai/${h.pegawaiId}`} className="block rounded-xl border border-line bg-surface p-3 transition hover:border-brand-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{h.nama}</span>
                          <span className="block text-xs text-muted">{labelPenugasan(h, namaUnit)}</span>
                        </span>
                        <Avatar nama={h.nama} ukuran="sm" />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                        {h.ikpAkhir !== null ? (
                          <>
                            <span className="font-semibold tabular-nums text-ink">IKP {angka(h.ikpAkhir)}</span>
                            <span className="tabular-nums text-muted">{rupiah(h.tunjangan)}</span>
                          </>
                        ) : (
                          <span className="text-muted">{h.kekurangan[0]}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
                {!k.isi.length && <li className="px-1 pb-1 text-xs text-muted">Tidak ada.</li>}
              </ul>
            </section>
          ))}
        </div>
      </Panel>
    </>
  );
}

function AlurPeriode({ periodeId, status }: { periodeId: string; status: StatusPeriode }) {
  const kini = URUTAN_STATUS.indexOf(status);
  const berikut = URUTAN_STATUS[kini + 1];
  return (
    <Panel className="mb-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="xl:w-44 xl:shrink-0">
          <p className="text-[15px] font-semibold text-ink">Alur periode</p>
          <p className="text-sm text-muted">
            Langkah {kini + 1} dari {URUTAN_STATUS.length}
          </p>
        </div>
        <ol className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:grid-cols-8">
          {URUTAN_STATUS.map((s, i) => {
            const selesai = i < kini;
            const sekarang = i === kini;
            return (
              <li key={s} className="flex items-center gap-2 xl:flex-col xl:items-start" aria-current={sekarang ? "step" : undefined}>
                <span className="flex items-center gap-2 xl:w-full">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      selesai ? "bg-brand-500 text-white" : sekarang ? "bg-gold-400 text-[#1f1b5c] ring-4 ring-gold-400/25" : "bg-surface-2 text-muted ring-1 ring-line"
                    }`}
                  >
                    {selesai ? <Ikon nama="centang" className="size-3.5" /> : i + 1}
                  </span>
                  <span aria-hidden className={`hidden h-0.5 flex-1 rounded xl:block ${selesai ? "bg-brand-500" : "bg-line"} ${i === URUTAN_STATUS.length - 1 ? "invisible" : ""}`} />
                </span>
                <span className={`text-xs leading-tight ${sekarang ? "font-semibold text-ink" : selesai ? "text-body" : "text-muted"}`}>{s}</span>
              </li>
            );
          })}
        </ol>
        {berikut && (
          <div className="xl:shrink-0 [&_form>div]:mt-0">
            <AksiForm
              action={majukanStatus}
              tombol={`Lanjut: ${berikut}`}
              konfirmasi={berikut === "Disahkan" ? "Setelah disahkan, hasil dibekukan dan data periode terkunci. Lanjutkan?" : undefined}
            >
              <input type="hidden" name="periodeId" value={periodeId} />
            </AksiForm>
          </div>
        )}
      </div>
    </Panel>
  );
}
