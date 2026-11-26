# 02 — Menu Staf Administrasi (unit A–M)

Sumber: doc "Menu Staf Administrasi — Aplikasi IKP" (26 Nov 2026). Mockup: kanvas halaman **adm** (Adm-1-Tugas … Adm-11-Pending).

## A. Navigasi bawah (4 tab)

### 1. Tugas (layar pertama saat aplikasi dibuka)

- 1.1 Ringkasan angka: **Terlambat · Hari ini · Pekan ini**, plus chip skor K1 berjalan.
- 1.2 Filter unit — hanya muncul untuk staf yang rangkap unit.
- 1.3 Bagian **Perlu diperbaiki**: item ditolak, beserta alasan dan tombol perbaiki. Selalu paling atas.
- 1.4 Bagian **Hari ini**, **Pekan ini**, **Nanti**. Isinya:
  - item dari checklist kegiatan SKUO (Pengingat ke-1 & ke-2, SPP H-7, SPB)
  - tugas delegasi dari koordinator
  - item yang dicatat sendiri lewat + Catat
  - Tiap baris memuat nama kegiatan, apa yang harus dilakukan ("Kirim pengingat ke-2"), dan sisa waktu.
- 1.5 Bagian **Selesai minggu ini** — status *Menunggu diperiksa* atau *Disetujui*.
- 1.6 Tombol **+ Catat** dengan 3 pilihan:
  - Pembuatan Surat Kegiatan SKUO (SBK-1)
  - Koordinasi Layanan Kegiatan SKUO (SBK-4)
  - Dokumen arsip (SBK-5)
- 1.7 **Detail tugas** (dibuka saat tugas diketuk):
  - info kegiatan, tenggat, pemberi tugas
  - tombol **Tandai selesai**: tanggal selesai + link bukti
  - riwayat (dibuat, diajukan, diperiksa)
- 1.8 **Pending SPB (dana belum cair)** — khusus item SPB:
  - Alasan: SPP yang sudah diinput SKUO tidak langsung cair karena keterbatasan dana DPP, sehingga SPB belum bisa dibuat.
  - Di detail SPB ada tombol **Pending: dana belum cair** di samping Tandai selesai. Catatan opsional.
  - Selama pending: tenggat SPB berhenti, item tidak dihitung terlambat, dan pindah ke bagian **Pending dana** di beranda.
  - Konfirmasi tanggal pencairan oleh **koordinator unit** (sementara, selama akun Bendahara ditunda). Sejak tanggal itu tenggat SPB berjalan lagi: ≤ 7 hari setelah dana cair.
  - Koordinator melihat jumlah SPB pending di segmen Tim.

### 2. Jurnal

- 2.1 **Jurnal kerja**: pekerjaan di luar indikator. Format **isi sekaligus** (beberapa entri dalam satu form, seperti fitur sekarang). Per entri: uraian, **durasi** (15 mnt, 30 mnt, 1 jam, 2 jam, atau lainnya), link (opsional). Setiap entri +0,15 poin, maks 5.
- 2.2 **Belajar** (pengembangan diri): judul, durasi, ringkasan satu kalimat. Jika kosong sebulan, nilai K3 Pengembangan diri maks 2.

### 3. Progres

- 3.1 K1 berjalan bulan ini (diperbarui setiap hari), dengan rincian per indikator (SBK-1..5: target, realisasi, skor) dan poin tambahan dari delegasi dan jurnal.
- 3.2 K1 per unit (untuk staf rangkap).
- 3.3 Riwayat IKP bulan-bulan sebelumnya: K1, K2, K3, K4, predikat.
- 3.4 Rapor PDF per bulan.
- 3.5 **Ajukan inovasi (K4)**: hanya aktif ≤ 5 hari kerja setelah bulan berakhir.

### 4. Akun

Profil dan daftar penugasan (unit dan koordinatornya) · Ganti password · Notifikasi (web push) · Panduan pasang PWA · Tema terang/gelap · Keluar.

## B. Di luar tab

- **Notifikasi**: pengingat pukul **15.00** bila belum ada aktivitas; tugas mendekati/lewat tenggat; item ditolak; tugas delegasi baru.
- **Usulkan tugas**: **tidak dipakai** untuk Staf Administrasi.

## C. Sengaja tidak bisa diakses staf

K3 dan catatan perilaku tentang dirinya, data staf lain, jadwal kegiatan (staf hanya menerima checklist hasilnya), verifikasi, rekap kantor, menu admin.

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Item pengingat/SPP buatan staf | Tidak boleh. Hanya dari checklist kegiatan yang dikonfirmasi koordinator |
| Checklist otomatis per kegiatan | Pengingat ke-1 & ke-2 (SBK-3), SPP (SBK-2a, tenggat H-7), SPB (SBK-2b, ≤ 7 hari setelah kegiatan) |
| Surat dan layanan lewat + Catat | Boleh tanpa kegiatan; memilih kegiatan bersifat opsional |
| Target layanan (SBK-4) dan arsip (SBK-5) | Dari yang dicatat staf lewat + Catat; dikendalikan lewat uji petik arsip koordinator |
| Skor harian | Ditampilkan: K1 berjalan bulan ini, diperbarui setiap hari |
| Butir 1.5, 3.5, 4.5 | Dipertahankan |
| Usulkan tugas | Tidak dipakai untuk Staf Administrasi |
| SPB saat dana belum cair | Staf menandai Pending; tenggat berhenti sampai tanggal cair dikonfirmasi, lalu ≤ 7 hari setelah cair. Bunyi SBK-2b di pedoman perlu disesuaikan |
| Mockup | Semua menu: Tugas (beranda, detail, tandai selesai), + Catat, Jurnal & Belajar, Progres, Akun |
