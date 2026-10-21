# PRD — Aplikasi IKP Pegawai Kantor Pusat Wahdah Islamiyah

> Versi 1.0 · 21 Oktober 2026 · Acuan: *Draf 3 Pedoman Pengukuran Kinerja (KPI) Pegawai Kantor Pusat WI* (belum disahkan) dan sheet *STRUKTUR KPWI*.
> Status: siap dibangun untuk masa **uji coba 3 bulan**. Bagian 13 berisi hal yang masih terbuka.

---

## 1. Ringkasan

Aplikasi web mobile-first yang ringan. Pegawai mengisi **log indikator** dan **jurnal kerja** setiap hari. Koordinator memverifikasi dan menilai. Di akhir bulan, aplikasi menghasilkan **IKP bulanan (K1–K4)** per pegawai. Pimpinan bisa memantau pengisian dan capaian **setiap hari**.

**Prinsip produk**
1. **Input harian adalah sumber angka K1.** Setiap item yang dicatat pegawai otomatis menjadi target dan realisasi. Tidak ada rekap ulang di akhir bulan.
2. **Isi harian maksimal 3 menit.** Form pendek, nilai default cerdas, satu tangan di HP.
3. **Berbasis bukti dan dapat diaudit.** Setiap angka bisa ditelusuri ke item, link bukti, dan verifikatornya.
4. **Berbasis peran.** Indikator melekat pada peran, bukan nama orang (Prinsip 4 pedoman).
5. **Tanpa data keuangan di tahap awal.** Output akhir adalah IKP dan predikat. Perhitungan tunjangan dilakukan di luar aplikasi.

## 2. Tujuan dan Non-Tujuan

**Tujuan (uji coba 3 bulan)**
- IKP bulanan K1–K4 keluar otomatis untuk semua pegawai yang indikatornya aktif.
- Kepatuhan pengisian harian bisa dipantau koordinator dan pimpinan.
- Semua kegiatan di luar indikator terdata per bidang/SKUO lewat jurnal.
- Data baseline tersedia untuk kalibrasi target (Bagian 9 pedoman).

**Non-tujuan (tidak dibangun di rilis ini)**
- Perhitungan tunjangan kinerja dalam rupiah.
- Mekanisme keberatan IKP di dalam aplikasi.
- Indikator K1 Kepala Unit Pendukung (5.3), ditunda sampai setelah uji coba.
- Absensi langsung di aplikasi (check-in GPS).
- Upload file bukti. Bukti hanya berupa link.
- Integrasi otomatis SIMAKPRO (saat ini SIMAKPRO baru bisa ekspor PDF).
- Indikator Fase 2 berbasis e-office.

**Metrik keberhasilan uji coba**
| Metrik | Target |
|---|---|
| Pegawai aktif yang mengisi log/jurnal per hari kerja | ≥ 80% |
| Item diverifikasi ≤ 5 hari kerja setelah bulan berakhir | ≥ 95% |
| Indikator Fase 1 yang datanya tersedia tepat waktu | > 90% (kriteria lolos uji coba pedoman) |
| Waktu median isi harian per pegawai | ≤ 3 menit |
| IKP bulanan siap disahkan | ≤ tanggal 10 bulan berikutnya |

## 3. Istilah

| Istilah | Arti di aplikasi |
|---|---|
| **Item** | Satu unit kerja yang dicatat: satu permintaan surat, satu SPP, satu pengingat, satu dokumen arsip, dst. |
| **Target** | Jumlah item yang wajib ditangani pada satu indikator dalam satu bulan. |
| **Realisasi** | Jumlah item yang selesai sesuai standar (tepat tenggat, terverifikasi). |
| **Capaian** | Realisasi ÷ Target × 100%. |
| **Standar capaian** | Angka minimum dari pedoman, mis. ≥ 90%. |
| **Skor indikator** | min(100; Capaian ÷ Standar capaian × 100). |
| **Penugasan** | Satu peran di satu unit/bidang. Satu pegawai bisa punya lebih dari satu. |
| **Jurnal** | Catatan kerja harian di luar indikator. Sekaligus menggantikan Catatan Tugas di Luar Indikator (CT). Tidak masuk skor. |
| **Periode** | Satu bulan kalender. |

> Kata "pembilang/penyebut" tidak dipakai di UI maupun dokumen. Gunakan Target dan Realisasi.

## 4. Pengguna dan Hak Akses

| Peran sistem | Siapa | Bisa |
|---|---|---|
| **Pegawai** | SBK, Staf Khusus, staf unit pendukung | Isi log item, jurnal, log pengembangan diri, checklist DTR; ajukan K4; lihat progres dan IKP sendiri |
| **Koordinator** | KSBK (13 bidang), Kepala Unit Pendukung, atasan Staf Khusus | Semua hak Pegawai untuk dirinya; input kegiatan bulanan bidang; verifikasi item staf; isi K3 staf; setujui DTR; periksa K4; dashboard tim |
| **Wakil Kepala Kantor (I/II)** | 2 orang | Nilai K3 dan verifikasi K1 KSBK, Sekretaris, dan Kepala Unit Pendukung di wilayahnya; kalibrasi K3; tetapkan tingkat K4; dashboard semua |
| **Kepala Kantor** | 1 orang | Dashboard semua; sahkan IKP bulanan |
| **Sekretariat** | Staf Sekretariat yang ditunjuk | Verifikasi akhir; hitung dan kunci IKP sementara; verifikasi laporan bidang (KSBK-3); ekspor |
| **Personalia** | Staf Personalia | Unggah rekap absensi bulanan (K2) |
| **Keuangan (verifikator)** | Staf Keuangan | Tandai SPP/SPB "sesuai SOP / dikembalikan" (SBK-2a/2b, KSBK-1b). *Lihat Bagian 13.2.* |
| **Admin** | Data, Digitalisasi & Monev | Data master, penugasan, indikator, hari libur, periode, akun |

Satu akun bisa memegang beberapa peran sistem sekaligus.

**Aturan konflik kepentingan (wajib ditegakkan di kode, bukan hanya kebijakan)**
- Tidak ada yang bisa memverifikasi item atau menilai K3 miliknya sendiri.
- Petugas Sekretariat atau Data & Monev tidak bisa memverifikasi atau menghitung IKP dirinya sendiri. Sistem mengalihkan ke petugas lain.
- KSBK yang juga staf di bidang lain dinilai oleh KSBK bidang tersebut untuk penugasan itu.

**Pengecualian sementara**
- Kepala Kantor dan Wakil Kepala Kantor hanya dinilai K2. IKP = K2.
- Kepala Unit Pendukung selama uji coba: K1 belum aktif. IKP = 0,5 × K2 + 0,5 × K3 (bobot dinormalisasi). *Perlu konfirmasi, Bagian 13.5.*

## 5. Alur Kerja

### 5.1 Harian (pegawai)
1. Buka aplikasi → layar **Hari Ini**.
2. Catat item baru atau selesaikan item yang sudah ada (mis. surat masuk pagi, selesai sore).
3. Tulis jurnal singkat untuk pekerjaan di luar indikator (tag SKUO/bidang dan pemberi tugas).
4. Isi log pengembangan diri (judul bacaan/materi, durasi, ringkasan satu kalimat).
5. Staf Khusus: centang checklist DTR hari itu.
6. Pukul 16.00 waktu setempat: pengingat web push untuk yang belum mengisi apa pun hari itu.

Log bisa diisi atau diubah sampai **2 hari kerja ke belakang**. Setelah itu terkunci, kecuali dibuka oleh Admin dengan alasan yang tercatat di audit log.

### 5.2 Harian (koordinator dan pimpinan)
- Koordinator: lihat siapa yang belum mengisi hari ini, item yang menunggu verifikasi, dan item yang mendekati atau melewati tenggat. Verifikasi bisa dicicil kapan saja.
- Koordinator bisa menulis **catatan perilaku** singkat kapan saja. Catatan ini menjadi bahan "contoh perilaku" saat mengisi K3 di akhir bulan.
- Pimpinan: tingkat pengisian per bidang dan skor K1 berjalan.

### 5.3 Bulanan
| Waktu | Kegiatan | Pelaku |
|---|---|---|
| ≤ tgl 5 | Input daftar kegiatan bulan ini untuk bidangnya (dari PKA/SIMAKPRO) | KSBK |
| ≤ tgl 5 | Ajukan DTR (3–5 tugas rutin), disetujui atasan | Staf Khusus, atasan |
| Sepanjang bulan | Log item, jurnal, verifikasi bertahap | Semua |
| ≤ 5 hari kerja setelah bulan berakhir | Selesaikan verifikasi; isi K3; periksa K4; pegawai ajukan K4 | Koordinator, WaKa, pegawai |
| ≤ tgl 5 bulan berikutnya | Unggah rekap absensi | Personalia |
| Setelah batas verifikasi | Kalibrasi K3; tetapkan tingkat K4 | WaKa I & II |
| Setelah kalibrasi | Hitung dan kunci IKP sementara; umumkan ke pegawai | Sekretariat |
| ≤ tgl 10 | Sahkan IKP akhir; ekspor | Kepala Kantor, Sekretariat |

**Item yang belum diverifikasi saat batas waktu:** tidak dihitung sebagai realisasi (tetap dihitung di target), dan koordinatornya ditandai di dashboard pimpinan dan rekap bulanan.

**Status periode:** `berjalan` → `verifikasi` → `kalibrasi` → `sementara` → `disahkan`. Saat `disahkan`, seluruh skor dibekukan sebagai snapshot dan tidak berubah meskipun data master berubah kemudian.

## 6. Pemetaan Indikator ke Sumber Data (Fase 1)

Kolom **Tenggat** dihitung dalam hari kerja (Senin–Jumat, dikurangi hari libur yang diatur Admin, dengan zona waktu kantor pegawai: WITA Makassar, WIB Jakarta).

### 6.1 Staf Bidang Kerja (SBK)
| Kode | Item yang dicatat pegawai | Target = | Realisasi = | Standar | Verifikator |
|---|---|---|---|---|---|
| SBK-1 | Permintaan surat: tgl diterima, SKUO, perihal, tgl selesai, link | jumlah permintaan diterima | selesai ≤ 1 hari kerja | ≥ 90% | KSBK |
| SBK-2a | SPP per kegiatan: tgl input di SIMAKPRO, link/no. SPP | jumlah SPP wajib (dari kegiatan bulan ini) | diinput tepat waktu **dan** ditandai sesuai SOP | ≥ 90% | Keuangan |
| SBK-2b | SPB per kegiatan: tgl input | jumlah SPB wajib | diinput ≤ 7 hari setelah kegiatan **dan** sesuai SOP | ≥ 90% | Keuangan |
| SBK-3 | Pengingat: kegiatan, tanggal kirim, saluran (grup/pesan), link tangkapan layar | jumlah kegiatan terjadwal (input KSBK) | kegiatan dengan ≥ 2 pengingat sebelum tanggal pelaksanaan | 100% | KSBK |
| SBK-4 | Permintaan layanan umum: kegiatan, jenis (media, Zoom, sertifikat, konsumsi, akomodasi), tgl siap | jumlah layanan diajukan | siap sebelum kegiatan dimulai | ≥ 95% | KSBK |
| SBK-5 | Dokumen arsip: jenis (notulensi/dokumen kegiatan), tgl terima, tgl arsip, link | jumlah dokumen wajib arsip | diarsipkan ≤ 3 hari kerja | ≥ 90% | KSBK |

Untuk SBK-2a, SBK-2b, dan SBK-3, target dibuat otomatis dari **kegiatan yang diinput KSBK**. Pegawai tidak menentukan targetnya sendiri.

### 6.2 Koordinator Staf Bidang Kerja (KSBK)
| Kode | Sumber | Cara hitung |
|---|---|---|
| KSBK-1a | Waktu verifikasi item SBK-1 oleh KSBK | draf surat diperiksa ≤ 1 hari kerja setelah staf menandai selesai |
| KSBK-1b | Tanda Keuangan pada SPP/SPB bidang | SPP/SPB tidak dikembalikan karena kesalahan |
| KSBK-1c | Tanggal input kegiatan bulanan | 100 jika kegiatan diinput ≤ tgl 5, selain itu 0 |
| KSBK-1d | Tanggal item SBK-4 dibuat vs tanggal kegiatan | layanan diajukan ≤ H-3 |
| KSBK-1e | Form uji petik arsip bulanan (min. 10 dokumen) | dokumen lengkap dan sesuai indeks ÷ dokumen diuji |
| KSBK-1 | — | rata-rata skor 1a–1e (masing-masing dibatasi 100) |
| KSBK-2 | Otomatis | rata-rata skor K1 staf di bidangnya (tanpa dirinya) ÷ 85 × 100, maks. 100 |
| KSBK-3 | Item laporan bidang bulanan (link) | laporan tepat waktu, diverifikasi Sekretariat |

Sebagian besar KSBK-1 dihitung dari jejak waktu yang sudah ada di aplikasi, sehingga KSBK tidak perlu mengisi ulang.

### 6.3 Staf Khusus (SK)
| Kode | Item | Target = | Realisasi = | Standar |
|---|---|---|---|---|
| SK-1 | Checklist DTR (harian/mingguan sesuai frekuensi tiap tugas) | jumlah tugas DTR terjadwal | tugas dicentang dan disetujui atasan | ≥ 90% |
| SK-2 | Kejadian: waktu kejadian, waktu lapor, uraian | jumlah kejadian | dilaporkan ≤ 1×24 jam | 100% |
| SK-3 | Permintaan layanan: waktu masuk, waktu selesai | jumlah permintaan | selesai ≤ SLA | ≥ 90% |

Untuk staf keamanan, DTR bisa berisi kepatuhan shift dan checklist patroli.

**Indikator tanpa item pada bulan itu** (target = 0) dikeluarkan dari rata-rata K1, bukan diberi skor 100 atau 0. Indikator dengan target ≤ 3 diberi tanda "volume kecil" untuk kalibrasi.

### 6.4 Kepala Unit Pendukung
K1 ditunda setelah uji coba. Katalog indikator tetap disimpan di tabel indikator dengan status `nonaktif`.

## 7. Rumus Perhitungan

```
Skor indikator      = min(100; (Realisasi ÷ Target) ÷ Standar × 100)      # Target > 0
K1 per penugasan    = rata-rata skor indikator aktif (Target > 0)
K1                  = rata-rata K1 per penugasan                           # atau bobot alokasi tertulis, mis. 60/40
K2                  = 0,6 × (hadir ÷ hari kerja wajib × 100)
                    + 0,4 × (hadir tepat waktu ÷ hadir × 100)               # izin/sakit sah tidak mengurangi hari kerja wajib
K3 per penilai      = rata-rata 6 nilai (1–5) × 20
K3                  = rata-rata K3 dari setiap koordinator penugasan
IKP                 = 0,50 × K1 + 0,25 × K2 + 0,25 × K3
K4                  = 0–25 (I=5, II=10, III=15/20, IV=25; maks. 25/bulan; naik tingkat = selisih)
IKP Akhir           = IKP + K4
```

**Aturan K3**
- 6 nilai: Akhlak, Profesional, Inovatif, Kolaboratif, Rasa memiliki, Pengembangan diri.
- Skor 1, 2, atau 5 wajib disertai contoh perilaku (validasi form).
- Pengembangan diri: kalau log pengembangan diri bulan itu kosong, skor maksimal 2 (dikunci di form).
- Kalibrasi: skor 5 tanpa contoh dikembalikan otomatis ke penilai. WaKa melihat sebaran skor per penilai.

**Aturan K4**
- Pegawai mengajukan (judul, tingkat yang diusulkan, link bukti, maks. 3 pengusul untuk inovasi tim) ≤ 5 hari kerja setelah bulan berakhir.
- Atasan langsung memeriksa → WaKa menetapkan tingkat dan poin → disahkan bersama IKP.
- Inovasi yang sama tidak bisa diberi poin dua kali pada tingkat yang sama.
- Dashboard memberi peringatan bila > 20% pegawai menerima K4 dalam sebulan.

**Predikat:** ≥ 90 Sangat Baik · 80–89,99 Baik · 70–79,99 Cukup · 60–69,99 Perlu Perbaikan · < 60 Kurang (dari IKP Akhir).

**Penanda syarat minimum** (hanya informasi, tanpa rupiah): kehadiran < 85% atau sanksi disiplin berat → ditandai "Tidak memenuhi syarat insentif" di rekap.

**Pembulatan:** simpan dengan presisi penuh (numeric), tampilkan 2 desimal. Pembulatan hanya di tampilan dan ekspor.

## 8. Fitur per Layar (MVP)

Navigasi bawah, 4 tab: **Hari Ini · Item · Progres · Akun**. Koordinator dan pimpinan mendapat tab tambahan **Tim**.

### Pegawai
1. **Hari Ini**: kartu ringkas: item terbuka (dengan sisa tenggat), status isian hari ini, tombol besar **+ Catat**. Bagian jurnal dan pengembangan diri bisa dilipat di bawahnya.
2. **+ Catat** (bottom sheet): pilih penugasan (dilewati otomatis kalau hanya satu) → pilih indikator (chip) → field khusus indikator (≤ 5 field, tanggal default hari ini) → link bukti (opsional saat dibuat, wajib saat ditandai selesai).
3. **Item**: daftar item dengan filter status (terbuka, menunggu verifikasi, ditolak, selesai). Item yang ditolak menampilkan alasannya dan bisa diperbaiki.
4. **Jurnal**: satu atau beberapa entri per hari: uraian, SKUO/bidang, pemberi tugas, link (opsional).
5. **Pengembangan diri**: tanggal, judul, durasi (menit), ringkasan satu kalimat.
6. **DTR** (Staf Khusus): checklist hari ini; pengajuan DTR awal bulan.
7. **Progres**: skor K1 berjalan per indikator dan per penugasan, rekap pengisian, riwayat IKP bulan sebelumnya.
8. **K4**: form pengajuan inovasi dan statusnya.

### Koordinator
9. **Tim – Hari Ini**: siapa belum mengisi, item menunggu verifikasi (bisa setujui massal dengan geser/centang), item lewat tenggat.
10. **Verifikasi**: kartu item → Setujui / Tolak (alasan wajib).
11. **Kegiatan bulanan**: input cepat kegiatan bidang (nama, SKUO, tanggal, perlu SPP/SPB ya/tidak). Fitur salin dari bulan lalu. Impor Excel disiapkan di Fase berikutnya.
12. **Catatan perilaku**: catatan singkat per staf, kapan saja.
13. **Penilaian K3**: satu layar per staf, 6 slider/segmen 1–5, catatan perilaku bulan itu tampil sebagai referensi.
14. **Uji petik arsip** (KSBK-1e): form bulanan.

### WaKa, Kepala Kantor, Sekretariat
15. **Dashboard kantor**: tingkat pengisian hari ini dan bulan berjalan per bidang; K1 berjalan; koordinator dengan verifikasi tertunda.
16. **Kalibrasi K3**: sebaran skor per penilai; daftar skor 5 tanpa contoh.
17. **K4**: antrean penetapan tingkat.
18. **Rekap IKP**: tabel semua pegawai per periode, kunci sementara, sahkan.

### Personalia, Admin
19. **Unggah absensi**: unggah CSV/Excel → pratinjau dan validasi (pegawai tidak dikenal, angka tidak masuk akal) → simpan.
20. **Admin**: pegawai dan akun (reset password), unit (bidang, SKUO, unit pendukung), penugasan per periode (termasuk bobot alokasi), katalog indikator (standar, tenggat, status aktif), hari libur, periode, impor awal dari STRUKTUR KPWI.

### Ekspor
- **Rekap IKP bulanan (Excel)**: pegawai, status kepegawaian, penugasan, K1 per penugasan, K1, K2, K3, K4, IKP, IKP Akhir, predikat, penanda syarat minimum, status verifikasi.
- **Rapor per pegawai (PDF)**: satu halaman mengikuti Lampiran B: tabel K1 per penugasan (target, realisasi, skor), K3 dan contoh perilaku, K2, K4, rekap.
- **Rekap jurnal per bidang (Excel)**: semua entri jurnal per periode, dikelompokkan bidang/SKUO, dengan pemberi tugas.

## 9. Pedoman UX Mobile

- Rancang untuk lebar 360 px. Desktop hanya versi lebar dari tata letak yang sama, plus tabel untuk rekap.
- Target sentuh ≥ 44 px; aksi utama di jangkauan jempol (bawah layar).
- Padat tapi terbaca: teks dasar 14–15 px, kartu tanpa ilustrasi, ikon hanya bila membantu.
- Form isian: field sesedikit mungkin, nilai default tanggal hari ini, field terakhir yang dipakai diingat.
- Optimistic UI untuk simpan item. Bila koneksi gagal, draf disimpan di perangkat dan dikirim ulang saat online (cukup untuk form + Catat; bukan full offline).
- Tidak ada grafik berat di HP. Progres ditampilkan sebagai angka dan bar sederhana.
- Bahasa UI: Indonesia, singkat, tanpa singkatan yang tidak umum (tulis "Menunggu verifikasi", bukan "MV").
- PWA: bisa dipasang di Home Screen (wajib untuk web push di iPhone, iOS 16.4+). Tampilkan panduan pasang di onboarding.

**Anggaran performa:** JS first-load per rute ≤ 150 KB gzip; LCP < 2,5 detik di 4G menengah; halaman Hari Ini dirender di server dengan satu query agregat.

## 10. Arsitektur Teknis

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router, versi terbaru boilerplate), Server Components + Server Actions |
| Hosting | Cloudways (Node server, `next start` di bawah PM2/supervisor) |
| Database | PostgreSQL di Neon, driver `@neondatabase/serverless` |
| ORM / migrasi | Drizzle ORM + drizzle-kit |
| Auth | Better Auth, kredensial **No. HP atau NIP + password**; wajib ganti password saat login pertama; sesi 30 hari; rate limit login |
| UI | Tailwind CSS + shadcn/ui (hanya komponen yang dipakai) |
| Validasi | Zod (dipakai bersama di form dan server action) |
| Push | Web Push (VAPID) via `web-push`; service worker PWA |
| Penjadwal | Cron server Cloudways memanggil route API terproteksi secret: pengingat 16.00 WITA/WIB, pengingat tenggat koordinator, penutupan periode |
| Ekspor | Excel: `exceljs`; PDF: render HTML → PDF di server (mis. `@react-pdf/renderer`) |
| Zona waktu | Simpan `timestamptz` (UTC); hitung hari kerja di zona kantor pegawai |

**Catatan Neon:** pakai connection string pooled untuk runtime aplikasi dan unpooled untuk migrasi. Perhatikan cold start di paket gratis (compute bisa tidur), terutama untuk cron pukul 16.00.

### 10.1 Sketsa skema data
```
pegawai(id, nama, nip, no_hp, status_kepegawaian, kantor[makassar|jakarta], aktif)
akun(id, pegawai_id, password_hash, harus_ganti_password, ...)          # dikelola Better Auth
peran_sistem(pegawai_id, peran)                                          # pegawai|koordinator|waka|kepala|sekretariat|personalia|keuangan|admin
unit(id, jenis[bidang|skuo|unit_pendukung|staf_khusus], nama, induk_id, waka_id)
peran_kerja(kode[SBK|KSBK|KU|SK|KAKAN|WAKA], nama)
penugasan(id, pegawai_id, peran_kerja, unit_id, koordinator_id, periode_mulai, periode_selesai, bobot_alokasi)
periode(id, tahun, bulan, status, dikunci_pada, disahkan_oleh)
indikator(id, kode, peran_kerja, nama, tipe[item_tenggat|item_ya_tidak|dtr|turunan], standar_capaian,
          tenggat_hari_kerja, verifikator_peran, fase, aktif)
kegiatan(id, unit_id, skuo_id, nama, tanggal, perlu_spp, perlu_spb, dibuat_oleh, dibuat_pada, sumber[manual|impor])
item(id, penugasan_id, indikator_id, kegiatan_id?, data jsonb, tgl_masuk, tgl_selesai, link_bukti,
     status[terbuka|diajukan|disetujui|ditolak], verifikator_id, diverifikasi_pada, alasan_tolak, periode_id)
jurnal(id, pegawai_id, tanggal, uraian, unit_id, pemberi_tugas, link)
pengembangan_diri(id, pegawai_id, tanggal, judul, durasi_menit, ringkasan)
dtr_tugas(id, penugasan_id, periode_id, uraian, frekuensi, disetujui_oleh)
dtr_cek(id, dtr_tugas_id, tanggal, selesai, disetujui)
catatan_perilaku(id, penilai_id, pegawai_id, tanggal, nilai_k3?, catatan)
penilaian_k3(id, periode_id, penugasan_id, penilai_id, skor x6, contoh x6, status)
absensi(periode_id, pegawai_id, hari_kerja_wajib, hadir, hadir_tepat_waktu, izin_sakit, sanksi_berat)
k4_pengajuan(id, periode_id, judul, tingkat_usulan, tingkat_ditetapkan, poin, link_bukti, inovasi_induk_id, status)
k4_pengusul(k4_id, pegawai_id)
uji_petik_arsip(id, periode_id, unit_id, jumlah_diuji, jumlah_sesuai, catatan)
hasil_ikp(periode_id, pegawai_id, rincian jsonb, k1, k2, k3, k4, ikp, ikp_akhir, predikat, syarat_minimum, versi)
hari_libur(tanggal, keterangan, kantor?)
push_subscription(id, pegawai_id, endpoint, keys)
audit_log(id, aktor_id, aksi, entitas, entitas_id, sebelum jsonb, sesudah jsonb, waktu)
```

- `item.data` (jsonb) menampung field khusus per indikator; skema field-nya didefinisikan di kode (Zod) per kode indikator.
- Skor berjalan dihitung on-the-fly dari `item`; `hasil_ikp` hanya ditulis saat periode dikunci dan disahkan (snapshot).
- Semua perubahan pada item, penilaian, absensi, dan hasil IKP masuk `audit_log`.

### 10.2 Impor awal
Satu kali dari sheet STRUKTUR KPWI (tab *Nama* dan *Detail Bidang*) yang diekspor ke CSV: pegawai, status kepegawaian, kantor, 13 kelompok bidang (Bidang 1–9, Pusat-Pusat, Kesetjenan, Kebendaharaan, Dewan-Dewan), SKUO, Staf Khusus, koordinator, dan penugasan. Skrip impor menghasilkan laporan baris yang gagal dicocokkan. Setelah impor, data diubah lewat Admin.

## 11. Kebutuhan Non-Fungsional

- **Keamanan:** password di-hash; otorisasi dicek di setiap server action (bukan hanya disembunyikan di UI); aturan konflik kepentingan diuji otomatis; link bukti hanya terlihat oleh pemilik, verifikator, dan pimpinan.
- **Privasi:** pegawai hanya melihat IKP dirinya; koordinator melihat timnya; pimpinan, Sekretariat, dan Admin melihat semua.
- **Ketersediaan:** cukup jam kerja; backup harian Neon (point-in-time restore sesuai paket).
- **Skala:** ±110 akun, ±90 pegawai dinilai, perkiraan < 5.000 item per bulan. Tidak perlu cache khusus.
- **Pengujian:** unit test untuk semua rumus (pakai 3 contoh di Lampiran C sebagai fixture setelah disesuaikan ke 6 nilai K3) dan untuk kalkulator hari kerja.

## 12. Tahapan Pembangunan

| Milestone | Isi | Selesai bila |
|---|---|---|
| **M0 – Fondasi** | Skema, auth, peran, Admin dasar, impor STRUKTUR KPWI, hari libur, kalkulator hari kerja | Semua pegawai bisa login dan melihat penugasannya |
| **M1 – Input harian** | + Catat, Item, Jurnal, Pengembangan diri, DTR, Kegiatan bulanan, Verifikasi, PWA + push 16.00 | Satu bidang pilot bisa mengisi selama 1 minggu |
| **M2 – Penilaian** | Unggah absensi, K3 + catatan perilaku, K4, uji petik arsip, mesin perhitungan IKP, status periode | IKP satu bulan pilot cocok dengan hitungan manual |
| **M3 – Kontrol dan laporan** | Dashboard koordinator/pimpinan, kalibrasi, rekap dan pengesahan, 3 ekspor | Kepala Kantor bisa mengesahkan dan mengunduh rekap |
| **Uji coba** | 3 bulan, tanpa dampak insentif | Kriteria lolos uji coba di Bagian 9 pedoman terpenuhi |

Saran: jalankan M1 di **satu bidang pilot** selama 1–2 minggu sebelum dibuka ke semua pegawai. Masalah form dan beban input lebih murah diperbaiki di 7 orang daripada di 90.

## 13. Hal Terbuka dan Risiko

### Perlu keputusan sebelum M1
1. **Tenggat SPP (SBK-2a).** Pedoman hanya menulis "tepat waktu sesuai SOP" tanpa angka hari. Aplikasi butuh angka (mis. ≤ H-x sebelum kegiatan).
2. **Apakah Keuangan memakai aplikasi** untuk menandai SPP/SPB "sesuai SOP/dikembalikan"? Kalau tidak, SBK-2a/2b dan KSBK-1b hanya bisa mengukur ketepatan waktu, bukan kesesuaian SOP.
3. **Tenggat SBK-1.** Jawaban pertanyaan no. 1 di pedoman ("tercatat pada hari Rabu pertama setiap bulan") membahas laporan berkala SKUO/LPJ, sedangkan SBK-1 sekarang tentang surat ≤ 1 hari kerja. Aplikasi memakai ≤ 1 hari kerja; jawaban di pedoman perlu dirapikan.
4. **Jumlah nilai K3.** Bagian 4.1 memakai 6 nilai, Lampiran C masih 4 nilai. Aplikasi memakai 6; Lampiran C perlu diperbarui.
5. **Bobot IKP Kepala Unit Pendukung selama uji coba** (usulan: 50% K2 + 50% K3).
6. **Contoh file rekap absensi** dari Personalia, untuk menetapkan format impor.
7. **Pembagian bidang/unit antara WaKa I dan II.** Dibutuhkan untuk menentukan penilai K3 KSBK dan rute kalibrasi. Sampai diputuskan, Admin bisa menetapkan WaKa per unit secara manual.
8. **Atasan Staf Khusus selain staf keamanan** belum ditetapkan.
9. **Standar SLA SK-3** (respons permintaan layanan): berapa jam/hari?

### Risiko
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pegawai berhenti mengisi setelah minggu-minggu awal | Data K1 bolong, uji coba gagal | Isi ≤ 3 menit; pengingat 16.00; koordinator melihat yang belum isi; item terbuka tampil di depan |
| Koordinator menunda verifikasi ke akhir bulan | Penumpukan, IKP terlambat | Verifikasi massal; pengingat mingguan; koordinator ditandai bila lewat batas |
| Link bukti (Drive/WA) tidak bisa dibuka verifikator | Item ditolak atau diloloskan tanpa cek | Panduan berbagi link "siapa saja yang punya link"; verifikator bisa menolak dengan alasan "bukti tidak bisa diakses" |
| Web push tidak sampai di iPhone yang tidak memasang PWA | Pengingat tidak efektif | Onboarding pasang PWA; dashboard koordinator tetap jadi kontrol utama |
| Pegawai mencatat item secara selektif (hanya yang tepat waktu) | Capaian terlihat tinggi palsu | Target SBK-2/3 dari kegiatan KSBK, bukan dari pegawai; uji petik arsip; kalibrasi sebaran |
| Rata-rata sederhana rangkap penugasan menghukum beban kerja | Skor turun seiring jumlah penugasan | Laporan perbandingan skor pegawai dengan 1/2/3 penugasan di dashboard pimpinan |
| Struktur kantor masih draf | Penugasan berubah di tengah periode | Penugasan diberi periode berlaku; snapshot saat disahkan |

### Ditunda (setelah uji coba)
- Impor kegiatan SIMAKPRO via Excel, lalu API bila tersedia.
- K1 Kepala Unit Pendukung.
- Mekanisme keberatan di aplikasi.
- Perhitungan tunjangan kinerja.
- Indikator Fase 2 berbasis e-office.
- Upload foto bukti dengan object storage.
