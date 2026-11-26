# 04 — Menu Koordinator Staf A–M

Sumber: doc "Menu Koordinator Staf A–M — Aplikasi IKP" (26 Nov 2026). Mockup: kanvas halaman **koor** (Kor-1-Tim … Kor-7-Progres).

Prinsip **Keep It Simple**: koordinator memakai 4 tab yang sama dengan staf. Pekerjaan koordinator ada di segmen **Tim** pada tab Tugas, dan input kegiatan diganti **konfirmasi rencana** dari SIMAKPRO.

## A. Navigasi bawah (4 tab)

### 1. Tugas — segmen Saya | Tim

Segmen Tim terbuka secara bawaan bila ada item yang menunggu diperiksa; selain itu Saya.

**Segmen Saya** (sama dengan layar Staf Administrasi)
- 1.1 Tugas pribadi koordinator: tugas sebagai staf di unit lain (bila rangkap) dan **laporan bidang bulanan** (kirim link).
- 1.2 + Catat dan Pending SPB berlaku sama seperti staf, bila koordinator juga staf di unit lain.

**Segmen Tim**
- 1.3 Tiga angka: **Perlu diperiksa · Terlambat · Pending dana**.
- 1.4 **Verifikasi**: daftar item staf (pengingat, surat, layanan, arsip, tugas delegasi). Tombol Setujui, Tolak (alasan wajib), dan **Setujui semua**. Status SPP/SPB juga tampil di sini.
  - Selama akun Keuangan ditunda: koordinator yang memeriksa SPP/SPB (ketepatan waktu saja) dan mengonfirmasi tanggal dana cair untuk SPB pending.
- 1.5 **Jadwal (konfirmasi rencana)**:
  - Sejak tgl 25 muncul kartu **"Rencana [bulan depan]: n kegiatan"**, sudah terisi dari rencana SIMAKPRO yang diimpor setahun sekali.
  - Tiap kegiatan diberi satu status: **Jalan sesuai jadwal · Geser** (pilih tanggal baru) **· Ditunda** (masuk ke rencana bulan berikutnya) **· Batal** (alasan wajib).
  - Checklist staf baru dibuat setelah kegiatan berstatus Jalan atau Geser; staf PJ terisi otomatis dari Manage tim.
  - **+ Kegiatan** untuk kegiatan tambahan yang tidak ada di SIMAKPRO.
  - Tanggal kegiatan yang berubah di tengah bulan: tenggat checklist ikut bergeser.
- 1.6 **Delegasi**: pilih satu atau beberapa staf, judul, tenggat (tanggal + jam), link bukti wajib atau tidak. Saat memilih staf, tampil beban tugasnya pekan ini dari semua unit.
- 1.7 **Manage tim**: memplot setiap staf di unitnya ke departemen (SKUO) yang ia layani, dengan tanda **PJ utama** bila satu departemen dilayani lebih dari satu staf. Anggota unit tetap mengikuti SK dan diatur Admin.
- 1.8 **Profil staf**: tugas berjalan, skor K1 berjalan, departemen yang dipegang, jurnal staf, dan tombol tulis catatan perilaku.
- 1.9 **Kartu Penilaian bulanan** (hanya di jendela akhir bulan): K3 staf, periksa usulan K4, uji petik arsip.

### 2. Jurnal

Sama dengan staf: jurnal kerja (isi sekaligus, durasi per pekerjaan) dan Belajar.

### 3. Progres

- K1 koordinator berjalan, diperbarui setiap hari.
- Rincian: **K1 koordinator = rata-rata K1 seluruh staf di unitnya** (tanpa KSBK-1 dan KSBK-3). Tampil daftar K1 per staf dan rata-ratanya.
- K1 sebagai staf di unit lain (bila rangkap).
- Riwayat IKP, rapor PDF, ajukan K4 di jendela akhir bulan.

### 4. Akun

Sama dengan staf.

## B. Di luar tab

- **Notifikasi**: item menunggu diperiksa > 1 hari kerja (item yang belum diperiksa belum dihitung ke skor staf); rencana bulan depan belum dikonfirmasi (sejak tgl 25, batas tgl 5); pengingat 15.00 untuk tugas pribadinya.
- **Wakil Koordinator** (unit B, F, K): akses sama, kecuali tidak mengisi K3.

## C. Tidak bisa diakses

Data unit lain, mengubah anggota unit (ikut SK, diatur Admin), kalibrasi K3, penetapan K4, rekap kantor, pengesahan IKP, menu admin.

## Keputusan

| Hal | Keputusan |
| --- | --- |
| Struktur tab | 4 tab sama dengan staf. Fungsi koordinator di segmen Tim pada tab Tugas |
| Sumber kegiatan | Rencana SIMAKPRO/RKA diimpor Admin setahun sekali. Koordinator hanya mengonfirmasi tiap bulan: Jalan, Geser, Ditunda, atau Batal |
| Checklist staf | Dibuat setelah kegiatan dikonfirmasi Jalan atau Geser. Kegiatan yang belum pasti tidak menjadi target |
| Staf PJ | Terisi otomatis dari plot Manage tim (PJ utama per departemen) |
| Plot staf ke departemen | Ditentukan koordinator lewat Manage tim, bukan Admin. Anggota unit tetap mengikuti SK |
| Konfirmasi rencana | Tugas koordinator. Bila perlu bantuan, memakai delegasi biasa; **tidak ada jenis delegasi khusus** |
| KSBK-1c | Dihapus dari skor. Batas konfirmasi ≤ tgl 5 tetap berlaku sebagai aturan kerja, tanpa skor |
| Template unduh–unggah Excel | Ditunda. Baru dibuat bila impor tahunan tidak bisa dilakukan |
| K1 koordinator | Rata-rata K1 seluruh staf di unitnya, tanpa KSBK-1 dan KSBK-3. Bila rangkap, K1 gabungan = rata-rata per penugasan. Bagian KSBK di pedoman perlu disesuaikan |
| Jurnal staf | Koordinator boleh membacanya dari Profil staf |
| Plot diubah di tengah bulan | Kegiatan yang belum berjalan pindah ke PJ baru; yang sudah berjalan tetap pada PJ lama; setiap perubahan tercatat di riwayat |
| Uji rencana SIMAKPRO | Pemilik akan mengunggah RKA untuk dicek apakah bisa diimpor dengan rapi (belum dilakukan) |

Disimpan untuk nanti: tempel daftar kegiatan dari WA, dasbor rasio batal/tunda per unit untuk pimpinan, sinkron langsung dengan SIMAKPRO lewat API.
