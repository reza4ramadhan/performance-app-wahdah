import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { and, count, ilike, inArray, or, sql } from "drizzle-orm";
import { ListChecks, Search } from "lucide-react";
import { KartuItem } from "@/components/app/baris-item";
import { ChipFilter } from "@/components/app/filter";
import { TombolCatat } from "@/components/app/tombol-catat";
import { Kepala, Kerangka, Kosong } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { getDb, schema as s } from "@/lib/db";
import { daftarItem } from "@/lib/data/item";
import { STATUS_ITEM, type StatusItem } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";

export const metadata: Metadata = { title: "Item" };

const FILTER = [
  { nilai: "aktif", label: "Terbuka & ditolak" },
  { nilai: "diajukan", label: "Menunggu verifikasi" },
  { nilai: "ditolak", label: "Ditolak" },
  { nilai: "disetujui", label: "Selesai" },
  { nilai: "semua", label: "Semua" },
];

export default function HalamanItem(props: PageProps<"/item">) {
  return (
    <>
      <Kepala judul="Item saya" sub="Setiap item yang dicatat menjadi target dan realisasi K1." aksi={<span className="hidden lg:block"><TombolCatat /></span>} />
      <Suspense fallback={<Kerangka />}>
        <Isi searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesi = await wajibSesi();
  const sp = await searchParams;
  const status = String(sp.status ?? "aktif") === "terbuka" ? "aktif" : String(sp.status ?? "aktif");
  const q = String(sp.q ?? "").trim();
  const pnIds = sesi.penugasan.map((p) => p.id);
  const milik = inArray(s.item.penugasanId, pnIds.length ? pnIds : ["-"]);

  const daftarStatus: StatusItem[] =
    status === "aktif" ? ["terbuka", "ditolak"] : STATUS_ITEM.includes(status as StatusItem) ? [status as StatusItem] : [...STATUS_ITEM];
  const cari = q
    ? or(sql`${s.item.data}::text ilike ${`%${q}%`}`, ilike(s.item.indikatorKode, `%${q}%`))
    : undefined;

  const db = await getDb();
  const [items, jumlah] = await Promise.all([
    daftarItem(and(milik, inArray(s.item.status, daftarStatus), cari), { kantor: sesi.kantor, batas: 200 }),
    db.select({ status: s.item.status, n: count() }).from(s.item).where(milik).groupBy(s.item.status),
  ]);
  const n = (...st: StatusItem[]) => jumlah.filter((j) => st.includes(j.status)).reduce((a, j) => a + j.n, 0);
  const jumlahFilter: Record<string, number> = { aktif: n("terbuka", "ditolak"), diajukan: n("diajukan"), ditolak: n("ditolak"), disetujui: n("disetujui"), semua: n(...STATUS_ITEM) };
  const href = (v: string) => `/item?status=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <Form action="/item" className="relative mb-3">
        <input type="hidden" name="status" value={status} />
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" type="search" defaultValue={q} placeholder="Cari perihal, judul, atau kode…" className="pl-10" aria-label="Cari item" />
      </Form>
      <ChipFilter pilihan={FILTER.map((f) => ({ ...f, jumlah: jumlahFilter[f.nilai] }))} aktif={status} href={href} />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <KartuItem item={i} />
            </li>
          ))}
        </ul>
      ) : (
        <Kosong ikon={ListChecks} judul={q ? `Tidak ada item yang cocok dengan “${q}”` : "Belum ada item di sini"}>
          {status === "aktif" ? "Semua item sudah diajukan. Catat item baru dengan tombol +." : null}
        </Kosong>
      )}
    </>
  );
}
