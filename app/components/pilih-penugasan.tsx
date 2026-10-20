import Link from "next/link";
import { Ikon } from "./ikon";
import { Avatar } from "./ui";
import type { Db } from "@/lib/data/schema";
import { penugasanBerlaku } from "@/lib/data/store";

/** Daftar penugasan dikelompokkan per unit, untuk memilih yang akan diisi. */
export function PilihPenugasan({ db, periodeId, terpilih, basis, sudah }: {
  db: Db;
  periodeId: string;
  terpilih?: string;
  basis: string;
  sudah: (penugasanId: string) => boolean;
}) {
  const pegawai = new Map(db.pegawai.map((p) => [p.id, p.nama]));
  const daftar = penugasanBerlaku(db, periodeId);
  return (
    <nav className="space-y-4 text-sm">
      {db.units.map((u) => {
        const di = daftar.filter((t) => t.unitId === u.id);
        if (!di.length) return null;
        return (
          <div key={u.id}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{u.nama}</p>
            <ul className="space-y-0.5">
              {di.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${basis}?pn=${t.id}`}
                    aria-current={t.id === terpilih ? "true" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${
                      t.id === terpilih ? "bg-wi-50 ring-1 ring-wi-200 dark:bg-wi-900 dark:ring-wi-700" : "hover:bg-wi-50/70 dark:hover:bg-wi-900/50"
                    }`}
                  >
                    <Avatar nama={pegawai.get(t.pegawaiId) ?? "?"} kecil />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate font-medium">{pegawai.get(t.pegawaiId)}</span>
                      <span className="block text-xs text-zinc-500">{t.peran}</span>
                    </span>
                    {sudah(t.id) ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-menara-500 text-white" title="Sudah diisi">
                        <Ikon nama="centang" className="h-3 w-3" />
                        <span className="sr-only">sudah diisi</span>
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700" title="Belum diisi">
                        <span className="sr-only">belum diisi</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
