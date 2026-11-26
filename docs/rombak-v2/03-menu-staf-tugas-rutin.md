# Menu Staf Tugas Rutin — Aplikasi IKP

Nov 26, 2026 · @Reza Ramadhan

Daftar menu Staf Tugas Rutin (unit N–R: Pelayanan Umum, Media, Keamanan, Sekolah Dai, Staf Khusus). Strukturnya sama dengan Staf Administrasi, tetapi **tanpa tombol + Catat**: K1 (SK-TK) dihitung dari tugas rutin dan delegasi yang diberikan koordinator. Tanda **\[?\]** = perlu keputusan.

## A. Navigasi bawah (4 tab)

### 1. Tugas (layar pertama)

- 1.1 Kartu ringkasan: unit dan nama set tugas yang aktif, progres hari ini (mis. 3/6), tugas berikutnya beserta jamnya, dan chip skor K1 berjalan
- 1.2 **Perlu diperbaiki**: tugas yang ditolak, beserta alasan dan tombol perbaiki
- 1.3 **Rutin hari ini**, berasal dari set tugas yang diatur koordinator per pekan (menu Atur Tugas Staf), diurutkan berdasarkan jam tenggat. Status tiap baris:
  - belum
  - menunggu diperiksa
  - disetujui
  - terlambat
- 1.4 **Delegasi**: tugas sekali dari koordinator, dengan tanggal dan jam tenggat
- 1.5 **Centang cepat** langsung dari daftar, tanpa membuka detail, untuk tugas yang tidak meminta link bukti
- 1.6 **Detail tugas**:
  - uraian, jam tenggat, pemberi tugas, dan apakah link bukti wajib
  - tombol Tandai selesai, dengan catatan atau link hanya bila diminta
  - riwayat
- 1.7 **Besok**: pratinjau tugas rutin hari berikutnya

### 2. Jurnal (sama dengan Staf Administrasi)

- 2.1 Jurnal kerja dalam format isi sekaligus: uraian, durasi per pekerjaan, link (opsional). Setiap entri +0,15 poin, maksimal 5.
- 2.2 Belajar (pengembangan diri)

### 3. Progres

- 3.1 Skor K1 berjalan, diperbarui setiap hari
- 3.2 Rincian:
  - tugas jatuh tempo, selesai tepat waktu, terlambat, ditolak
  - dipisah antara rutin dan delegasi
- 3.3 Poin tambahan dari jurnal
- 3.4 Riwayat IKP dan rapor PDF
- 3.5 Ajukan inovasi (K4), hanya aktif di jendela akhir bulan

### 4. Akun

- 4.1 Profil dan penugasan
- 4.2 Ganti password
- 4.3 Notifikasi
- 4.4 Panduan pasang PWA
- 4.5 Tema terang/gelap
- 4.6 Keluar

## B. Di luar tab

- 5.1 **Notifikasi**:
  - pengingat pukul **15.00** bila masih ada tugas yang belum ditandai selesai (sama dengan Staf Administrasi)
  - item ditolak
  - delegasi baru
- 5.2 **Usulkan tugas rutin** ke koordinator. Fitur ini sudah ada untuk Staf Khusus, tetapi dihapus untuk Staf Administrasi.

## C. Tidak bisa diakses

Sama dengan Staf Administrasi: K3 dan catatan perilaku tentang dirinya, data staf lain, penyusunan tugas rutin (hanya koordinator), verifikasi, rekap kantor, dan admin.

## Pertanyaan yang memengaruhi alur

- [ ] **Shift.** Apakah jadwal shift Keamanan (siapa jaga kapan) diatur di aplikasi? Kalau ya, tugas rutin melekat pada shift dan "Rutin hari ini" mengikuti jadwal jaga. Kalau tidak, tugas rutin melekat langsung ke orangnya setiap hari kerja. -- Apakah bisa daftar tugas rutin itu dibuat template, jadi nanti koordinator di bagian tersebut tinggal memilih template tersebut, jadi nanti ada template DTR keamana shift pagi, kemanan shift malam, pelayanan shift pagi, dll
- [ ] **Izin, sakit, atau cuti.** Tugas rutin pada hari pegawai tidak masuk sebaiknya dikeluarkan dari target. Datanya baru ada saat Personalia mengunggah absensi di awal bulan berikutnya, jadi skor harian bisa sempat turun lalu naik kembali setelah absensi diunggah. Apakah ini bisa diterima? Oke diterima
- [ ] **Pemeriksaan.** Untuk unit besar seperti Keamanan (15 orang, ±6 tugas per hari), pilih salah satu: koordinator menyetujui massal setiap hari, atau tugas yang selesai sebelum tenggat otomatis disetujui bila tidak ditolak dalam 2 hari kerja. -- Buat opsi massal setujui

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Sumber tugas rutin | Set Tugas = kumpulan tugas rutin bernama, seperti folder. Tidak harus terkait shift; namanya bebas, mis. Keamanan shift pagi, Kebersihan harian, Media harian. Koordinator mengatur set tugas tiap staf lewat menu Atur Tugas Staf **per pekan** |
| Set tugas yang tugasnya melewati tengah malam | Diatur manual: Admin punya pengaturan per set tugas untuk menentukan tugas setelah 00.00 masuk hari yang mana |
| Izin, sakit, cuti | Tugas pada hari itu dikeluarkan dari target setelah absensi diunggah. Skor harian boleh sempat turun lalu naik kembali |
| Pemeriksaan | Koordinator memakai **Setujui semua** (persetujuan massal) |
| Notifikasi pengingat | Pukul 15.00, sama dengan Staf Administrasi |
| Pratinjau besok (1.7) | Dipertahankan |
| Usulkan tugas rutin (5.2) | Dipertahankan |
| Lapor kejadian (1.8) | Dihapus |
