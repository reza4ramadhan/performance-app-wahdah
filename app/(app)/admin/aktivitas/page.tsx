import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Activity, ChevronLeft, ChevronRight, ClipboardCheck, FileDown, ListChecks, NotebookPen, X } from "lucide-react";
import { ChipFilter } from "@/components/app/filter";
import { Batang, Kartu, Kepala, Kerangka, Kosong, Lencana, Statistik, tabel } from "@/components/app/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aktivitasK1, beraktivitas, type AktivitasPegawai } from "@/lib/data/aktivitas";
import { persenBulat } from "@/lib/format";
import { wajibPeran } from "@/lib/sesi";
import { geserRentang, hariIni, rentangTanggal, type JenisRentang } from "@/lib/waktu";
import { bacaParam, cariParam, labelRentang, saringPegawai, type Param } from "./param";

export const metadata: Metadata = { title: "Aktivitas K1" };

export default function HalamanAktivitas(props: PageProps<"/admin/aktivitas">) {
  return (
    <>
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibPeran("admin");
  const today = hariIni(sesi.kantor);
  const p = bacaParam(await searchParams, today);
  const { awal, akhir } = rentangTanggal(p.rentang, p.tanggal);
  const r = await aktivitasK1(awal, akhir);
  const q = (o: Partial<Param>) => `/admin/aktivitas?${cariParam({ ...p, ...o })}`;

  const label = labelRentang(p);
  const sebelum = geserRentang(p.rentang, p.tanggal, -1);
  const sesudah = geserRentang(p.rentang, p.tanggal, 1);
  const { filterBidang, dalamBidang, tampil } = saringPegawai(r.pegawai, r.bidang, p);

  return (
    <>
      <Kepala
        judul="Aktivitas K1"
        sub="Pegawai yang mencatat item indikator, menyelesaikan tugas khusus, atau mengisi jurnal."
        aksi={
          <a href={`/admin/aktivitas/cetak?${cariParam(p)}`} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
            <FileDown className="size-4" /> Ekspor PDF
          </a>
        }
      />
      <ChipFilter
        pilihan={[
          { nilai: "hari", label: "Hari" },
          { nilai: "pekan", label: "Pekan" },
          { nilai: "bulan", label: "Bulan" },
        ]}
        aktif={p.rentang}
        href={(v) => q({ rentang: v as JenisRentang })}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={q({ tanggal: sebelum })} aria-label="Sebelumnya" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ChevronLeft className="size-4" />
        </Link>
        <p className="min-w-0 flex-1 text-center font-semibold text-heading sm:flex-none sm:px-2">{label}</p>
        {sesudah <= today ? (
          <Link href={q({ tanggal: sesudah })} aria-label="Berikutnya" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={`${buttonVariants({ variant: "outline", size: "icon" })} pointer-events-none opacity-40`}>
            <ChevronRight className="size-4" />
          </span>
        )}
        <Form action="/admin/aktivitas" className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <input type="hidden" name="rentang" value={p.rentang} />
          <input type="hidden" name="tampil" value={p.tampil} />
          <input type="hidden" name="status" value={p.status} />
          {p.bidang && <input type="hidden" name="bidang" value={p.bidang} />}
          <Input type="date" name="tanggal" defaultValue={p.tanggal} max={today} aria-label="Pilih tanggal" className="min-w-0 flex-1 sm:w-44" />
          <Button type="submit" variant="outline" className="h-11">
            Tampilkan
          </Button>
        </Form>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistik ikon={Activity} nada="mint" label="Pegawai beraktivitas" nilai={`${r.total.aktif}/${r.total.pegawai}`} />
        <Statistik ikon={ListChecks} nada="brand" label="Item dicatat" nilai={r.total.item} />
        <Statistik ikon={ClipboardCheck} nada="gold" label="Tugas khusus selesai" nilai={r.total.tugas} />
        <Statistik ikon={NotebookPen} nada="ink" label="Entri jurnal" nilai={r.total.jurnal} />
      </div>

      <ChipFilter
        pilihan={[
          { nilai: "nama", label: "Per nama" },
          { nilai: "bidang", label: "Per bidang kerja" },
        ]}
        aktif={p.tampil}
        href={(v) => q({ tampil: v as Param["tampil"] })}
      />

      {!r.total.pegawai ? (
        <Kosong ikon={Activity} judul="Belum ada pegawai dengan penugasan pada rentang ini" />
      ) : p.tampil === "bidang" ? (
        <PerBidang r={r} href={(id) => q({ tampil: "nama", bidang: id, status: "semua" })} />
      ) : (
        <Kartu>
          {filterBidang && (
            <p className="mb-3 flex items-center gap-2 text-sm">
              Bidang: <strong className="text-heading">{filterBidang.nama}</strong>
              <Link href={q({ bidang: "" })} aria-label="Hapus filter bidang" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </Link>
            </p>
          )}
          <ChipFilter
            pilihan={[
              { nilai: "semua", label: "Semua", jumlah: dalamBidang.length },
              { nilai: "aktif", label: "Beraktivitas", jumlah: dalamBidang.filter(beraktivitas).length },
              { nilai: "belum", label: "Belum ada", jumlah: dalamBidang.filter((x) => !beraktivitas(x)).length },
            ]}
            aktif={p.status}
            href={(v) => q({ status: v as Param["status"] })}
          />
          {tampil.length ? <PerNama pegawai={tampil} harian={p.rentang === "hari"} /> : <p className="py-4 text-sm text-muted-foreground">Tidak ada pegawai.</p>}
        </Kartu>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Item dihitung dari tanggal dicatat, tugas khusus dari tanggal ditandai selesai, jurnal dari tanggal jurnal (zona kantor pegawai). Kepala Kantor dan Wakil Kepala Kantor tidak
        termasuk.
      </p>
    </>
  );
}

function PerNama({ pegawai, harian }: { pegawai: AktivitasPegawai[]; harian: boolean }) {
  const status = (x: AktivitasPegawai) => (beraktivitas(x) ? <Lencana nada="mint">Beraktivitas</Lencana> : <Lencana nada="flame">Belum ada</Lencana>);
  const hari = (x: AktivitasPegawai) => `${x.hariAktif}/${x.hariKerja}`;
  return (
    <>
      {/* Ponsel: daftar; desktop: tabel */}
      <ul className="divide-y divide-border lg:hidden">
        {pegawai.map((x) => (
          <li key={x.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/admin/pegawai/${x.id}`} className="min-w-0 font-medium text-heading">
                {x.nama}
              </Link>
              {status(x)}
            </div>
            <p className="text-xs text-muted-foreground">{x.bidang.map((b) => b.nama).join(" · ")}</p>
            <p className="mt-1 text-sm tabular-nums">
              Item {x.item} · Tugas {x.tugas} · Jurnal {x.jurnal}
              {!harian && <span className="text-muted-foreground"> · hari aktif {hari(x)}</span>}
            </p>
          </li>
        ))}
      </ul>
      <div className={`${tabel.bungkus} hidden lg:block`}>
        <table className="w-full text-sm">
          <thead className={tabel.kepala}>
            <tr>
              <th className={tabel.th}>Nama</th>
              <th className={tabel.th}>Bidang kerja</th>
              <th className={`${tabel.th} text-right`}>Item</th>
              <th className={`${tabel.th} text-right`}>Tugas</th>
              <th className={`${tabel.th} text-right`}>Jurnal</th>
              {!harian && <th className={`${tabel.th} text-right`}>Hari aktif</th>}
              <th className={tabel.th}>Status</th>
            </tr>
          </thead>
          <tbody className={tabel.badan}>
            {pegawai.map((x) => (
              <tr key={x.id}>
                <td className={`${tabel.td} font-medium text-heading`}>
                  <Link href={`/admin/pegawai/${x.id}`} className="hover:text-primary">
                    {x.nama}
                  </Link>
                </td>
                <td className={`${tabel.td} text-muted-foreground`}>{x.bidang.map((b) => b.nama).join(", ")}</td>
                <td className={tabel.angka}>{x.item}</td>
                <td className={tabel.angka}>{x.tugas}</td>
                <td className={tabel.angka}>{x.jurnal}</td>
                {!harian && <td className={tabel.angka}>{hari(x)}</td>}
                <td className={tabel.td}>{status(x)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!harian && <p className="mt-3 text-xs text-muted-foreground">Hari aktif = tanggal dengan aktivitas / hari kerja dalam rentang sampai hari ini.</p>}
    </>
  );
}

function PerBidang({ r, href }: { r: Awaited<ReturnType<typeof aktivitasK1>>; href: (id: string) => string }) {
  const nada = (x: number | null) => ((x ?? 0) >= 0.8 ? "mint" : "gold");
  return (
    <Kartu>
      <ul className="space-y-4 lg:hidden">
        {r.bidang.map((b) => {
          const rasio = b.pegawai ? b.aktif / b.pegawai : null;
          return (
            <li key={b.id}>
              <Link href={href(b.id)} className="block">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-heading">{b.nama}</p>
                  <p className="text-sm font-bold tabular-nums text-heading">
                    {b.aktif}/{b.pegawai}
                  </p>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Item {b.item} · Tugas {b.tugas} · Jurnal {b.jurnal}
                </p>
                <Batang nilai={(rasio ?? 0) * 100} nada={nada(rasio)} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={`${tabel.bungkus} hidden lg:block`}>
        <table className="w-full text-sm">
          <thead className={tabel.kepala}>
            <tr>
              <th className={tabel.th}>Bidang kerja</th>
              <th className={tabel.th}>Pegawai beraktivitas</th>
              <th className={`${tabel.th} text-right`}>Item</th>
              <th className={`${tabel.th} text-right`}>Tugas</th>
              <th className={`${tabel.th} text-right`}>Jurnal</th>
            </tr>
          </thead>
          <tbody className={tabel.badan}>
            {r.bidang.map((b) => {
              const rasio = b.pegawai ? b.aktif / b.pegawai : null;
              return (
                <tr key={b.id}>
                  <td className={`${tabel.td} font-medium text-heading`}>
                    <Link href={href(b.id)} className="hover:text-primary">
                      {b.nama}
                    </Link>
                  </td>
                  <td className={tabel.td}>
                    <div className="flex items-center gap-2">
                      <Batang nilai={(rasio ?? 0) * 100} nada={nada(rasio)} className="w-32" />
                      <span className="tabular-nums">
                        {b.aktif}/{b.pegawai} · {persenBulat(rasio)}
                      </span>
                    </div>
                  </td>
                  <td className={tabel.angka}>{b.item}</td>
                  <td className={tabel.angka}>{b.tugas}</td>
                  <td className={tabel.angka}>{b.jurnal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Klik bidang untuk melihat daftar namanya. Pegawai rangkap dihitung di setiap bidang tempat ia bertugas.</p>
    </Kartu>
  );
}
