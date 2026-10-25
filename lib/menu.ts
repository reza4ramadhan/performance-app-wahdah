// Menu per peran (plan.md Bagian 8). Dipakai navigasi bawah, sidebar desktop, dan hub Tim.

import type { Sesi } from "./sesi";

export type NamaIkonMenu =
  | "hari-ini" | "item" | "progres" | "tim" | "akun" | "jurnal" | "belajar" | "tugas" | "usulan" | "k4"
  | "verifikasi" | "kegiatan" | "catatan" | "k3" | "arsip" | "kantor" | "kalibrasi" | "rekap"
  | "absensi" | "pegawai" | "unit" | "penugasan" | "indikator" | "libur" | "periode";

export type ItemMenu = { href: string; label: string; ikon: NamaIkonMenu; sub?: string };
export type GrupMenu = { judul: string; item: ItemMenu[] };

/**
 * Menu kerja mengikuti amanah aktif ("Pindah Amanah"); menu fungsi (Sekretariat, Personalia, Keuangan, Admin)
 * selalu tampil.
 */
export function menuUntuk(sesi: Pick<Sesi, "peran" | "amanah" | "tim">) {
  const p = sesi.peran;
  const ada = (...x: Parameters<typeof p.has>[0][]) => x.some((r) => p.has(r));
  const kerja = sesi.amanah?.peranKerja;
  const tugas = kerja === "SBK" || kerja === "SK";
  // Staf Khusus tidak punya indikator item; K1-nya dari tugas khusus.
  const sk = kerja === "SK";
  const ksbk = kerja === "KSBK";
  const pimpin = kerja === "WAKA" || kerja === "KAKAN";
  const adaTim = sesi.tim.length > 0;

  const grup: GrupMenu[] = [
    {
      judul: "Saya",
      item: [
        { href: "/", label: "Hari Ini", ikon: "hari-ini" },
        ...(sk ? [] : [{ href: "/item", label: "Item", ikon: "item" as const }]),
        ...(tugas ? [{ href: "/tugas", label: "Tugas khusus", ikon: "tugas" as const }] : []),
        ...(sk ? [{ href: "/tugas/usulan", label: "Usulan tugas", ikon: "usulan" as const }] : []),
        { href: "/jurnal", label: "Jurnal", ikon: "jurnal" },
        { href: "/pengembangan-diri", label: "Pengembangan diri", ikon: "belajar" },
        { href: "/progres", label: "Progres", ikon: "progres" },
        { href: "/k4", label: "Inovasi K4", ikon: "k4" },
      ],
    },
  ];

  if (adaTim || ksbk) {
    grup.push({
      judul: "Tim",
      item: [
        { href: "/tim", label: "Tim hari ini", ikon: "tim" },
        { href: "/verifikasi", label: "Verifikasi", ikon: "verifikasi" },
        ...(ksbk ? [{ href: "/tim/kegiatan", label: "Kegiatan bulanan", ikon: "kegiatan" as const }] : []),
        { href: "/tim/catatan", label: "Catatan perilaku", ikon: "catatan" },
        { href: "/tim/k3", label: "Penilaian K3", ikon: "k3" },
        ...(sesi.tim.some((b) => b.peranKerja === "SBK" || b.peranKerja === "SK") ? [{ href: "/tim/tugas", label: "Tugas khusus staf", ikon: "tugas" as const }] : []),
        { href: "/tim/jurnal", label: "Jurnal staf", ikon: "jurnal" },
        ...(ksbk ? [{ href: "/tim/uji-petik", label: "Uji petik arsip", ikon: "arsip" as const }] : []),
        { href: "/tim/k4", label: "Periksa K4", ikon: "k4" },
      ],
    });
  } else if (ada("keuangan", "sekretariat")) {
    grup.push({ judul: "Verifikasi", item: [{ href: "/verifikasi", label: "Verifikasi", ikon: "verifikasi" }] });
  }

  if (pimpin || ada("sekretariat", "admin")) {
    grup.push({
      judul: "Kantor",
      item: [
        { href: "/kantor", label: "Dashboard kantor", ikon: "kantor" },
        ...(pimpin || ada("sekretariat") ? [{ href: "/kantor/kalibrasi", label: "Kalibrasi K3", ikon: "kalibrasi" as const }] : []),
        ...(pimpin ? [{ href: "/kantor/k4", label: "Penetapan K4", ikon: "k4" as const }] : []),
        { href: "/kantor/rekap", label: "Rekap IKP", ikon: "rekap" },
        ...(!adaTim ? [{ href: "/tim/jurnal", label: "Jurnal pegawai", ikon: "jurnal" as const }] : []),
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
  const labelKelola = adaTim || ksbk || pimpin ? "Tim" : "Kelola";
  /** Tab ke-2 di ponsel: Tugas untuk Staf Khusus, Item untuk yang lain. */
  const tabUtama = sk ? ({ href: "/tugas", label: "Tugas" } as const) : ({ href: "/item", label: "Item" } as const);
  return { grup, kelola, labelKelola, tabUtama };
}
