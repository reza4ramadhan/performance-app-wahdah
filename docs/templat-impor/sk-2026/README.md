# Templat impor 18 unit SK D.008/QR/I/04/1448

Dipakai dengan `npm run impor:struktur -- --folder docs/templat-impor/sk-2026` (uji coba dulu, lalu `--tulis`).

- `unit.csv` sudah berisi 18 unit A–R menurut SK (A–M `administrasi`, N–R `rutin`). Isi `waka_nip` bila sudah ditetapkan.
- `pegawai.csv` **belum ada**: SK tidak memuat NIP/No. HP. Buat dari data kepegawaian (kolom sama dengan `../pegawai.csv`).
  Sekretaris dan 2 Wakil Sekretaris diberi `peran_sistem` = `admin`.
- `penugasan.csv` baru berisi contoh baris. Isi satu baris per penugasan menurut SK:
  - Koordinator (dan wakil) unit: `peran_kerja` = `KSBK`; wakil diberi `wakil` = `1` (unit B, F, K).
  - Staf unit A–M: `SBK`; staf unit N–R: `SK`. `koordinator_nip` = koordinator unit (bukan wakil); kosong = diisi otomatis.
  - Pegawai rangkap (13 orang, lihat `docs/rombak-v2/01-struktur-dan-peran.md`) mendapat satu baris per unit.

Importer hanya untuk basis data kosong (membuat pegawai & akun baru). Untuk basis data yang sudah berjalan, ubah lewat Admin › Unit dan Admin › Penugasan.
