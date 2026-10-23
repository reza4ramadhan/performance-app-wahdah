# IKP Pegawai · Kantor Pusat Wahdah Islamiyah

Aplikasi web *mobile-first* untuk log harian pegawai, verifikasi koordinator, dan IKP bulanan (K1–K4). Spesifikasi lengkap ada di [`plan.md`](plan.md).

**Teknologi:** Next.js 16 (App Router, Server Actions, Cache Components) · PostgreSQL (Neon) + Drizzle ORM · Better Auth · Tailwind CSS 4 + shadcn/ui · Zod · Web Push (PWA) · exceljs.

---

## Menjalankan di laptop

```bash
npm install            # .npmrc memakai legacy-peer-deps (peer opsional better-auth)
cp .env.example .env.local
#   isi BETTER_AUTH_SECRET (openssl rand -base64 32)
#   BETTER_AUTH_URL=http://localhost:3000
#   biarkan DATABASE_URL kosong → memakai PGlite (PostgreSQL tertanam) di ./data/pglite
npm run db:migrate     # buat tabel + sinkron katalog indikator
npm run db:seed        # data contoh fiktif (bulan berjalan + bulan lalu)
npm run dev
```

Akun contoh (password `wahdah123`): `2002` staf · `2001` koordinator · `1003` Sekretariat · `1004` Personalia · `1005` Keuangan · `1006` Admin · `1001` Kepala Kantor · `1002` WaKa · `2007` Staf Khusus. Login juga bisa memakai No. HP (mis. `081200002005`).

> PGlite hanya untuk pengembangan. Jangan menjalankan dua proses (mis. `next dev` dan skrip) pada folder PGlite yang sama. Pakai `IKP_PGLITE_DIR=./data/lain` untuk memisahkan.

### Pengujian

```bash
npm test     # 48 uji: rumus K1–K4, hari kerja, konflik kepentingan, impor absensi,
             # dan uji integrasi Server Action terhadap PGlite sungguhan
npm run lint
```

---

## Deploy ke Cloudways

Aplikasi berjalan sebagai server Node (`next start`) di bawah PM2, dengan reverse proxy Cloudways ke port `PORT`. Basis data ada di Neon, bukan di server Cloudways.

### 1. Siapkan Neon

1. Buat project PostgreSQL di Neon (region Singapura).
2. Salin dua connection string: **pooled** (host berisi `-pooler`) untuk `DATABASE_URL`, dan **unpooled** untuk `DATABASE_URL_UNPOOLED`.

### 2. Variabel lingkungan

Buat `.env.production.local` di folder aplikasi di server (jangan di-commit). Isinya mengikuti [`.env.example`](.env.example):

| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Neon pooled. Tanpa ini aplikasi menolak berjalan di produksi. |
| `DATABASE_URL_UNPOOLED` | Neon unpooled, untuk migrasi. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`. Jangan diubah setelah live, karena semua sesi akan keluar. |
| `BETTER_AUTH_URL` | Alamat publik, mis. `https://ikp.wahdah.or.id`. |
| `CRON_SECRET` | `openssl rand -hex 24`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys`. Kunci publik ditanam saat build, jadi isi **sebelum** `npm run build`. |
| `PORT` | Port yang diteruskan reverse proxy. |

### 3. Build dan jalankan

```bash
git pull
npm ci                 # sertakan devDependencies; dibutuhkan untuk build & migrasi
npm run db:migrate     # aman dijalankan berulang
npm run build          # build tidak menyentuh basis data
pm2 startOrReload ecosystem.config.cjs && pm2 save
```

Node minimal 20.9. Layanan berjalan dengan satu instans. Pembatas login disimpan di basis data, jadi menambah instans tetap aman.

### 4. Akun Admin pertama

```bash
npm run buat-admin -- --nama "Nama Lengkap" --nip 1234 --password "sementara-123"
```

Login pertama wajib mengganti password. Setelah itu data lain diisi lewat menu Admin atau impor (langkah 5).

### 5. Impor awal STRUKTUR KPWI

Ekspor tab *Nama* dan *Detail Bidang* ke tiga CSV mengikuti templat di [`docs/templat-impor/`](docs/templat-impor): `unit.csv`, `pegawai.csv`, `penugasan.csv`.

```bash
npm run impor:struktur -- --folder ./impor            # uji: laporkan baris yang gagal, tidak menulis
npm run impor:struktur -- --folder ./impor --tulis    # simpan + buat akun
```

Password sementara setiap akun ditulis ke `data/kredensial-awal.csv`. Bagikan langsung ke pegawai lalu hapus berkasnya.

### 6. Cron Cloudways

Semua tugas memakai `POST` dengan header rahasia, dan semuanya idempoten. Jadwal di bawah memakai jam server **UTC**:

```cron
# 16.00 WITA: pengingat pegawai Makassar yang belum mengisi (Senin–Jumat)
0 8 * * 1-5   curl -fsS --retry 3 --retry-delay 20 -X POST -H "Authorization: Bearer $CRON_SECRET" "https://DOMAIN/api/cron/pengingat?kantor=makassar"
# 16.00 WIB: pengingat pegawai Jakarta
0 9 * * 1-5   curl -fsS --retry 3 --retry-delay 20 -X POST -H "Authorization: Bearer $CRON_SECRET" "https://DOMAIN/api/cron/pengingat?kantor=jakarta"
# 08.00 WITA: koordinator dengan verifikasi tertunda > 1 hari kerja
0 0 * * 1-5   curl -fsS --retry 3 --retry-delay 20 -X POST -H "Authorization: Bearer $CRON_SECRET" "https://DOMAIN/api/cron/tenggat"
# 00.05 WIB setiap hari: buat periode baru; bulan lalu pindah ke masa verifikasi
5 17 * * *    curl -fsS --retry 3 --retry-delay 20 -X POST -H "Authorization: Bearer $CRON_SECRET" "https://DOMAIN/api/cron/tutup-periode"
```

`--retry` mengantisipasi *cold start* Neon pada paket gratis.

### Bila sebelumnya sudah ada versi lama di Cloudways

Versi sebelumnya menyimpan data contoh di berkas JSON (`data/db.json`). Versi ini memakai PostgreSQL dan tidak membaca berkas itu. Sebelum `git pull` versi ini:

1. Siapkan Neon dan isi `.env.production.local` (langkah 1–2). Tanpa `DATABASE_URL`, halaman akan gagal dengan pesan *DATABASE_URL belum diatur*.
2. Jalankan langkah 3–4, lalu impor data (langkah 5).

---

## Struktur kode

```
app/(masuk)/            masuk, ganti password
app/(app)/              halaman ber-login: Hari Ini, Item, Progres, Akun, Jurnal, Pengembangan diri, Tugas khusus, K4,
                        Tim (koordinator), Verifikasi, Kantor (pimpinan), Absensi (Personalia), Admin
app/(cetak)/rapor/      rapor per pegawai (Lampiran B), siap cetak / simpan PDF
app/aksi/               Server Action (setiap aksi memeriksa sesi dan aturan akses sendiri)
app/api/                auth, cron, ekspor Excel
lib/ikp/                mesin hitung murni: katalog indikator, K1 dari item, IKP bulanan, tenggat
lib/akses.ts            aturan hak akses & konflik kepentingan (diuji otomatis)
lib/waktu.ts            hari kerja, zona WITA/WIB, periode
lib/db/                 skema Drizzle, koneksi Neon/PGlite
lib/data/               query per layar
components/app/         komponen tampilan aplikasi; components/ui/ = shadcn
scripts/                migrate, seed, buat-admin, impor-struktur
drizzle/                berkas migrasi SQL (npm run db:generate setelah mengubah skema)
```

## Keputusan implementasi atas hal yang masih terbuka

Butir-butir ini mengikuti `plan.md` Bagian 13. Nilainya bisa diubah Admin di **Admin → Indikator** tanpa rilis ulang, kecuali yang ditandai *kode*.

| Hal | Yang dipakai sekarang |
| --- | --- |
| Tenggat SPP (13.1) | Diinput paling lambat **H-3 hari kerja** sebelum kegiatan. |
| Keuangan memakai aplikasi (13.2) | Sementara tidak. SBK-2a/2b diverifikasi KSBK dan KSBK-1b nonaktif sampai peran Keuangan diperbaiki. |
| K1 Staf Khusus | Sementara: Tugas Khusus tepat waktu (SK-TK) + poin jurnal; rumus lengkap menyusul. DTR, kejadian, dan layanan SK dihapus. |
| Bobot Kepala Unit Pendukung (13.5) | 50% K2 + 50% K3 (*kode*). |
| Siapa yang ditarget SPP/SPB/pengingat | Penanggung jawab kegiatan (wajib dipilih KSBK; boleh staf SKUO lain di bidang yang sama). Item Pengingat 1/2, SPP, dan SPB dibuat otomatis untuknya. |
| Poin tambahan K1 (tugas khusus, jurnal) | 0,15 per tugas/entri, maks. 5 per jenis; K1 tetap maks. 100 (*kode*: `PARAMETER.tambahan`). |
| K2: izin/sakit sah | Penyebut = hari kerja wajib **sesuai unggahan Personalia** (plan.md Bagian 7, *kode*). Bila izin/sakit sah tidak boleh menurunkan skor, Personalia mengunggah hari kerja wajib yang sudah dikurangi izin/sakit, atau satu baris di `lib/ikp/hitung.ts` diubah. |
| Kewajiban bulanan (KSBK-1c, 1e, KSBK-3) | Dihitung 0 bila belum ada setelah jatuh tempo; sebelum jatuh tempo dikeluarkan dari rata-rata. |
| Inovasi tim (K4) | Setiap pengusul (maks. 3) menerima poin yang sama. |
| Pengembangan diri tanpa log | Skor dikunci maks. 2, dan log kosong otomatis dicatat sebagai contoh perilakunya. |
| Rapor PDF | Halaman HTML siap cetak; tombol *Cetak / simpan PDF* memakai dialog cetak peramban. |
| Konflik kepentingan Sekretariat/Admin | Perhitungan IKP otomatis dan sama untuk semua. Langkah manual yang menyentuh diri sendiri (verifikasi, K3, kalibrasi, penetapan K4, unggah absensi) ditolak sistem dan harus dikerjakan petugas lain. |
