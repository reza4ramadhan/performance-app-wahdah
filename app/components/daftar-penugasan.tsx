import Link from "next/link";
import type { Db } from "@/lib/data/schema";
import { penugasanBerlaku } from "@/lib/data/store";
import { labelPeriode } from "@/lib/format";
import { Ikon } from "./ikon";
import { Avatar, Panel } from "./ui";

/** Pilih penugasan yang akan diisi; dikelompokkan per unit dengan tanda sudah/belum. */
export function DaftarPenugasan({
  db,
  periodeId,
  terpilih,
  basis,
  sudah,
}: {
  db: Db;
  periodeId: string;
  terpilih?: string;
  basis: string;
  sudah: (penugasanId: string) => boolean;
}) {
  const nama = new Map(db.pegawai.map((p) => [p.id, p.nama]));
  const daftar = penugasanBerlaku(db, periodeId).filter((t) => !db.pegawai.find((p) => p.id === t.pegawaiId)?.pimpinan);
  const selesai = daftar.filter((t) => sudah(t.id)).length;

  return (
    <Panel judul={labelPeriode(periodeId)} aksi={<span className="text-xs font-medium tabular-nums text-muted">{selesai}/{daftar.length} terisi</span>}>
      <nav aria-label="Daftar penugasan" className="-mx-2 space-y-4 text-sm">
        {db.units.map((u) => {
          const di = daftar.filter((t) => t.unitId === u.id);
          if (!di.length) return null;
          return (
            <div key={u.id}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{u.nama}</p>
              <ul className="space-y-0.5">
                {di.map((t) => {
                  const on = t.id === terpilih;
                  const isi = sudah(t.id);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`${basis}?pn=${t.id}`}
                        aria-current={on ? "true" : undefined}
                        className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${on ? "bg-brand-500/10 ring-1 ring-brand-500/30" : "hover:bg-surface-2"}`}
                      >
                        <Avatar nama={nama.get(t.pegawaiId) ?? "?"} ukuran="sm" />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate font-medium text-ink">{nama.get(t.pegawaiId)}</span>
                          <span className="block text-xs text-muted">{t.peran}</span>
                        </span>
                        <span
                          className={`grid size-5 place-items-center rounded-full ${isi ? "bg-mint-500 text-white" : "border-2 border-dashed border-line"}`}
                          title={isi ? "Sudah diisi" : "Belum diisi"}
                        >
                          {isi && <Ikon nama="centang" className="size-3" />}
                          <span className="sr-only">{isi ? "sudah diisi" : "belum diisi"}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </Panel>
  );
}
