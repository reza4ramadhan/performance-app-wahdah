# 03 — Menu Staf Tugas Rutin (unit N–R)

Unit: Pelayanan Umum, Pelayanan Media, Pelayanan Keamanan, Sekolah Dai, Staf Khusus.
Sumber: doc "Menu Staf Tugas Rutin — Aplikasi IKP" (26 Nov 2026). Mockup: kanvas halaman **rutin** (Rtn-1..Rtn-6).

Struktur sama dengan Staf Administrasi, tetapi **tanpa tombol + Catat**: K1 (SK-TK) dihitung dari tugas rutin dan delegasi yang diberikan koordinator.

## A. Navigasi bawah (4 tab)

### 1. Tugas (layar pertama)

- 1.1 Kartu ringkasan: unit dan nama **Set Tugas** yang aktif, progres hari ini (mis. 3/6), tugas berikutnya beserta jamnya, chip skor K1 berjalan.
- 1.2 **Perlu diperbaiki**: tugas ditolak, beserta alasan dan tombol perbaiki.
- 1.3 **Rutin hari ini**: berasal dari Set Tugas yang diatur koordinator per pekan (menu Atur Tugas Staf), diurutkan berdasarkan jam tenggat. Status: belum · menunggu diperiksa · disetujui · terlambat.
- 1.4 **Delegasi**: tugas sekali dari koordinator, dengan tanggal dan jam tenggat.
- 1.5 **Centang cepat** langsung dari daftar, tanpa membuka detail, untuk tugas yang tidak meminta link bukti.
- 1.6 **Detail tugas**: uraian, jam tenggat, pemberi tugas, apakah link bukti wajib; tombol Tandai selesai (dengan catatan atau link bila diminta); riwayat.
- 1.7 **Besok**: pratinjau tugas rutin hari berikutnya.

### 2. Jurnal

Sama dengan Staf Administrasi: jurnal kerja format isi sekaligus (uraian, durasi per pekerjaan, link opsional; +0,15 poin per entri, maks 5) dan Belajar.

### 3. Progres

- Skor K1 berjalan, diperbarui setiap hari.
- Rincian: tugas jatuh tempo, selesai tepat waktu, terlambat, ditolak — dipisah antara rutin dan delegasi.
- Poin tambahan dari jurnal.
- Riwayat IKP dan rapor PDF.
- Ajukan inovasi (K4), hanya aktif di jendela akhir bulan.

### 4. Akun

Profil dan penugasan · Ganti password · Notifikasi · Panduan PWA · Tema · Keluar.

## B. Di luar tab

- **Notifikasi**: pengingat pukul **15.00** bila masih ada tugas yang belum ditandai selesai; item ditolak; delegasi baru.
- **Usulkan tugas rutin** ke koordinator (tombol kecil di tab Tugas; fitur yang sudah ada untuk Staf Khusus, kini berlaku untuk semua unit N–R). Koordinator dapat memasukkan usulan ke Set Tugas mana pun.

## C. Tidak bisa diakses

Sama dengan Staf Administrasi: K3 dan catatan perilaku tentang dirinya, data staf lain, penyusunan tugas rutin (hanya koordinator), verifikasi, rekap kantor, admin.

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Sumber tugas rutin | **Set Tugas** = kumpulan tugas rutin bernama, seperti folder. Tidak harus terkait shift; namanya bebas (mis. "Keamanan shift pagi", "Kebersihan harian", "Media harian"). Koordinator mengatur Set Tugas tiap staf lewat **Atur Tugas Staf** per pekan |
| Set Tugas yang tugasnya melewati tengah malam | Diatur manual: Admin punya pengaturan per Set Tugas untuk menentukan tugas setelah 00.00 masuk hari yang mana |
| Izin, sakit, cuti | Tugas pada hari itu dikeluarkan dari target setelah absensi diunggah. Skor harian boleh sempat turun lalu naik kembali (diterima) |
| Pemeriksaan | Koordinator memakai **Setujui semua** (persetujuan massal) |
| Notifikasi pengingat | Pukul 15.00, sama dengan Staf Administrasi |
| Pratinjau besok (1.7) | Dipertahankan |
| Usulkan tugas rutin | Dipertahankan |
| Laporan kejadian | Dihapus |

Catatan teknis: tabel `absensi` sekarang hanya agregat bulanan (tanpa tanggal), jadi pengecualian hari izin/sakit butuh data per tanggal — lihat `rencana-implementasi.md`.
