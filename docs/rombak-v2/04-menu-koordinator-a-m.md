# Menu Koordinator Staf A–M — Aplikasi IKP

Nov 26, 2026 · @Reza Ramadhan

Daftar menu Koordinator Staf unit A–M (Staf Administrasi). Prinsipnya **Keep It Simple**: koordinator memakai 4 tab yang sama dengan staf. Pekerjaan koordinator ada di segmen **Tim** pada tab Tugas, dan input kegiatan diganti dengan **konfirmasi rencana** dari SIMAKPRO. Tanda **\[?\]** = perlu keputusan.

## A. Navigasi bawah (4 tab, sama dengan staf)

### 1. Tugas — segmen Saya | Tim

Bagian atas tab Tugas punya dua segmen. Segmen **Tim** terbuka secara bawaan bila ada item yang menunggu diperiksa; selain itu yang terbuka **Saya**.

**Segmen Saya** (sama dengan layar Staf Administrasi)

- 1.1 Tugas pribadi koordinator: tugas sebagai staf di unit lain (bila rangkap), dan **laporan bidang bulanan** (KSBK-3, kirim link)
- 1.2 Tombol + Catat dan pending SPB berlaku sama seperti staf, bila koordinator juga menjadi staf di unit lain

**Segmen Tim**

- 1.3 Tiga angka: **Perlu diperiksa · Terlambat · Pending dana**
- 1.4 **Verifikasi**: daftar item staf (pengingat, surat, layanan, arsip, tugas delegasi)
  - tombol Setujui, Tolak (alasan wajib), dan **Setujui semua**
  - SPP/SPB diperiksa Keuangan; di sini hanya terlihat statusnya
- 1.5 **Jadwal (konfirmasi rencana)**:
  - sejak tgl 25 muncul kartu **"Rencana \[bulan depan\]: n kegiatan"**, sudah terisi dari rencana SIMAKPRO yang diimpor setahun sekali
  - tiap kegiatan diberi satu status: **Jalan sesuai jadwal · Geser (pilih tanggal baru) · Ditunda (masuk ke rencana bulan berikutnya) · Batal (alasan wajib)**
  - checklist staf baru dibuat setelah kegiatan berstatus Jalan atau Geser; staf PJ terisi otomatis dari Manage tim
  - **+ Kegiatan** untuk kegiatan tambahan yang tidak ada di SIMAKPRO
  - kegiatan yang tanggalnya berubah di tengah bulan: tenggat checklist ikut bergeser
- 1.6 **Delegasi**: pilih satu atau beberapa staf, judul, tenggat (tanggal + jam), link bukti wajib atau tidak. Saat memilih staf, tampil beban tugasnya pekan ini dari semua unit.
- 1.7 **Manage tim**: memplot setiap staf di unitnya ke departemen (SKUO) yang ia layani, dengan tanda **PJ utama** bila satu departemen dilayani lebih dari satu staf. Anggota unit tetap mengikuti SK dan diatur Admin.
- 1.8 **Profil staf**: tugas berjalan, skor K1 berjalan, departemen yang dipegang, dan tombol tulis catatan perilaku
- 1.9 **Kartu Penilaian bulanan** (hanya di jendela akhir bulan): K3 staf, periksa usulan K4, uji petik arsip

### 2. Jurnal

Sama dengan staf: jurnal kerja (isi sekaligus, durasi per pekerjaan) dan Belajar.

### 3. Progres

- 3.1 Skor K1 koordinator berjalan, diperbarui setiap hari
- 3.2 Rincian: K1 koordinator = rata-rata K1 seluruh staf di unitnya (tanpa komponen KSBK-1 dan KSBK-3). Tampil daftar K1 per staf dan rata-ratanya
- 3.3 K1 sebagai staf di unit lain (bila rangkap)
- 3.4 Riwayat IKP, rapor PDF, ajukan K4 di jendela akhir bulan

### 4. Akun

Sama dengan staf: profil dan penugasan, ganti password, notifikasi, panduan PWA, tema, keluar.

## B. Di luar tab

- 5.1 **Notifikasi**:
  - item menunggu diperiksa lebih dari 1 hari kerja (item yang belum diperiksa belum dihitung ke skor staf)
  - rencana bulan depan belum dikonfirmasi (sejak tgl 25, batas tgl 5)
  - SPB yang dananya sudah dikonfirmasi cair oleh Keuangan
  - pengingat pukul 15.00 untuk tugas pribadinya
- 5.2 **Wakil Koordinator** (unit B, F, K): akses sama, kecuali tidak mengisi K3

## C. Tidak bisa diakses

Data unit lain, mengubah anggota unit (tetap ikut SK, diatur Admin), kalibrasi K3, penetapan K4, rekap kantor, pengesahan IKP, dan menu admin.

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Struktur tab | 4 tab sama dengan staf (Tugas, Jurnal, Progres, Akun). Fungsi koordinator di segmen Tim pada tab Tugas |
| Sumber kegiatan | Rencana SIMAKPRO/RKA diimpor Admin setahun sekali. Koordinator hanya mengonfirmasi tiap bulan: Jalan, Geser, Ditunda, atau Batal |
| Checklist staf | Dibuat setelah kegiatan dikonfirmasi Jalan atau Geser. Kegiatan yang belum pasti tidak menjadi target |
| Staf PJ | Terisi otomatis dari plot Manage tim (PJ utama per departemen) |
| Plot staf ke departemen | Ditentukan koordinator lewat Manage tim, bukan Admin. Anggota unit tetap mengikuti SK |
| Konfirmasi rencana | Tugas koordinator. Bila perlu bantuan, memakai delegasi biasa; tidak ada jenis delegasi khusus |
| KSBK-1c | Dihapus dari skor. Batas konfirmasi rencana ≤ tgl 5 tetap berlaku sebagai aturan kerja, tanpa skor |
| Template unduh–unggah Excel | Ditunda. Baru dibuat bila impor tahunan tidak bisa dilakukan |
| K1 koordinator | Rata-rata K1 seluruh staf di unitnya, tanpa KSBK-1 dan KSBK-3. Bila koordinator juga staf di unit lain, K1 gabungan = rata-rata per penugasan. Pedoman (bagian KSBK) perlu disesuaikan. |

## Pertanyaan yang tersisa

- [ ] **Jurnal staf.** Apakah koordinator boleh membaca jurnal stafnya dari Profil staf? Berguna sebagai bahan K3, tetapi staf perlu tahu jurnalnya dibaca. **- Iya, bisa**
- [ ] **Plot diubah di tengah bulan.** Usulan: kegiatan yang belum berjalan ikut pindah ke PJ baru, kegiatan yang sudah berjalan tetap pada PJ lama, dan setiap perubahan tercatat di riwayat. **Oke**
- [ ] **Uji rencana SIMAKPRO.** Ambil RKA satu bidang dan bandingkan kegiatan November di rencana dengan yang benar-benar berjalan. Hasilnya menunjukkan seberapa besar pergeseran jadwal, dan apakah PDF RKA bisa diekstrak dengan bersih untuk impor tahunan. - Saya akan upload setelah canvasnya jadi untuk dicek apakah bisa diimpor dengan rapi

**Disimpan untuk nanti:** tempel daftar kegiatan dari WA, dasbor rasio batal/tunda per unit untuk pimpinan, dan sinkron langsung dengan SIMAKPRO lewat API.
