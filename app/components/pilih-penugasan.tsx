import Link from "next/link";
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
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{u.nama}</p>
            <ul className="space-y-0.5">
              {di.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${basis}?pn=${t.id}`}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                      t.id === terpilih ? "bg-emerald-700 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>
                      {pegawai.get(t.pegawaiId)} <span className="opacity-70">({t.peran})</span>
                    </span>
                    {sudah(t.id) && <span aria-label="sudah diisi">✓</span>}
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
