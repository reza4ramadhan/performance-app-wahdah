// Menu per peran (plan.md Bagian 8). Dipakai navigasi bawah, sidebar desktop, dan hub Tim.

import type { Sesi } from "./sesi";

export type NamaIkonMenu =
  | "hari-ini" | "item" | "progres" | "tim" | "akun" | "jurnal" | "belajar" | "tugas" | "usulan" | "k4"
  | "verifikasi" | "kegiatan" | "catatan" | "k3" | "arsip" | "kantor" | "kalibrasi" | "rekap"
  | "absensi" | "pegawai" | "unit" | "penugasan" | "indikator" | "libur" | "periode" | "aktivitas";

export type ItemMenu = { href: string; label: string; ikon: NamaIkonMenu; sub?: string };
export type GrupMenu = { judul: string; item: ItemMenu[] };
export type TabBawah = { href: string; label: string; ikon: NamaIkonMenu };

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
        { href: "/admin/aktivitas", label: "Aktivitas K1", ikon: "aktivitas" },
        { href: "/admin/unit", label: "Unit", ikon: "unit" },
        { href: "/admin/penugasan", label: "Penugasan", ikon: "penugasan" },
        { href: "/admin/indikator", label: "Indikator", ikon: "indikator" },
        { href: "/admin/libur", label: "Hari libur", ikon: "libur" },
        { href: "/admin/periode", label: "Periode", ikon: "periode" },
      ],
    });
  }

  /** Punya peran selain pegawai biasa: hub Tim/Kelola tersedia. */
  const kelola = grup.length > 1;
  const labelKelola = adaTim || ksbk || pimpin ? "Tim" : "Kelola";
  /**
   * Navigasi bawah ponsel. KSBK: tiga pekerjaan utamanya (kegiatan SKUO, delegasi tugas, verifikasi) jadi tab,
   * tanpa tombol + Catat (laporan bidang dicatat dari Hari Ini). Lainnya: Tugas untuk Staf Khusus, Item untuk
   * yang lain, + Catat di tengah, dan tab Tim/Kelola bila punya peran selain pegawai biasa.
   */
  const tabBawah: TabBawah[] = ksbk
    ? [
        { href: "/", label: "Hari Ini", ikon: "hari-ini" },
        { href: "/tim/kegiatan", label: "Kegiatan", ikon: "kegiatan" },
        { href: "/tim/tugas", label: "Tugas", ikon: "tugas" },
        { href: "/verifikasi", label: "Verifikasi", ikon: "verifikasi" },
        { href: "/akun", label: "Akun", ikon: "akun" },
      ]
    : [
        { href: "/", label: "Hari Ini", ikon: "hari-ini" },
        sk ? { href: "/tugas", label: "Tugas", ikon: "tugas" } : { href: "/item", label: "Item", ikon: "item" },
        { href: "/progres", label: "Progres", ikon: "progres" },
        ...(kelola ? [{ href: "/tim", label: labelKelola, ikon: "tim" as const }] : []),
        { href: "/akun", label: "Akun", ikon: "akun" },
      ];
  return { grup, kelola, labelKelola, tabBawah, catat: !ksbk };
}

/** Semua href menu dan tab: dasar untuk menghitung lencana antrean. */
export const hrefMenu = (grup: GrupMenu[], tab: TabBawah[]) => new Set([...grup.flatMap((g) => g.item.map((m) => m.href)), ...tab.map((t) => t.href)]);

/**
 * Lencana menu → lencana tab ponsel. Menu yang punya tab sendiri tampil di tab itu; menu grup "Saya" tanpa tab
 * (mis. Tugas khusus milik SBK, Item milik KSBK) masuk Hari Ini; menu lain masuk hub Tim/Kelola.
 */
export function lencanaTab(tab: TabBawah[], grup: GrupMenu[], jumlah: Record<string, number>) {
  const ada = new Set(tab.map((t) => t.href));
  const saya = new Set(grup[0]?.item.map((m) => m.href));
  const hasil: Record<string, number> = {};
  for (const [href, n] of Object.entries(jumlah)) {
    const ke = ada.has(href) ? href : saya.has(href) || !ada.has("/tim") ? "/" : "/tim";
    hasil[ke] = (hasil[ke] ?? 0) + n;
  }
  return hasil;
}
