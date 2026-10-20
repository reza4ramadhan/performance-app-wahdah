"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon, type NamaIkon } from "./ikon";

const MENU: { judul: string; item: { href: string; label: string; ikon: NamaIkon }[] }[] = [
  { judul: "Ringkasan", item: [{ href: "/", label: "Dasbor", ikon: "dasbor" }] },
  {
    judul: "Penilaian",
    item: [
      { href: "/input/k1", label: "Realisasi K1", ikon: "target" },
      { href: "/absensi", label: "Absensi K2", ikon: "kalender" },
      { href: "/input/k3", label: "Perilaku K3", ikon: "bintang" },
    ],
  },
  { judul: "Pengaturan", item: [{ href: "/parameter", label: "Parameter", ikon: "pengaturan" }] },
];

const aktif = (path: string, href: string) => (href === "/" ? path === "/" || path.startsWith("/pegawai") : path.startsWith(href));

export function Merek({ kecil = false }: { kecil?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-wi-100 ${kecil ? "h-9 w-9" : "h-11 w-11"}`}>
        <Image src="/logo-wahdah.jpg" alt="Logo Wahdah Islamiyah" width={44} height={41} className="h-auto w-[88%]" priority />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-tinta dark:text-white">IKP Pegawai</span>
        <span className="block text-xs text-wi-700 dark:text-wi-300">Kantor Pusat Wahdah</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-wi-100 bg-white px-4 py-5 lg:flex dark:border-wi-900 dark:bg-wi-950">
      <Merek />
      <nav className="mt-8 flex-1 space-y-6" aria-label="Menu utama">
        {MENU.map((g) => (
          <div key={g.judul}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{g.judul}</p>
            <ul className="space-y-1">
              {g.item.map((m) => {
                const on = aktif(path, m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        on
                          ? "bg-wi-50 text-wi-700 dark:bg-wi-900 dark:text-wi-200"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-wi-900/50 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Ikon nama={m.ikon} className={`h-5 w-5 ${on ? "text-wi-600 dark:text-wi-300" : ""}`} />
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="rounded-2xl bg-gradient-to-br from-wi-600 to-wi-800 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-emas-300">Pedoman KPI</p>
        <p className="mt-1 text-sm font-medium">Draf 3 · 1 Oktober 2026</p>
        <p className="mt-1 text-xs text-wi-100">Belum disahkan. Bobot dan ambang bisa berubah.</p>
        <Link href="/parameter" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-wi-700">
          Lihat parameter <Ikon nama="panah" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}

/** Navigasi ponsel/tablet: baris tab yang bisa digulir di bawah bilah atas. */
export function NavPonsel() {
  const path = usePathname();
  const semua = MENU.flatMap((g) => g.item);
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Menu utama">
      {semua.map((m) => {
        const on = aktif(path, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
              on ? "bg-wi-600 text-white" : "bg-white text-zinc-600 ring-1 ring-wi-100 dark:bg-wi-950 dark:text-zinc-300 dark:ring-wi-900"
            }`}
          >
            <Ikon nama={m.ikon} className="h-4 w-4" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
