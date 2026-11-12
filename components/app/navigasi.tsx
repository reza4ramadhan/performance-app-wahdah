"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { IKON_MENU } from "./ikon-menu";
import { TombolTema } from "./tema";
import { Hitungan } from "./ui";
import { cn } from "@/lib/utils";
import type { GrupMenu, TabBawah } from "@/lib/menu";



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

export function Sidebar({ grup, nama, peran, lencana = {} }: { grup: GrupMenu[]; nama: string; peran: string; lencana?: Record<string, number> }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center justify-between gap-2 pt-5 pr-3 pb-4 pl-5">
        <Merek />
        <TombolTema />
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
                      <span className="flex-1">{m.label}</span>
                      <Hitungan n={lencana[m.lencana ?? m.href] ?? 0} className="h-5 min-w-5 text-[11px]" />
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

/**
 * Navigasi bawah ponsel: tab sesuai peran (lib/menu.ts), tombol Catat di tengah bila ada, lencana jumlah per href.
 * `mengambang`: bilah membulat yang melayang di atas konten; tab aktif jadi pil berwarna utama.
 */
export function NavBawah({ tab: daftar, onCatat, lencana = {}, mengambang = false }: { tab: TabBawah[]; onCatat?: () => void; lencana?: Record<string, number>; mengambang?: boolean }) {
  const path = usePathname();
  if (mengambang)
    return (
      <nav aria-label="Navigasi utama" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <ul className="pointer-events-auto mx-auto flex max-w-md items-stretch gap-1 rounded-[1.75rem] border border-border/80 bg-card/92 p-1.5 shadow-[0_18px_40px_-16px_rgb(8_41_47/0.45),0_2px_8px_rgb(8_41_47/0.08)] backdrop-blur-xl dark:shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]">
          {daftar.map((t) => {
            const Ikon = IKON_MENU[t.ikon];
            const on = aktif(path, t.href);
            const jumlah = lencana[t.href] ?? 0;
            return (
              <li key={t.href} className="flex flex-1">
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  aria-label={jumlah ? `${t.label}, ${jumlah} perlu tindakan` : undefined}
                  className={cn(
                    "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.375rem] text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted-foreground active:bg-muted",
                  )}
                >
                  <span className="relative">
                    <Ikon className="size-[21px]" strokeWidth={on ? 2.2 : 1.8} />
                    <Hitungan n={jumlah} className={cn("absolute -top-1.5 left-3.5 ring-2", on ? "ring-primary" : "ring-card")} />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  const tab = onCatat ? [...daftar.slice(0, 2), null, ...daftar.slice(2)] : daftar;
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
            <TautanTab key={t.href} tab={t} on={aktif(path, t.href)} jumlah={lencana[t.href] ?? 0} />
          ),
        )}
      </ul>
    </nav>
  );
}

function TautanTab({ tab, on, jumlah }: { tab: TabBawah; on: boolean; jumlah: number }) {
  const Ikon = IKON_MENU[tab.ikon];
  return (
    <li className="flex flex-1">
      <Link
        href={tab.href}
        aria-current={on ? "page" : undefined}
        aria-label={jumlah ? `${tab.label}, ${jumlah} menunggu` : undefined}
        className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", on ? "text-primary" : "text-muted-foreground")}
      >
        <span className="relative">
          <Ikon className="size-[22px]" strokeWidth={on ? 2.2 : 1.8} />
          <Hitungan n={jumlah} className="absolute -top-1.5 left-3.5 ring-2 ring-card" />
        </span>
        {tab.label}
      </Link>
    </li>
  );
}
