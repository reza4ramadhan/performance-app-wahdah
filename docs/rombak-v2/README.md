# Rombak UX v2 — Aplikasi IKP Kantor Pusat WI

Dokumen keputusan hasil sesi perancangan 26 November 2026. Folder ini adalah **acuan utama** untuk perombakan aplikasi. `plan.md` di root (PRD v1.0) sudah **tidak berlaku** untuk bagian yang bertentangan dengan folder ini.

## Urutan baca

1. `rencana-implementasi.md` — gap antara repo sekarang dan desain baru, migrasi, peta rute, dan urutan fase. **Mulai dari sini.**
2. `01-struktur-dan-peran.md` — struktur SK, peran di aplikasi, peran yang ditunda, pengganti sementara, rangkap jabatan.
3. `02-menu-staf-administrasi.md` — unit A–M.
4. `03-menu-staf-tugas-rutin.md` — unit N–R.
5. `04-menu-koordinator-a-m.md`
6. `05-menu-koordinator-n-r.md`

## Aturan bila ada pertentangan

Keputusan yang lebih baru menang. Urutannya (paling kuat di atas):

1. Bagian **Keputusan** di dokumen 02–05.
2. `01-struktur-dan-peran.md`.
3. `rencana-implementasi.md` (bila ada beda dengan 01–05, ikuti 01–05 dan catat perbedaannya).
4. `plan.md` lama.

## Prinsip

**Keep It Simple.** Setiap fitur harus mengurangi pekerjaan pengguna, bukan menambah. Bila ragu, pilih yang lebih sedikit layar, isian, dan konsep.

## Sumber visual

Mockup 34 layar (5 halaman: Beranda 3 peran, Staf Administrasi, Staf Tugas Rutin, Koordinator A–M, Koordinator N–R) ada di kanvas claude.ai milik pemilik repo: https://claude.ai/artifact/P9sGN7JVLsAJDWu71BBpVM (privat; buka lewat akun pemilik). Tampilan mengikuti aplikasi sekarang: teal `#0c7883`, judul `#1f1b5c`, font Plus Jakarta Sans, mobile 390 px.

Dokumen asal (claude.ai, privat):
- UX Flow Baru: https://claude.ai/artifact/XgAbcYGtyoZcxW84tAwoAV
- Menu Staf Administrasi: https://claude.ai/artifact/7m2oVRpdzGXPa5T9kGxxkJ
- Menu Staf Tugas Rutin: https://claude.ai/artifact/BeomQu1Fjf7qUbC48d7NQK
- Menu Koordinator Staf A–M: https://claude.ai/artifact/VDxAtmx2aa6YXbbsVxFCqT
