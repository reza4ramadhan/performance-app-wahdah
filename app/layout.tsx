import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PenyediaTema } from "@/components/app/tema";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "IKP Pegawai · Kantor Pusat Wahdah Islamiyah", template: "%s · IKP Pegawai WI" },
  description: "Log harian, verifikasi, dan IKP bulanan pegawai Kantor Pusat Wahdah Islamiyah",
  applicationName: "IKP Pegawai WI",
  appleWebApp: { capable: true, title: "IKP WI", statusBarStyle: "default" },
  icons: { icon: "/ikon-192.png", apple: "/ikon-apple.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#081416" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes menambah kelas tema di <html> sebelum hidrasi.
    <html lang="id" className={`${jakarta.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <PenyediaTema>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </PenyediaTema>
      </body>
    </html>
  );
}
