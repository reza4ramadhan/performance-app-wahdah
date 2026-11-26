# Rencana Implementasi Rombak UX v2

Basis: commit `2bc14fc` di `main`. Dokumen keputusan: `01`–`05` di folder ini. Bila ada beda, **01–05 menang**.

Cara kerja yang disarankan: satu branch `rombak-ux-v2`, satu PR per fase, `npm test` + `npm run build` hijau sebelum commit. Jangan sentuh `.env.local`.

## 0. Yang sudah ada di repo (tidak perlu diubah, hanya dicek)

- K1 koordinator = rata-rata staf: KSBK-1/KSBK-3 sudah nonaktif di `lib/ikp/katalog.ts`. **Cek** bahwa KSBK-1c juga tidak masuk skor dan rata-rata dihitung dari semua staf unit.
- Item otomatis SBK-2a/2b/3 (`otomatis: true` di katalog).
- Koordinator sebagai verifikator item (`indikator.verifikatorPeran = "koordinator"`).
- SPP H-7: diatur lewat halaman Admin › Indikator (tenggat SBK-2a), tanpa ubah kode. `sinkronKatalog` tidak menimpa nilai yang dikalibrasi admin.
- `tugas_khusus` (+ `tugas_khusus_jadwal`) dan `usulan_tugas` menjadi dasar Set Tugas.

## 1. Gap data — migrasi `drizzle/0007_…` dst.

Buat lewat `npm run db:generate`, jalankan `npm run db:migrate`. Satu migrasi per kelompok agar mudah di-rollback.

| # | Perubahan | Catatan |
| --- | --- | --- |
| 1.1 | **Sekretariat → Admin**: migrasi data `peran_sistem` sekretariat → admin; `indikator.verifikator_peran` sekretariat → admin (atau koordinator, sesuai indikator); hapus nilai enum setelah data pindah | Sesuaikan `lib/akses.ts`, `lib/ikp/katalog.ts`, `lib/menu.ts` |
| 1.2 | `unit.pola_kerja` enum `administrasi \| rutin` | A–M administrasi, N–R rutin |
| 1.3 | Impor 18 unit + penugasan dari SK | Perbarui `scripts/impor-struktur.ts` + templat di `docs/templat-impor` |
| 1.4 | `penugasan.wakil boolean` | Wakil Koordinator B, F, K: akses = koordinator, kecuali K3 |
| 1.5 | Tabel baru `plot_skuo` (`unit_id`, `skuo_id`, `pegawai_id`, `utama boolean`, `berlaku_mulai date`) | `pemikulKegiatan` di `lib/ikp/k1.ts` membaca plot ini (PJ utama). Perubahan plot: kegiatan yang belum berjalan pindah PJ, yang sudah berjalan tetap; catat di `audit_log` |
| 1.6 | `kegiatan.status` enum `rencana \| jalan \| geser \| tunda \| batal`, `tanggal_rencana`, `alasan_batal`; tambah `sumber = "rencana"` | Kegiatan hasil impor tahunan berstatus `rencana` |
| 1.7 | `item.pending_dana_sejak`, `item.dana_cair_pada`, `item.dana_cair_oleh` | Tenggat SBK-2b dihitung dari `dana_cair_pada` bila ada (logika tenggat di `lib/ikp/`) |
| 1.8 | `jurnal.durasi_menit` | Pilihan 15/30/60/120/lainnya |
| 1.9 | Tabel `set_tugas` (`unit_id`, `nama`, `aturan_tengah_malam`), `set_tugas_item` (`judul`, `frekuensi`, `hari`, `jam_tenggat`, `link_wajib`), `set_tugas_staf` (`pegawai_id`, `set_tugas_id`, `pekan_mulai`) | Baris terbaru per staf berlaku → auto carry-over tanpa menyalin data |
| 1.10 | `usulan_tugas.set_tugas_id` (nullable) | Usulan diterima → masuk set pilihan koordinator |
| 1.11 | Tabel `absensi_hari` (`pegawai_id`, `tanggal`, `jenis` izin/sakit/cuti) + format unggah baru | `absensi` sekarang hanya agregat bulanan, tidak cukup untuk mengecualikan tugas rutin per hari |

## 2. Gap logika

1. **Hapus Pindah Amanah**: `COOKIE_AMANAH` / `pilihAmanah` di `lib/amanah.ts`, `lib/sesi.ts`, `app/aksi/akun.ts`. Ganti dengan daftar gabungan semua penugasan + label unit + chip filter (hanya bila rangkap).
2. **Checklist mengikuti status kegiatan**: item SBK-2a/2b/3/4/5 dibuat hanya saat kegiatan `jalan`/`geser`. `tunda`/`batal` → item terbuka dikeluarkan dari target (jangan dihapus; tandai). Ubah tanggal → tenggat bergeser; **verifikasi** tenggat dibaca live dari `kegiatan.tanggal`, bukan disalin saat item dibuat.
3. **Generator Set Tugas** → `tugas_khusus` / `tugas_khusus_jadwal`. Saat set atau susunan berubah, regenerasi **hanya tanggal setelah hari ini** (perubahan berlaku besok). Pengaturan tengah malam per set: hanya Admin.
4. **Pengecualian izin/sakit/cuti**: tugas rutin pada tanggal di `absensi_hari` tidak masuk target SK-TK.
5. **Aksi "Setujui semua yang tepat waktu"**: loop per item dengan `bolehVerifikasiItem` (tidak melewati cek akses); item terlambat tidak ikut.
6. **Pending SPB**: staf set `pending_dana_sejak`; koordinator mengisi `dana_cair_pada` (sementara, menggantikan Bendahara). Selama pending, item tidak dihitung terlambat.
7. **Cron pengingat 16.00 → 15.00** di `app/api/cron/[tugas]/route.ts` (dan jadwal cron di konfigurasi Vercel bila ada).
8. **Kuasa sementara Admin**: `bolehKelolaPeriode` (kunci IKP = final), unggah absensi, tetapkan K4. Tambah **aturan saling periksa**: tolak bila target data = Admin yang sedang bertindak.
9. **Konfirmasi rencana**: notifikasi sejak tgl 25, batas tgl 5 (konstanta di `lib/kegiatan-wajib.ts`); kegiatan `tunda` dipindah ke rencana bulan berikutnya.

## 3. Gap rute dan menu

`lib/menu.ts` → **4 tab untuk semua peran**: Tugas · Jurnal · Progres · Akun. Admin tetap desktop (`/admin/*`).

| Rute sekarang | Menjadi |
| --- | --- |
| `/` (Hari Ini, 3 varian) + `/item` + `/tugas` | `/` = Tugas · segmen **Saya** (daftar gabungan item + rutin + delegasi) |
| `/item/[id]` | Detail tugas (Tandai selesai, Pending SPB, riwayat) |
| `/verifikasi` + `/tim/periksa` | `/tim/verifikasi` |
| `/tim` | Hub segmen **Tim** (3 angka + pintasan) |
| `/tim/kegiatan` | Konfirmasi rencana + kegiatan tambahan (A–M) |
| `/tim/tugas` | Delegasi + beban lintas unit |
| baru | `/tim/plot` (Manage tim, A–M) |
| baru | `/tim/set-tugas`, `/tim/set-tugas/[id]`, `/tim/atur-tugas` (N–R) |
| `/tugas/usulan` | Staf N–R: usulkan; koordinator N–R: `/tim/usulan` |
| `/tim/staf/[id]`, `/tim/catatan`, `/tim/jurnal` | Profil staf (jurnal + catatan perilaku dibuka dari profil) |
| `/tim/k3`, `/tim/k4`, `/tim/uji-petik` | Kartu Penilaian di hub Tim, hanya di jendela akhir bulan |
| `/jurnal` + `/jurnal/sekaligus` + `/pengembangan-diri` | `/jurnal` dengan tab Jurnal \| Belajar (format isi sekaligus) |
| `/progres` + `/k4` | `/progres`; ajukan K4 hanya di jendela akhir bulan |
| `/kantor/*` | Disembunyikan dari menu (akun pimpinan ditunda); rekap pindah ke Admin |
| `/absensi` | Admin (sementara) |

## 4. Fase

| Fase | Isi | Selesai bila |
| --- | --- | --- |
| **1. Data & peran** | Migrasi 1.1–1.8, impor 18 unit, Wakil Koordinator, Admin interim + saling periksa, hapus Pindah Amanah | Tes lulus; data SK terimpor di DB dev; login tiap peran jalan |
| **2. Staf Administrasi** | 4 tab, `/` Tugas · Saya, detail + Pending SPB, + Catat 3 pilihan, Jurnal (durasi) \| Belajar, Progres | Mockup halaman **adm** terpenuhi |
| **3. Koordinator A–M** | Segmen Tim, verifikasi + setujui massal, konfirmasi rencana, delegasi + beban, Manage tim (plot_skuo), profil staf, kartu penilaian | Mockup **koor** terpenuhi; checklist hanya terbit untuk kegiatan jalan/geser |
| **4. Tugas Rutin & Koordinator N–R** | Migrasi 1.9–1.11, Set Tugas, Atur Tugas Staf (carry-over, berlaku besok), usulan, absensi_hari | Mockup **rutin** + **koor-r** terpenuhi |
| **5. Rencana tahunan & notifikasi** | Impor rencana SIMAKPRO/RKA (setelah uji RKA), cron 15.00, notifikasi tgl 25 | Satu bidang terimpor dengan benar |

Setelah itu: **uji coba 1–2 pekan dengan satu bidang** (satu staf administrasi, satu staf keamanan, satu koordinator) sebelum rilis penuh.

## 5. Di luar kode (untuk pemilik)

- Perbarui pedoman: SBK-2b (tenggat dari tanggal dana cair bila pending) dan bagian KSBK (K1 koordinator = rata-rata staf; KSBK-1c dihapus dari skor).
- `plan.md` (PRD v1.0) usang untuk bagian yang bertentangan dengan folder ini.
- Putuskan mitigasi insentif longgar koordinator (audit acak atau rasio persetujuan di rekap Admin).
- Unggah contoh RKA untuk uji impor (prasyarat Fase 5).
- Komunikasikan kemungkinan turunnya skor bulan pertama Staf Administrasi.

## Tautan

- Kanvas mockup: https://claude.ai/artifact/P9sGN7JVLsAJDWu71BBpVM
- UX Flow Baru: https://claude.ai/artifact/XgAbcYGtyoZcxW84tAwoAV
- Menu Staf Administrasi: https://claude.ai/artifact/7m2oVRpdzGXPa5T9kGxxkJ
- Menu Staf Tugas Rutin: https://claude.ai/artifact/BeomQu1Fjf7qUbC48d7NQK
- Menu Koordinator A–M: https://claude.ai/artifact/VDxAtmx2aa6YXbbsVxFCqT

## Status

### Fase 1 — selesai di branch `rombak-ux-v2` (26 Nov 2026), belum di-commit

Migrasi `drizzle/0009_rombak_v2_data.sql` (1.1, 1.2, 1.4–1.8) + data: Sekretariat → Admin, `pola_kerja` dari jenis unit, kegiatan lama = `jalan`.

- Pindah Amanah dihapus (cookie, aksi, kartu Akun, chip beranda). Sesi memakai semua penugasan; set menu ikut peran tertinggi. Akun menampilkan daftar penugasan + koordinatornya.
- Wakil Koordinator: centang di Admin › Penugasan / kolom `wakil` di impor. Verifikasi, tugas, usulan, rapor = koordinator; K3 tidak.
- Admin interim: unggah absensi, penetapan K4, rekap & dashboard kantor (grup Admin); kalibrasi K3 disembunyikan. Menu Kantor hanya untuk pimpinan.
- K1 koordinator unit N–R = rata-rata K1 staf SK unitnya (sebelumnya hanya SBK).
- `plot_skuo` + `lib/plot.ts`: PJ kegiatan kosong diambil dari PJ utama plot. UI Manage tim menyusul di Fase 3.
- Checklist & target K1 hanya dari kegiatan `jalan`/`geser`.
- Templat 18 unit: `docs/templat-impor/sk-2026/` (pegawai.csv & penugasan.csv perlu NIP dari data kepegawaian).

Perbedaan dari rencana (perlu dikonfirmasi pemilik):
- **Saling periksa saat kunci IKP**: kunci adalah aksi satu periode, jadi diterapkan sebagai "Admin yang mengunci IKP sementara tidak boleh mengesahkannya sendiri; pengesahan oleh Admin lain". Status `disahkan` tetap ada (bukan kunci = langsung final).
- Impor 1.3 baru sampai templat unit; data pegawai/penugasan SK belum diimpor ke DB.
- Kolom 1.6–1.8 baru ada di skema; logika konfirmasi rencana, Pending SPB, dan durasi jurnal dikerjakan di Fase 2–3.

### Fase 2 — selesai di branch `rombak-ux-v2` (26 Nov 2026)

- **4 tab** Tugas · Jurnal · Progres · Akun untuk staf (peran tertinggi SBK atau SK). Koordinator masih memakai menu lama sampai Fase 3.
- **`/` = Tugas · Saya** untuk Staf Administrasi ([app/(app)/tugas-saya.tsx](../../app/(app)/tugas-saya.tsx), [lib/tugas-saya.ts](../../lib/tugas-saya.ts)): ringkasan Terlambat · Hari ini · Pekan ini, chip K1 berjalan, filter unit (hanya bila rangkap), bagian Perlu diperbaiki / Terlambat / Hari ini, lalu Pending dana · Pekan ini · Nanti · Selesai minggu ini (dilipat). Isinya item checklist kegiatan + delegasi + item yang dicatat sendiri. Tombol **+ Catat** melayang.
- **+ Catat** dua langkah: pilih jenis (Pembuatan surat · Koordinasi layanan · Dokumen arsip) → unit → isian.
- **Detail tugas** (`/item/[id]`): judul berupa aksi ("Kirim pengingat ke-2"), checklist kegiatan ini, riwayat termasuk pending/dana cair, `?selesai=1` langsung membuka form selesai.
- **Pending SPB**: `tandaiPendingSpb` (staf) dan `konfirmasiDanaCair` (koordinator/wakil, di detail SPB). Selama pending tenggat berhenti dan bukan target SBK-2b; setelah cair tenggat = tanggal cair + 7 hari (K1 dan tampilan).
- **Jurnal**: tab Jurnal kerja | Belajar; isi sekaligus dengan pilihan durasi (15/30 mnt, 1/2 jam, lain), link opsional. Isian jam, unit, dan pemberi tugas dihapus dari form (kolom lama tetap di DB). `/jurnal/sekaligus` dan `/pengembangan-diri` dialihkan.
- **Progres & K4**: pengajuan K4 hanya untuk bulan lalu, ≤ 5 hari kerja setelah bulan berakhir ([lib/jendela.ts](../../lib/jendela.ts)); di luar jendela tampil tanggal pembukaan berikutnya.
- **Akun**: tautan Jurnal/Belajar/Tugas/K4 tidak diulang untuk staf.

Perbedaan dari mockup: konfirmasi dana cair oleh **koordinator unit** (keputusan 02 butir 1.8), bukan Keuangan seperti teks mockup Adm-10/11. Layar Staf Tugas Rutin (`/` untuk SK) masih tampilan lama sampai Fase 4.

### Fase 3 — selesai di branch `rombak-ux-v2` (26 Nov 2026)

Migrasi `drizzle/0010_delegasi_link_wajib.sql` (`tugas_khusus.link_wajib`).

- **Koordinator (dan Wakil) memakai 4 tab yang sama.** `/` = Tugas dengan segmen **Saya | Tim**; Tim terbuka bawaan bila ada pekerjaan menunggu. Sidebar desktop: Utama + Tim (Verifikasi, Jadwal, Delegasi, Manage tim). Beranda KSBK lama (`hari-ini-ksbk.tsx`) dan mode periksa satu per satu dihapus; `/tim`, `/verifikasi`, `/tim/periksa` dialihkan.
- **Segmen Tim** ([app/(app)/tugas-koordinator.tsx](../../app/(app)/tugas-koordinator.tsx)): Perlu diperiksa · Terlambat · Pending dana, kartu "Rencana [bulan]: n kegiatan" (sejak tgl 25), 4 pintasan, Kartu Penilaian (K3 — tidak untuk wakil, K4, uji petik) hanya di jendela akhir bulan, daftar staf dengan beban pekan ini dan unit lain.
- **Verifikasi** (`/tim/verifikasi`): saring per jenis, Setujui/Tolak (alasan wajib) per baris, **Setujui semua yang tepat waktu** (`setujuiSemuaTepatWaktu`: item terlambat tidak ikut), dan SPB pending dengan konfirmasi tanggal cair.
- **Jadwal** (`/tim/kegiatan`): konfirmasi rencana Jalan · Geser · Tunda · Batal (`ubahStatusKegiatan`). Checklist terbit saat Jalan/Geser; Geser memindah tanggal (tenggat ikut) dan menyimpan tanggal rencana; Tunda menyalin kegiatan ke bulan berikutnya berstatus rencana; Batal wajib alasan. Checklist terbuka dari kegiatan tunda/batal keluar dari target K1 dan dari daftar Tugas staf. + Kegiatan tambahan dengan PJ otomatis dari plot.
- **Delegasi** (`/tim/tugas`, `kirimDelegasi`): banyak staf sekaligus, tenggat tanggal + jam, link bukti wajib; tampil beban tugas pekan ini tiap staf dari semua unit.
- **Manage tim** (`/tim/plot`, `simpanPlot`): plot staf ke departemen + PJ utama, berlaku hari ini; kegiatan yang belum berjalan dan belum disentuh pindah ke PJ baru; tercatat di audit log.
- **Profil staf**: K1, beban pekan ini, terlambat, departemen yang dipegang, jurnal terbaru, tombol tulis catatan perilaku.
- **Progres koordinator**: daftar K1 tiap staf + rata-rata.

Catatan: rencana SIMAKPRO baru masuk setelah impor tahunan (Fase 5); sampai itu kegiatan tambahan langsung berstatus Jalan. Notifikasi "item menunggu > 1 hari kerja" dan "rencana belum dikonfirmasi" dikerjakan bersama cron di Fase 5.

### Fase 4 — selesai di branch `rombak-ux-v2` (26 Nov 2026)

Migrasi `drizzle/0011_set_tugas.sql` (1.9–1.11): `set_tugas`, `set_tugas_item`, `set_tugas_staf`, `absensi_hari`, `usulan_tugas.set_tugas_id` + `hari`, `tugas_khusus.set_tugas_item_id`.

- **Generator** ([lib/set-tugas.ts](../../lib/set-tugas.ts) murni, [lib/data/set-tugas.ts](../../lib/data/set-tugas.ts)): susunan Atur Tugas Staf → jadwal `tugas_khusus_jadwal` sampai Minggu pekan depan. Setiap perubahan set/susunan hanya menulis ulang tanggal **setelah hari ini**; jadwal yang sudah disentuh staf tidak dihapus. Ubah tugas = versi baru (`asal_id`) sehingga tidak ada jadwal ganda. Diperpanjang otomatis saat halaman Tugas/Tim dibuka dan lewat cron `POST /api/cron/rutin`.
- **Staf Tugas Rutin**: `/` = Tugas hari ini (kartu set aktif + progres + tugas berikutnya + K1, Perlu diperbaiki, Rutin hari ini urut jam dengan centang cepat bila link tidak wajib, Terlambat, Delegasi, Besok). Detail `/tugas/[id]` (jejak pekan ini, riwayat, Tandai selesai), `/tugas/besok`, usulan ke set tugas. Progres: rincian rutin vs delegasi.
- **Koordinator N–R**: segmen Tim (Perlu diperiksa · Terlambat · Belum mulai, usulan, staf hari ini dengan set + selesai/total), `/tim/set-tugas` (+ ubah, duplikat), `/tim/atur-tugas` (pekan ini/depan, berlanjut otomatis), `/tim/usulan` (setujui ke set mana pun / tolak). Verifikasi memakai halaman yang sama dengan saring per set tugas dan Setujui semua yang tepat waktu.
- **Admin**: aturan tugas lewat tengah malam per set (jam ganti hari) di halaman ubah set; unggah izin/sakit/cuti per hari di `/absensi`. Tugas rutin pada hari itu keluar dari target SK-TK.

Perbedaan dari rencana: `set_tugas_staf` memakai `penugasan_id` (bukan `pegawai_id`) agar staf rangkap tetap tepat; aturan tengah malam disimpan sebagai jam ganti hari (`ganti_hari_jam`). "Setiap hari" = setiap hari kerja (mengikuti kalender libur). Fitur "tukar dua set sekaligus" di mockup KR-5 belum dibuat.
