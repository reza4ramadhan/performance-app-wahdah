import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Merek, NavPonsel, Sidebar } from "./components/sidebar";
import { ChipPeriode } from "./components/chip-periode";
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
  title: "IKP Pegawai — Kantor Pusat Wahdah Islamiyah",
  description: "Penilaian kinerja bulanan pegawai Kantor Pusat Wahdah Islamiyah",
  icons: { icon: "/logo-wahdah.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full text-zinc-900 dark:text-zinc-100">
        <Suspense>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-wi-100 bg-white/85 backdrop-blur dark:border-wi-900 dark:bg-wi-950/85">
            <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
              <div className="lg:hidden">
                <Merek kecil />
              </div>
              <p className="hidden text-sm text-zinc-500 lg:block">Penilaian kinerja bulanan pegawai Kantor Pusat</p>
              <div className="flex items-center gap-3">
                <Suspense fallback={<span className="h-8 w-40 animate-pulse rounded-full bg-wi-50 dark:bg-wi-900" />}>
                  <ChipPeriode />
                </Suspense>
                <div className="hidden items-center gap-2 sm:flex" title="Belum ada login — semua perubahan tercatat sebagai pengguna-dev">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emas-300 text-sm font-bold text-tinta">PD</span>
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">Pengguna dev</span>
                    <span className="block text-xs text-zinc-500">Belum ada login</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="px-4 pb-3 lg:hidden">
              <Suspense>
                <NavPonsel />
              </Suspense>
            </div>
          </header>
          <main className="w-full flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
