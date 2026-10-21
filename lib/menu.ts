// Menu per peran (plan.md Bagian 8). Dipakai navigasi bawah, sidebar desktop, dan hub Tim.

import type { Sesi } from "./sesi";

export type NamaIkonMenu =
  | "hari-ini" | "item" | "progres" | "tim" | "akun" | "jurnal" | "belajar" | "dtr" | "k4"
  | "verifikasi" | "kegiatan" | "catatan" | "k3" | "arsip" | "kantor" | "kalibrasi" | "rekap"
  | "absensi" | "pegawai" | "unit" | "penugasan" | "indikator" | "libur" | "periode";

export type ItemMenu = { href: string; label: string; ikon: NamaIkonMenu; sub?: string };
export type GrupMenu = { judul: string; item: ItemMenu[] };

export function menuUntuk(sesi: Pick<Sesi, "peran" | "penugasan">) {
  const p = sesi.peran;
  const ada = (...x: Parameters<typeof p.has>[0][]) => x.some((r) => p.has(r));
  const staf = sesi.penugasan.some((x) => x.peranKerja === "SK");
  const ksbk = sesi.penugasan.some((x) => x.peranKerja === "KSBK");

  const grup: GrupMenu[] = [
    {
      judul: "Saya",
      item: [
        { href: "/", label: "Hari Ini", ikon: "hari-ini" },
        { href: "/item", label: "Item", ikon: "item" },
        { href: "/jurnal", label: "Jurnal", ikon: "jurnal" },
        { href: "/pengembangan-diri", label: "Pengembangan diri", ikon: "belajar" },
        ...(staf ? [{ href: "/dtr", label: "DTR", ikon: "dtr" as const }] : []),
        { href: "/progres", label: "Progres", ikon: "progres" },
        { href: "/k4", label: "Inovasi K4", ikon: "k4" },
      ],
    },
  ];

  if (ada("koordinator")) {
    grup.push({
      judul: "Tim",
      item: [
        { href: "/tim", label: "Tim hari ini", ikon: "tim" },
        { href: "/verifikasi", label: "Verifikasi", ikon: "verifikasi" },
        ...(ksbk ? [{ href: "/tim/kegiatan", label: "Kegiatan bulanan", ikon: "kegiatan" as const }] : []),
        { href: "/tim/catatan", label: "Catatan perilaku", ikon: "catatan" },
        { href: "/tim/k3", label: "Penilaian K3", ikon: "k3" },
        { href: "/tim/dtr", label: "DTR staf", ikon: "dtr" },
        ...(ksbk ? [{ href: "/tim/uji-petik", label: "Uji petik arsip", ikon: "arsip" as const }] : []),
        { href: "/tim/k4", label: "Periksa K4", ikon: "k4" },
      ],
    });
  } else if (ada("keuangan", "sekretariat")) {
    grup.push({ judul: "Verifikasi", item: [{ href: "/verifikasi", label: "Verifikasi", ikon: "verifikasi" }] });
  }

  if (ada("waka", "kepala", "sekretariat", "admin")) {
    grup.push({
      judul: "Kantor",
      item: [
        { href: "/kantor", label: "Dashboard kantor", ikon: "kantor" },
        ...(ada("waka") && !ada("koordinator") ? [{ href: "/tim/k3", label: "Penilaian K3 (KSBK)", ikon: "k3" as const }] : []),
        ...(ada("waka", "kepala", "sekretariat") ? [{ href: "/kantor/kalibrasi", label: "Kalibrasi K3", ikon: "kalibrasi" as const }] : []),
        ...(ada("waka", "kepala") ? [{ href: "/kantor/k4", label: "Penetapan K4", ikon: "k4" as const }] : []),
        { href: "/kantor/rekap", label: "Rekap IKP", ikon: "rekap" },
      ],
    });
  }

  if (ada("personalia")) grup.push({ judul: "Personalia", item: [{ href: "/absensi", label: "Unggah absensi", ikon: "absensi" }] });

  if (ada("admin")) {
    grup.push({
      judul: "Admin",
      item: [
        { href: "/admin/pegawai", label: "Pegawai & akun", ikon: "pegawai" },
        { href: "/admin/unit", label: "Unit", ikon: "unit" },
        { href: "/admin/penugasan", label: "Penugasan", ikon: "penugasan" },
        { href: "/admin/indikator", label: "Indikator", ikon: "indikator" },
        { href: "/admin/libur", label: "Hari libur", ikon: "libur" },
        { href: "/admin/periode", label: "Periode", ikon: "periode" },
      ],
    });
  }

  /** Tab ke-5 di ponsel: muncul bila punya peran selain pegawai biasa. */
  const kelola = grup.length > 1;
  const labelKelola = ada("koordinator", "waka", "kepala") ? "Tim" : "Kelola";
  return { grup, kelola, labelKelola };
}
