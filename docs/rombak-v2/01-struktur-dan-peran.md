# 01 — Struktur, Peran, dan Aturan Umum

Sumber: SK D.008/QR/I/04/1448 (8 Oktober 2026) dan dokumen "UX Flow Baru" (26 Nov 2026). Bagian UX Flow yang sudah digantikan keputusan per peran (02–05) **tidak** dibawa ke sini.

## Ringkasan perubahan

- Aplikasi disusun dari **pekerjaan**, bukan dari daftar indikator. Pegawai membuka aplikasi dan langsung melihat apa yang harus dikerjakan hari ini; sistem memetakannya ke indikator K1 di belakang layar. Kode indikator tidak pernah tampil di layar staf.
- **Rumus K1 tidak berubah** untuk Staf Administrasi (SBK-1..5 + SBK-TK + SBK-JR) dan Staf Khusus/Tugas Rutin (SK-TK + SK-JR). K2, K3, K4, dan rumus IKP tetap.
- **K1 Koordinator = rata-rata K1 seluruh staf di unitnya** (tanpa KSBK-1 dan KSBK-3). Bila koordinator juga staf di unit lain, K1 gabungan = rata-rata per penugasan.
- **4 tab yang sama untuk semua peran**: Tugas · Jurnal · Progres · Akun. Fungsi koordinator ada di segmen **Tim** pada tab Tugas.
- **Pindah Amanah dihapus.** Semua penugasan seseorang tampil dalam satu daftar dengan label unit kecil; chip filter unit muncul hanya bagi yang rangkap.

## 18 unit menurut SK

Pola kerja: **Administrasi** (A–M) dan **Tugas Rutin** (N–R). Anggota dihitung termasuk koordinator dan wakil.

| Kode | Unit | Koordinator | Wakil Koordinator | Anggota | Pola kerja |
| --- | --- | --- | --- | --- | --- |
| A | Dakwah, Kaderisasi & PSDM | Erwin Ardiansyah | – | 5 | Administrasi |
| B | Khidmah Al-Quran | Muh. Ilham Dwi Buana Runi | Muharramsyah | 4 | Administrasi |
| C | Ketahanan Keluarga | Muh. Amir Gani | – | 2 | Administrasi |
| D | Pendidikan | Muchtadyn Abdul Aziz | – | 3 | Administrasi |
| E | Keorganisasian | Muh. Rasul Ramli | – | 4 | Administrasi |
| F | Pelayanan Umat | Muh. Hakim | Andi Gunawan | 5 | Administrasi |
| G | Ekonomi | Abdul Malik Mustam | – | 6 | Administrasi |
| H | Pembinaan Generasi Muda | Andi Muh. Reza R. Azikin | – | 3 | Administrasi |
| I | Transformasi Digital | Suharjo Said | – | 3 | Administrasi |
| J | Pusat-Pusat | Ariesman M. | – | 3 | Administrasi |
| K | Kesekretariatan Jenderal | Muh. Musri Madung | Muh. Rafiq, Muh. Yasser Arafat | 7 | Administrasi |
| L | Perbendaharaan | H. Jumain Rusman | – | 5 | Administrasi |
| M | Dewan Syura, Dewan Syariah & DPK | KM. Amirullah | – | 5 | Administrasi |
| N | Pelayanan Umum | Syarifuddin Usman | – | 6 | Tugas Rutin |
| O | Pelayanan Media | Rustam Hafid | – | 2 | Tugas Rutin |
| P | Pelayanan Keamanan | H. Hasta Ahmad | – | 15 | Tugas Rutin |
| Q | Sekolah Dai | M. Dzul Fadli S | – | 5 | Tugas Rutin |
| R | Staf Khusus | M. Amin Daus | – | 6 | Tugas Rutin |

Catatan:
- Daftar SKUO tidak ada di SK, jadi tetap dikelola sebagai data master terpisah.
- Wakil Koordinator (B, F, K) punya akses sama dengan Koordinator **kecuali mengisi K3**.

## Peran di aplikasi

| Peran | Siapa | Status | Isi utama |
| --- | --- | --- | --- |
| Staf Administrasi | Anggota unit A–M | Dirancang (doc 02) | Tugas dari checklist kegiatan + delegasi + Catat |
| Staf Tugas Rutin | Anggota unit N–R | Dirancang (doc 03) | Tugas rutin dari Set Tugas + delegasi |
| Koordinator / Wakil, A–M | 13 koordinator + wakil | Dirancang (doc 04) | Segmen Tim: verifikasi, jadwal (konfirmasi rencana), delegasi, manage tim |
| Koordinator / Wakil, N–R | 5 koordinator | Dirancang (doc 05) | Segmen Tim: verifikasi, Set Tugas, Atur Tugas Staf, usulan |
| **Admin** | Sekretaris + 2 Wakil Sekretaris | Peran **Sekretariat dilebur ke Admin** | Data master, penugasan, indikator, libur, periode, + tugas Sekretariat lama (hitung & kunci IKP, ekspor) |
| Personalia | Muh. Yasser Arafat | **Ditunda** | – |
| Keuangan (Bendahara) | Abd. Rahman Sampara | **Ditunda** | – |
| Wakil Kepala Kantor I & II | – | **Ditunda** | – |
| Kepala Kantor | – | **Ditunda** | – |

Aturan pemersatu: **apa pun yang menuntut tindakan seseorang muncul di "Tugas · Saya"-nya.**

## Pengganti sementara selama akun ditunda (disetujui 26 Nov 2026)

| Fungsi | Pemilik semula | Pengganti sementara |
| --- | --- | --- |
| Tanda SPP/SPB "sesuai SOP" | Bendahara | Tidak dinilai; SBK-2a/2b hanya mengukur ketepatan waktu |
| Konfirmasi dana cair untuk SPB pending | Bendahara | Koordinator unit |
| Unggah rekap absensi (K2) | Personalia | Admin |
| Kalibrasi K3 | WaKa I & II | Ditiadakan selama uji coba |
| Penetapan tingkat K4 | WaKa I & II | Admin |
| Pengesahan IKP bulanan | Kepala Kantor | IKP yang dikunci Admin langsung final |

**Aturan saling periksa Admin:** tidak ada Admin yang mengunci IKP, menetapkan K4, atau mengunggah absensi untuk datanya sendiri; sistem mengalihkannya ke salah satu dari dua Admin lainnya. (Ketiga Admin juga koordinator/staf: Erwin = Koord A; Muh. Rasul Ramli = Koord E; Andi Muh. Reza R. Azikin = staf A + Koord H.)

## Rangkap jabatan

13 pegawai memegang lebih dari satu peran. Semua tampil dalam **satu daftar** tugas berlabel unit.

| Pegawai | Peran |
| --- | --- |
| Supriadi Sudirja | Staf A, J, K |
| Muh. Yusuf Rachman Rivai | Staf D, H, K |
| Ahsan Muzakkir | Staf A, G |
| Mussaddiq M | Staf B, G |
| Muharramsyah | Wakil Koord B, staf E |
| Marzuki | Staf C, F |
| Suhaedi | Staf G, L |
| Muh. Ridho Rachman | Staf J, M |
| Erwin Ardiansyah | Sekretaris (Admin), Koord A |
| Muh. Rasul Ramli | Wakil Sekretaris (Admin), Koord E |
| Andi Muh. Reza R. Azikin | Wakil Sekretaris (Admin), staf A, Koord H |
| Muh. Yasser Arafat | Personalia (ditunda), Wakil Koord K |
| Abd. Rahman Sampara | Keuangan (ditunda), staf L |

Aturan tampilan:
- Set tab mengikuti peran tertinggi; tugas dari peran lebih rendah masuk ke segmen Saya.
- Tab Progres menampilkan K1 per penugasan dan K1 gabungan (rumus penggabungan tidak berubah).
- **Beban lintas unit terlihat oleh pemberi tugas:** saat mendelegasikan, layar menampilkan jumlah tugas staf itu pekan ini dari semua unit.
- Pantau skor staf rangkap 2–3 unit selama uji coba sebelum memutuskan bobot alokasi.

## Risiko yang perlu dikomunikasikan sebelum rilis

1. **Target K1 Staf Administrasi kemungkinan naik.** Item yang dulu tidak dicatat kini otomatis terhitung, jadi skor bulan pertama bisa turun walau kinerja sama. Sampaikan ke pegawai dan pimpinan sejak awal; jangan bandingkan skor lintas versi selama uji coba.
2. **Insentif longgar pada koordinator.** K1 koordinator = rata-rata staf, sedangkan koordinator juga yang menyetujui item staf. Opsi mitigasi (belum diputuskan): audit acak oleh Admin, atau tampilkan rasio persetujuan per koordinator di rekap Admin.
3. **Pedoman perlu diperbarui:** bunyi SBK-2b (tenggat dihitung dari tanggal dana cair bila pending) dan bagian KSBK (K1 koordinator = rata-rata staf; KSBK-1c dihapus dari skor).

## Masih terbuka

- Pembagian 18 unit antara WaKa I dan WaKa II (baru relevan saat akun WaKa diaktifkan).
- Daftar SKUO resmi sebagai data master.
- Pemeriksa absensi milik Personalia sendiri (relevan saat akun Personalia aktif).
