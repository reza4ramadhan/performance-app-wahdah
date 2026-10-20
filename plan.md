# Rencana Pembangunan Aplikasi IKP Kantor Pusat WI

Acuan: *PRD Aplikasi KPI Pegawai Kantor Pusat Wahdah Islamiyah* (19 Okt 2026), yang mengacu pada *Draf 3 Pedoman KPI* (belum disahkan).

Dokumen ini mencatat apa yang sudah dibangun, keputusan sementara yang diambil saat membangunnya, dan urutan pekerjaan berikutnya. Nomor modul (M1.1, M9.1, …) merujuk ke tabel di PRD Bagian 5.

---

## 1. Status saat ini: inti aplikasi (iterasi 1)

Iterasi ini membangun **jalur utama satu periode bulanan**: data masuk → mesin hitung → IKP sementara → pengesahan dan penguncian.

| Bagian | Isi | Modul PRD | Status |
| --- | --- | --- | --- |
| Mesin hitung | K1, K2, K3, K4, IKP, IKP Akhir, predikat, syarat, tunjangan; urutan hitung 6 langkah | M9.1 | ✅ Selesai + 13 uji unit |
| Parameter berversi | Bobot, ambang, plafon, pita predikat disimpan per versi; periode mengunci versinya | M3.1 (sebagian) | ✅ Tampil di `/parameter`, belum bisa diubah dari UI |
| Katalog indikator | SBK, KSBK (dengan sub-tugas a–e), KU, SK; indikator turunan KSBK-2/KU-2; tanda penyebut kecil & verifikasi Keuangan | M2.1 | ✅ Struktur selesai, **isi masih sementara** (lihat 3.1) |
| Input K1 | Pembilang/penyebut per indikator dan sub-tugas, tautan bukti, centang verifikasi Keuangan | M4.1, M4.2, M4.3 | ✅ `/input/k1` |
| Impor absensi K2 | CSV (koma/titik koma), validasi per baris, ditolak seluruhnya bila ada galat | M5.1 | ✅ `/absensi` |
| Input K3 | Rubrik 6 nilai, wajib contoh perilaku untuk skor 1/2/5, blokir menilai diri sendiri, batas skor pengembangan diri 2 tanpa log | M6.1 | ✅ `/input/k3` |
| Dasbor & rincian | Rekap per pegawai, sebaran predikat, total tunjangan; rincian sampai ke indikator | M9.1, M12.1 (sebagian) | ✅ `/`, `/pegawai/[id]` |
| Status periode | 8 status berurutan; pengesahan hanya bila semua pegawai lengkap; hasil dibekukan; data terkunci | M11.1 | ✅ |
| Jejak audit | Setiap perubahan realisasi, K3, absensi, dan status dicatat (nilai lama/baru) | NFR audit | ✅ Tercatat, belum ada halaman tampilan |
| Uji | `npm test` — 13 uji mesin hitung + 4 uji server action | — | ✅ 17/17 lulus |

### Cara menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # uji mesin hitung + server action
```

Data disimpan di `data/db.json` (tidak masuk git). Bila berkas belum ada, aplikasi membuatnya dari data contoh di `lib/data/seed.ts` (10 pegawai fiktif, periode Oktober 2026). Hapus folder `data/` untuk kembali ke data contoh.

### Struktur kode

```
lib/kpi/          Mesin hitung murni (tanpa Next.js) — bisa diuji dan dipakai ulang
  types.ts        Tipe domain (Pegawai, Penugasan, Indikator, SkorK3, Parameter, …)
  parameter.ts    Parameter default Draf 3
  katalog.ts      Katalog indikator K1 awal
  engine.ts       hitungPeriode() + aturan pendukung (validasiSkorK3, hitungK2, …)
  engine.test.ts
lib/data/         Penyimpanan
  schema.ts       Bentuk basis data, urutan status periode
  store.ts        bacaDb/ubahDb, inputPeriode(), hasilPeriode()
  seed.ts         Data contoh
lib/format.ts     Format 89,35 dan Rp1.340.250
app/actions.ts    Server Action: simpan realisasi, K3, impor absensi, majukan status
app/…/page.tsx    Halaman (Next.js 16, Cache Components aktif)
```

Catatan teknis: Next.js 16 dengan `cacheComponents: true`. Semua pembacaan data lewat `getDb()`, yang memanggil `connection()` agar data tidak ikut diprerender saat build, dan setiap komponen pembaca data dibungkus `<Suspense>`. Server Action memanggil `refresh()` setelah menulis.

---

## 2. Keputusan sementara di mesin hitung

Pedoman belum mengatur hal-hal di bawah. Mesin hitung memakai **usulan PRD** atau asumsi yang paling masuk akal. Semuanya ada di `lib/kpi/engine.ts` dan perlu disahkan.

| # | Hal | Perlakuan sekarang | Sumber |
| --- | --- | --- | --- |
| 1 | Indikator dengan penyebut nol | Dikeluarkan dari rata-rata K1 (bukan 0, bukan 100) | Usulan PRD |
| 2 | Pembulatan | Presisi penuh disimpan; 2 desimal hanya di tampilan; tunjangan dibulatkan ke rupiah terdekat dari IKP presisi penuh | Usulan PRD |
| 3 | Kehadiran untuk syarat 85% | Angka yang sama dengan Kehadiran K2: `hadir ÷ (hari wajib − izin/sakit sah)` | Usulan PRD |
| 4 | Ketepatan waktu K2 | `tepat waktu ÷ hadir` | **Asumsi baru** — pedoman tidak menyebut penyebutnya |
| 5 | Sanksi disiplin berat | Menggugurkan tunjangan (dicatat Personalia di impor absensi) | **Asumsi baru** dari peran Personalia di PRD Bagian 3 |
| 6 | K4 | Poin 0–25, bukan persen | Usulan PRD |
| 7 | K1 gabungan | Pakai alokasi tertulis bila **semua** penugasan berbobot; selain itu rata-rata sederhana | PRD langkah 4 |
| 8 | KSBK-2 / KU-2 | Rata-rata K1 staf di unit yang sama, tanpa dirinya; target 100 sehingga skor = rata-rata itu | PRD langkah 2 |
| 9 | K3 pegawai rangkap | Rata-rata K3 dari semua koordinator penugasan; IKP tidak dihitung sampai semua koordinator menilai | PRD langkah 5 |
| 10 | Pimpinan (KK, WKK I/II) | Hanya K2; IKP & tunjangan tidak dihitung | PRD Bagian 4 |
| 11 | Ambang IKP minimum | `null` (tidak ada) sampai diputuskan; mesin sudah mendukung bila diisi | PRD Bagian 4 |
| 12 | Pengesahan | Ditolak bila masih ada pegawai (non-pimpinan) yang IKP-nya belum lengkap | Keputusan iterasi ini |
| 13 | Skor K3 yang tidak sah | Diabaikan dan ditandai; tidak dipakai di hitungan | Keputusan iterasi ini |

---

## 3. Yang belum dikerjakan dan sengaja ditunda

### 3.1 Harus dibereskan sebelum uji coba

- [ ] **Cocokkan katalog indikator dengan teks Draf 3.** Nama, target, dan sumber data di `lib/kpi/katalog.ts` masih isian sementara. Yang sudah sesuai PRD baru kode dan strukturnya.
- [ ] **Uji penerimaan Lampiran C.** Tambahkan 3 sampel Lampiran C (setelah dihitung ulang dengan 6 nilai K3) sebagai uji di `engine.test.ts`. Selisih harus 0. Ini kriteria lolos M9.1.
- [ ] **Login dan hak akses per penugasan** (PRD Bagian 3, NFR privasi). Saat ini **tidak ada login**: semua orang melihat semuanya dan audit tercatat atas nama `pengguna-dev`. Ini penghalang terbesar sebelum aplikasi dipakai orang sungguhan.
- [ ] **Basis data sungguhan.** Ganti `lib/data/store.ts` (berkas JSON) dengan PostgreSQL atau SQLite. Antarmukanya (`getDb`, `ubahDb`, `inputPeriode`) sengaja dibuat sempit supaya halaman tidak perlu diubah. Bergantung pada keputusan hosting (pertanyaan terbuka 9).

### 3.2 Rilis 0 — Persiapan (master data)

- [ ] M1.1 Impor pegawai dari lembar *Nama* STRUKTUR KPWI
- [ ] M1.2 Kelola unit dan peran dari UI
- [ ] M1.3 Kelola penugasan per periode (tanggal mulai/selesai sudah ada di skema, belum ada UI)
- [ ] M1.4 Peta penilai → penugasan dari UI, dengan blokir penilai = yang dinilai (blokir sudah ada di mesin)
- [ ] M2.2 DTR Staf Khusus: pegawai mengajukan 3–5 tugas, atasan menyetujui, lalu tugas itu menjadi sub-tugas SK-1 untuk orang tersebut (saat ini SK-1 memakai 3 sub-tugas generik)
- [ ] M2.3 Target per penugasan (saat ini target melekat pada indikator, sama untuk semua)
- [ ] M3.1 Buka periode baru dari UI: salin penugasan dan kunci versi parameter
- [ ] Ubah parameter dari UI dengan membuat versi baru, bukan menimpa versi lama

### 3.3 Rilis 1 — MVP uji coba (sisa)

- [ ] M6.2 Unggah log pengembangan diri oleh pegawai (skema sudah ada; data contoh diisi dari seed)
- [ ] M6.3 Dasbor kalibrasi Wakil Kepala Kantor: sebaran skor per penilai, kembalikan skor 5
- [ ] M8.1 Catatan Tugas (CT)
- [ ] M9.2 Umumkan IKP sementara: pegawai hanya melihat miliknya (butuh login)
- [ ] M10.1 Keberatan: ajukan dalam 5 HK → putusan Kepala Kantor → hitung ulang
- [ ] Unggah berkas bukti (saat ini hanya tautan/teks)
- [ ] Halaman jejak audit; koreksi tercatat setelah disahkan (oleh Kepala Kantor, dengan alasan)
- [ ] Tenggat dalam hari kerja, pengingat, dan dasbor keterlambatan per koordinator
- [ ] M13.1 Laporan uji coba: ketersediaan data per indikator, sebaran predikat, skor vs jumlah penugasan
- [ ] M13.2 Ekspor Excel/PDF (formulir Lampiran B, rekap bulanan)
- [ ] Sembunyikan nominal rupiah selama uji coba (PRD Rilis 1: "tanpa nominal rupiah"); saat ini nominal tampil di dasbor

### 3.4 Rilis 2 — Kalibrasi dan berlaku penuh

- [ ] M7.1–M7.2 K4 Inovasi Plus: pengajuan, penetapan tingkat, riwayat tingkat (naik tingkat hanya menambah selisih), maksimal 3 pengusul, peringatan bila lebih dari 20% pegawai menerima K4. Saat ini mesin hanya menerima poin K4 yang sudah disahkan.
- [ ] M12.1 Daftar tunjangan resmi, hanya untuk KK, Sekretariat, dan Keuangan
- [ ] M12.2 Proyeksi kebutuhan dana
- [ ] M5.2 Sinkron otomatis absensi

### 3.5 Rilis 3 — Fase 2

- [ ] M14.1 Indikator e-office (indikator `fase: 2` sudah ada di katalog dan diabaikan mesin)

---

## 4. Pertanyaan terbuka yang memengaruhi kode

Dari PRD Bagian 7, ditambah dua asumsi baru dari iterasi ini (tanda ★).

| # | Pertanyaan | Bagian kode yang terdampak |
| --- | --- | --- |
| 1 | Rumus IKP & tunjangan pimpinan | `engine.ts`: cabang `hanyaK2` |
| 2 | Pembagian Bidang Kerja antara WKK I dan II | Data `penilaiId` per penugasan |
| 3 | Ambang IKP minimum | `parameter.ambangIkpMinimum` |
| 4 | Penyebut nol | `hitungSatuIndikator`: `dikecualikan` |
| 5 | Pembulatan resmi | `engine.ts` + `format.ts` |
| 6 | Hitung ulang Lampiran C dengan 6 nilai | Uji penerimaan |
| 7 | Format ekspor sistem absensi | `imporAbsensi`: kolom CSV |
| 8 | Sumber dana & jadwal tunjangan | Jadwal Rilis 2 |
| 9 | Bangun sendiri / pihak ketiga, dan hosting | Pilihan basis data & login |
| ★10 | Penyebut ketepatan waktu K2: hadir atau hari wajib? | `hitungK2` |
| ★11 | Apakah sanksi disiplin berat menggugurkan tunjangan? | Syarat di `hitungPeriode` |

---

## 5. Urutan kerja yang disarankan untuk iterasi berikutnya

1. Login + hak akses per penugasan, dan pindah ke basis data sungguhan, bersamaan karena keduanya bergantung pada keputusan hosting.
2. Master data dari UI + impor lembar *Nama* (Rilis 0), supaya penugasan bulan pertama bisa diterbitkan dari aplikasi.
3. Cocokkan katalog dengan Draf 3 dan tambahkan uji Lampiran C.
4. Keberatan, pengumuman, dan halaman audit (sisa MVP).
