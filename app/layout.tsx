import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aplikasi IKP — Kantor Pusat Wahdah Islamiyah",
  description: "Penilaian kinerja bulanan pegawai Kantor Pusat Wahdah Islamiyah",
};

const MENU = [
  { href: "/", label: "Dasbor" },
  { href: "/input/k1", label: "Input K1" },
  { href: "/input/k3", label: "Input K3" },
  { href: "/absensi", label: "Absensi K2" },
  { href: "/parameter", label: "Parameter" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-emerald-800 dark:text-emerald-400">
              IKP Kantor Pusat WI
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  {m.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
