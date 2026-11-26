# Rombak v2 — dokumen acuan

Acuan untuk perombakan UX Aplikasi IKP Kantor Pusat WI, mengikuti SK D.008/QR/I/04/1448. **`plan.md` (PRD v1.0) di root sudah usang. Jangan dipakai sebagai acuan** bila bertentangan dengan dokumen di sini.

Diekspor dari claude.ai pada 26 Nov 2026. Sumber aslinya adalah dokumen hidup yang masih bisa berubah. Bila ada perbedaan, versi di claude.ai yang terbaru.

| File | Isi | Sumber |
| --- | --- | --- |
| `01-ux-flow-baru.md` | Struktur menurut SK, peran dan menu, flow per peran, keputusan "Sekretariat → Admin", pengganti sementara untuk empat akun yang ditunda, peta rute lama → baru | [Doc](https://claude.ai/artifact/XgAbcYGtyoZcxW84tAwoAV) |
| `02-menu-staf-administrasi.md` | Menu Staf Administrasi (unit A–M), termasuk pending SPB dan durasi jurnal | [Doc](https://claude.ai/artifact/7m2oVRpdzGXPa5T9kGxxkJ) |
| `03-menu-staf-tugas-rutin.md` | Menu Staf Tugas Rutin (unit N–R): Set Tugas, Atur Tugas Staf | [Doc](https://claude.ai/artifact/BeomQu1Fjf7qUbC48d7NQK) |
| `04-menu-koordinator-a-m.md` | Menu Koordinator A–M: konfirmasi rencana SIMAKPRO, Manage tim, K1 = rata-rata staf | [Doc](https://claude.ai/artifact/VDxAtmx2aa6YXbbsVxFCqT) |
| `05-menu-koordinator-n-r.md` | Ringkasan keputusan Koordinator N–R. Tidak ada doc aslinya; dirangkum dari percakapan dan canvas | — |
| `mockup/` | 34 layar mobile (`*.dc.html`) dan `canvas.json` | [Canvas](https://claude.ai/artifact/P9sGN7JVLsAJDWu71BBpVM) |

## Catatan ekspor

- `01-ux-flow-baru.md` aslinya memuat **tiga diagram** yang tidak ikut terekspor; di file hanya tersisa penanda `[embedded content: …]`. Ketiganya adalah struktur SK, flow Staf Administrasi, dan flow Staf Tugas tetap. Teks di sekitarnya sudah menjelaskan isinya. Untuk melihat diagramnya, buka doc aslinya.
- Penanda tanggal dan nama penulis di bawah judul tiap doc dikonversi menjadi teks biasa.
- File `mockup/*.dc.html` memakai `./support.js` dari editor canvas. Tanpa editor itu, file ini dibaca sebagai acuan markup dan teks, tidak bisa dibuka langsung di browser seperti aslinya.

## Peta mockup

| Halaman canvas | File |
| --- | --- |
| Beranda 3 peran | `Main`, `Tugas-Tetap`, `Koordinator` |
| Staf Administrasi (11) | `Adm-1-Tugas` … `Adm-11-Pending` |
| Staf Tugas Rutin (6) | `Rtn-1-Tugas` … `Rtn-6-Progres` |
| Koordinator Staf A–M (7) | `Kor-1-Tim` … `Kor-7-Progres` |
| Koordinator Staf N–R (7) | `KR-1-Tim` … `KR-7-Progres` |

## Belum ada

- `rencana-implementasi.md`: daftar gap, migrasi, pemetaan rute, Fase 1–5, dan catatan bahwa tabel absensi butuh tanggal. Rencana ini hanya ada di percakapan claude.ai sebelumnya dan belum disalin ke sini.
