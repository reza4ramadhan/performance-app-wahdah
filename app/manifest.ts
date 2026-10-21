import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IKP Pegawai · Kantor Pusat Wahdah Islamiyah",
    short_name: "IKP WI",
    description: "Log harian, verifikasi, dan IKP bulanan pegawai Kantor Pusat Wahdah Islamiyah",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f7f8",
    theme_color: "#0c7883",
    lang: "id",
    icons: [
      { src: "/ikon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
