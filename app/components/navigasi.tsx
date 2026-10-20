"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon, type NamaIkon } from "./ikon";

type Item = { href: string; label: string; ikon: NamaIkon };

const GRUP: { judul: string; item: Item[] }[] = [
  {
    judul: "Ringkasan",
    item: [
      { href: "/", label: "Dasbor", ikon: "dasbor" },
      { href: "/pegawai", label: "Pegawai", ikon: "pegawai" },
    ],
  },
  {
    judul: "Penilaian bulanan",
    item: [
      { href: "/input/k1", label: "Capaian K1", ikon: "target" },
      { href: "/absensi", label: "Absensi K2", ikon: "kalender" },
      { href: "/input/k3", label: "Perilaku K3", ikon: "bintang" },
    ],
  },
  { judul: "Pengaturan", item: [{ href: "/parameter", label: "Parameter", ikon: "atur" }] },
];

const SEMUA = GRUP.flatMap((g) => g.item);
const aktif = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function Merek({ ringkas = false }: { ringkas?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-500">
      <span className={`grid shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line ${ringkas ? "size-9" : "size-11"}`}>
        <Image src="/logo-wahdah.jpg" alt="Logo Wahdah Islamiyah" width={40} height={37} className="w-[86%]" priority />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-ink">IKP Pegawai</span>
        <span className="block text-xs text-brand-600 dark:text-brand-300">Kantor Pusat Wahdah</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
      <Merek />
      <nav aria-label="Menu utama" className="mt-8 flex-1 space-y-6 overflow-y-auto">
        {GRUP.map((g) => (
          <div key={g.judul}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g.judul}</p>
            <ul className="space-y-1">
              {g.item.map((m) => {
                const on = aktif(path, m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        on ? "bg-brand-500/10 text-brand-700 dark:text-brand-200" : "text-muted hover:bg-surface-2 hover:text-body"
                      }`}
                    >
                      <Ikon nama={m.ikon} className={`size-5 ${on ? "text-brand-600 dark:text-brand-300" : ""}`} />
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 p-4 text-white">
        <span aria-hidden className="absolute -top-6 -right-6 size-20 rounded-full bg-white/10" />
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">Pedoman KPI</p>
        <p className="mt-1 text-sm font-semibold">Draf 3 · 1 Oktober 2026</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-100">Belum disahkan. Bobot, target, dan ambang masih bisa berubah.</p>
        <Link href="/parameter" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700">
          Lihat parameter <Ikon nama="kanan" className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}

/** Ponsel/tablet: tab yang bisa digulir di bawah bilah atas. */
export function TabPonsel() {
  const path = usePathname();
  return (
    <nav aria-label="Menu utama" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
      {SEMUA.map((m) => {
        const on = aktif(path, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
              on ? "bg-brand-600 text-white ring-brand-600" : "bg-surface text-muted ring-line"
            }`}
          >
            <Ikon nama={m.ikon} className="size-4" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
