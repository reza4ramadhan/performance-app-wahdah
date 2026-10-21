import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { asc, ilike, or } from "drizzle-orm";
import { ChevronRight, Search } from "lucide-react";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { kelasPilihan } from "@/components/app/kolom";
import { Avatar, Kartu, Kepala, Kerangka, Lencana } from "@/components/app/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { tambahPegawai } from "@/app/aksi/admin";
import { getDb, schema as s } from "@/lib/db";
import { kelompokkan } from "@/lib/format";
import { LABEL_PERAN_SISTEM, PERAN_SISTEM } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";

export const metadata: Metadata = { title: "Pegawai & akun" };

export default function HalamanAdminPegawai(props: PageProps<"/admin/pegawai">) {
  return (
    <>
      <Kepala judul="Pegawai & akun" kembali="/tim" sub="Login memakai NIP (atau No. HP bila NIP kosong). Akun baru wajib mengganti password saat login pertama." />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await wajibPeran("admin");
  const q = String((await searchParams).q ?? "").trim();
  const db = await getDb();
  const [pegawai, peran] = await Promise.all([
    db
      .select()
      .from(s.pegawai)
      .where(q ? or(ilike(s.pegawai.nama, `%${q}%`), ilike(s.pegawai.nip, `%${q}%`), ilike(s.pegawai.noHp, `%${q}%`)) : undefined)
      .orderBy(asc(s.pegawai.nama)),
    db.select().from(s.peranSistem),
  ]);
  const peranPer = kelompokkan(peran, (p) => p.pegawaiId);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="order-2 lg:order-1">
        <Form action="/admin/pegawai" className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Cari nama, NIP, atau No. HP" className="pl-10" aria-label="Cari pegawai" />
        </Form>
        <p className="mb-2 text-sm text-muted-foreground">{pegawai.length} pegawai</p>
        <ul className="space-y-2">
          {pegawai.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pegawai/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 hover:border-primary/30">
                <Avatar nama={p.nama} ukuran="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-heading">{p.nama}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.nip ?? p.noHp} · {p.statusKepegawaian} · {p.kantor === "jakarta" ? "Jakarta" : "Makassar"}
                  </span>
                </span>
                <span className="hidden flex-wrap justify-end gap-1 sm:flex">
                  {!p.aktif && <Lencana nada="flame">Nonaktif</Lencana>}
                  {(peranPer.get(p.id) ?? []).map((r) => (
                    <Lencana key={r.peran} nada="brand">
                      {LABEL_PERAN_SISTEM[r.peran]}
                    </Lencana>
                  ))}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Kartu className="order-1 lg:order-2 lg:sticky lg:top-8">
        <h2 className="text-[15px] font-semibold text-heading">Tambah pegawai</h2>
        <FormAksi aksi={tambahPegawai} tombol="Buat pegawai & akun" tombolPenuh pesanTetap className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">Nama lengkap</span>
            <Input name="nama" required />
            <Galat nama="nama" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">NIP</span>
              <Input name="nip" inputMode="numeric" />
              <Galat nama="nip" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">No. HP</span>
              <Input name="noHp" inputMode="tel" placeholder="08…" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Status</span>
              <select name="statusKepegawaian" className={kelasPilihan} defaultValue="Kontrak">
                {["Mutafarrigh", "Muta'awin", "Kontrak"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-heading">Kantor</span>
              <select name="kantor" className={kelasPilihan} defaultValue="makassar">
                <option value="makassar">Makassar (WITA)</option>
                <option value="jakarta">Jakarta (WIB)</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-heading">Peran sistem tambahan</legend>
            <div className="grid grid-cols-2 gap-x-3">
              {PERAN_SISTEM.filter((p) => p !== "pegawai").map((p) => (
                <label key={p} className="flex min-h-10 items-center gap-2 text-sm">
                  <Checkbox name="peran" value={p} className="size-5" /> {LABEL_PERAN_SISTEM[p]}
                </label>
              ))}
            </div>
          </fieldset>
        </FormAksi>
      </Kartu>
    </div>
  );
}
