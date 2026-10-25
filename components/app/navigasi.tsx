"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, ClipboardCheck, House, ListChecks, Plus, UserRound, Users } from "lucide-react";
import { IKON_MENU } from "./ikon-menu";
import { cn } from "@/lib/utils";
import type { GrupMenu } from "@/lib/menu";



const aktif = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function Merek({ kecil = false }: { kecil?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-border", kecil ? "size-9" : "size-10")}>
        <Image src="/logo-wahdah.jpg" alt="Logo Wahdah Islamiyah" width={36} height={34} className="w-[86%]" priority />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-heading">IKP Pegawai</span>
        <span className="block text-xs text-primary">Kantor Pusat Wahdah</span>
      </span>
    </Link>
  );
}

export function Sidebar({ grup, nama, peran }: { grup: GrupMenu[]; nama: string; peran: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="px-5 pt-5 pb-4">
        <Merek />
      </div>
      <nav aria-label="Menu utama" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {grup.map((g) => (
          <div key={g.judul}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{g.judul}</p>
            <ul className="space-y-0.5">
              {g.item.map((m) => {
                const Ikon = IKON_MENU[m.ikon];
                // Hanya tautan paling spesifik yang aktif (mis. /tugas/usulan tidak ikut menyalakan /tugas).
                const on = aktif(path, m.href) && !g.item.some((x) => x.href.length > m.href.length && aktif(path, x.href));
                return (
                  <li key={m.href + m.label}>
                    <Link
                      href={m.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Ikon className="size-[18px]" strokeWidth={1.9} />
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <Link href="/akun" className="m-3 flex items-center gap-3 rounded-2xl bg-muted/70 p-3 transition hover:bg-muted">
        <span className="grid size-9 place-items-center rounded-full bg-gold-400 text-sm font-bold text-ink">{nama.slice(0, 1)}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-heading">{nama}</span>
          <span className="block truncate text-xs text-muted-foreground">{peran}</span>
        </span>
      </Link>
    </aside>
  );
}

/** Navigasi bawah ponsel: 4 tab + tombol Catat di tengah (+ tab Tim/Kelola bila berperan). */
export function NavBawah({ kelola, labelKelola, tabUtama, onCatat }: { kelola: boolean; labelKelola: string; tabUtama: { href: string; label: string }; onCatat: () => void }) {
  const path = usePathname();
  const tab = [
    { href: "/", label: "Hari Ini", Ikon: House },
    { ...tabUtama, Ikon: tabUtama.href === "/tugas" ? ClipboardCheck : ListChecks },
    null,
    { href: "/progres", label: "Progres", Ikon: ChartColumn },
    ...(kelola ? [{ href: "/tim", label: labelKelola, Ikon: Users }] : []),
    { href: "/akun", label: "Akun", Ikon: UserRound },
  ];
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tab.map((t) =>
          t === null ? (
            <li key="catat" className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={onCatat}
                aria-label="Catat item baru"
                className="-mt-5 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition active:scale-95"
              >
                <Plus className="size-7" strokeWidth={2.4} />
              </button>
            </li>
          ) : (
            <li key={t.href} className="flex flex-1">
              <Link
                href={t.href}
                aria-current={aktif(path, t.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  aktif(path, t.href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <t.Ikon className="size-[22px]" strokeWidth={aktif(path, t.href) ? 2.2 : 1.8} />
                {t.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
