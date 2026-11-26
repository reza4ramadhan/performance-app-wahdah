# Menu Staf Administrasi — Aplikasi IKP

Nov 26, 2026 · @Reza Ramadhan

Daftar menu yang bisa diakses Staf Administrasi (unit A–M), disusun dari rancangan UX baru dan fitur yang sudah ada. Tanda **\[?\]** = perlu keputusan. Dokumen ini dasar untuk mockup dan prototipe.

## A. Navigasi bawah (4 tab)

### 1. Tugas (layar pertama saat aplikasi dibuka)

- 1.1 Ringkasan angka: Terlambat · Hari ini · Pekan ini
- 1.2 Filter unit (hanya muncul untuk staf yang rangkap unit)
- 1.3 Bagian **Perlu diperbaiki**: item yang ditolak, beserta alasan dan tombol perbaiki
- 1.4 Bagian **Hari ini**, **Pekan ini**, dan **Nanti**. Isinya:
  - item dari checklist kegiatan SKUO (Pengingat, SPP H-7,  SPB)
  - tugas delegasi dari koordinator
  - item yang dicatat sendiri
- 1.5 Bagian **Selesai minggu ini**, berisi status *Menunggu diperiksa* atau *Disetujui*
- 1.6 Tombol **+ Catat** dengan 3 pilihan:
  - Pembuatan Surat Kegiatan SKUO
  - Koordinasi Layanan Kegiatan SKUO
  - Dokumen arsip
- 1.7 **Detail tugas** (dibuka saat tugas diketuk):
  - info kegiatan, tenggat, dan pemberi tugas
  - tombol **Tandai selesai**: tanggal selesai + link bukti
  - riwayat (dibuat, diajukan, diperiksa)
- 1.8 **Pending SPB (dana belum cair)**: khusus item SPB. Alasannya, SPP yang sudah diinput SKUO tidak langsung cair karena keterbatasan dana DPP, sehingga SPB belum bisa dibuat.
  - Di detail SPB ada tombol **Pending: dana belum cair** di samping Tandai selesai. Catatan opsional.
  - Selama pending, tenggat SPB berhenti, item tidak dihitung terlambat, dan pindah ke bagian **Pending dana** di beranda.
  - **Keuangan** mengonfirmasi tanggal pencairan (sementara, selama akun Bendahara ditunda: koordinator unit). Sejak tanggal itu, tenggat SPB berjalan lagi: ≤ 7 hari setelah dana cair.
  - Koordinator melihat jumlah SPB pending di tab Tim.

### 2. Jurnal

- 2.1 **Jurnal kerja**: pekerjaan di luar indikator. Isiannya uraian, durasi per pekerjaan (15 mnt, 30 mnt, 1 jam, 2 jam, atau lain), link (opsional). Setiap entri bernilai +0,15 poin, maksimal 5. Formatnya langsung **Isi sekaligus**: beberapa entri dalam satu form, sesuai fitur yang ada sekarang
- 2.2 **Belajar** (pengembangan diri): judul, durasi, dan ringkasan satu kalimat. Jika kosong sebulan, nilai K3 Pengembangan diri maksimal 2.

### 3. Progres

- 3.1 K1 berjalan bulan ini, dengan rincian:
  - per indikator (SBK-1 s.d. 5): target, realisasi, skor
  - poin tambahan dari tugas delegasi dan jurnal
- 3.2 K1 per unit (untuk staf yang rangkap)
- 3.3 Riwayat IKP bulan-bulan sebelumnya: K1, K2, K3, K4, predikat
- 3.4 Rapor PDF per bulan
- 3.5 **Ajukan inovasi (K4)**: hanya aktif ≤ 5 hari kerja setelah bulan berakhir

### 4. Akun

- 4.1 Profil dan daftar penugasan: unit dan koordinatornya
- 4.2 Ganti password
- 4.3 Pengaturan notifikasi (web push)
- 4.4 Panduan pasang aplikasi di HP (PWA)
- 4.5 Tema terang/gelap
- 4.6 Keluar

## B. Di luar tab

- 5.1 **Notifikasi**:
  - pengingat pukul 15.00 bila belum ada aktivitas
  - tugas mendekati atau lewat tenggat
  - item ditolak
  - tugas delegasi baru
- 5.2 **Usulkan tugas**: staf mengusulkan tugas ke koordinator. Saat ini hanya ada untuk Staf Khusus. **\[?\] Perlu juga untuk Staf Administrasi? - Tidak perlu**

## C. Yang sengaja tidak bisa diakses staf

K3 dan catatan perilaku tentang dirinya, data staf lain, jadwal kegiatan (staf hanya menerima checklist hasilnya), verifikasi, rekap kantor, dan menu admin.

## Pertanyaan yang memengaruhi alur

- [ ] Apakah staf boleh **menambah sendiri item pengingat atau SPP** di luar checklist kegiatan? Atau semua item jenis itu wajib berasal dari jadwal koordinator? Kalau boleh, ada risiko staf hanya mencatat item yang tepat waktu. Kalau tidak boleh, kegiatan dadakan harus diinput koordinator dulu. Jawab: Tidak Boleh
- [ ] Apakah staf boleh **melihat IKP berjalan (K1) setiap hari**, atau hanya rincian target/realisasi tanpa skor? Skor harian bisa memotivasi, tetapi juga bisa memicu staf mengejar angka. - Tambahkan skor harian

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Item pengingat/SPP buatan staf | Tidak boleh. Hanya dari checklist kegiatan yang dijadwalkan koordinator |
| Checklist otomatis per kegiatan | Pengingat (ke-1 dan ke-2), SPP (tenggat H-7), SPB (tenggat ≤ 7 hari setelah kegiatan, sesuai pedoman) |
| Surat dan layanan lewat + Catat | Boleh tanpa kegiatan; pilih kegiatan bersifat opsional |
| Target layanan (SBK-4) dan arsip (SBK-5) | Dari yang dicatat staf lewat + Catat; dikendalikan lewat uji petik arsip koordinator |
| Skor harian | Ditampilkan: skor K1 berjalan bulan ini, diperbarui setiap hari |
| Butir 1.5, 3.5, 4.5 | Dipertahankan |
| Usulkan tugas | Tidak dipakai untuk Staf Administrasi |
| Mockup dan prototipe | Semua menu: Tugas (beranda, detail, tandai selesai), + Catat, Jurnal & Belajar, Progres, Akun |
| SPB saat dana SPP belum cair | Staf bisa menandai Pending. Tenggat berhenti sampai Keuangan mengonfirmasi tanggal cair, lalu ≤ 7 hari setelah cair. Perlu penyesuaian bunyi SBK-2b di pedoman (tenggat dihitung dari kegiatan). |
