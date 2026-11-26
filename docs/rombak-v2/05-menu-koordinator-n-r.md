# Menu Koordinator Staf N–R — Aplikasi IKP

Ringkasan keputusan untuk Koordinator unit N–R (Staf Tugas Rutin). Dokumen ini **tidak punya dokumen keputusan sendiri** di claude.ai. Isinya dirangkum dari dua sumber:

1. Pernyataan pemilik proyek di percakapan (26 Nov 2026), dikutip di bagian "Keputusan".
2. Teks layar mockup halaman "Koordinator Staf N–R" di canvas, yaitu file `mockup/KR-*.dc.html`.

Jika ada yang bertentangan dengan dokumen 01–04, dokumen 01–04 dan pemilik proyek yang menentukan.

## Keputusan (dari pemilik proyek)

| Hal | Keputusan |
| --- | --- |
| Atur Tugas Staf per pekan | Pengaturan set tugas pekan ini **berlanjut otomatis** ke pekan berikutnya. Koordinator hanya mengubah staf yang dirotasi. |
| Ubah isi set tugas | Perubahan **berlaku mulai besok**. Tugas hari ini tidak berubah. |
| Usulan tugas dari staf | Koordinator boleh **memindahkan usulan ke set tugas lain** dari yang diusulkan staf, lalu menyetujuinya. |

## Layar (dari canvas)

| Layar | File | Isi pokok |
| --- | --- | --- |
| 1 · Tugas › segmen Tim (beranda) | `KR-1-Tim.dc.html` | Segmen Saya / Tim. Angka: Perlu diperiksa · Terlambat · Belum mulai. Kartu usulan staf ("Setujui lalu pilih set tugas tujuannya"). Pintasan: Verifikasi, Set Tugas, Atur Tugas Staf, Delegasi. Daftar staf hari ini beserta set tugas dan progres (mis. 3/6). |
| 2 · Verifikasi (per staf) | `KR-2-Verifikasi.dc.html` | Filter per set tugas (Shift pagi / Shift malam). **Setujui semua yang tepat waktu**; tugas terlambat tidak ikut disetujui massal dan diperiksa satu per satu. Dikelompokkan per staf. |
| 3 · Set Tugas (daftar) | `KR-3-Template.dc.html` | Daftar set tugas unit beserta jumlah tugas dan jumlah staf pemakai. Set tugas hanya berlaku di unitnya. Bisa diduplikasi. |
| 4 · Ubah set tugas | `KR-4-Edit.dc.html` | Nama set; tiap tugas punya jam tenggat, frekuensi ("Setiap hari") dan penanda "link wajib". Tombol Tambah tugas, Duplikat, Simpan. Catatan: "Perubahan berlaku mulai besok untuk N staf yang memakai set tugas ini." |
| 5 · Atur Tugas Staf (per pekan) | `KR-5-Pasang.dc.html` | Pilih pekan. Satu set tugas per staf per pekan. "Pengaturan pekan ini berlanjut otomatis." Aksi "Tukar dua set tugas sekaligus" untuk rotasi shift. Staf yang dirotasi menerima notifikasi. |
| 6 · Usulan tugas dari staf | `KR-6-Usulan.dc.html` | Usulan berisi nama tugas, frekuensi, jam tenggat, dan alasan. Pilihan "Masukkan ke set tugas". Tolak wajib disertai alasan; staf menerima notifikasi untuk keduanya. |
| 7 · Progres koordinator | `KR-7-Progres.dc.html` | K1 koordinator = rata-rata K1 staf di unitnya. Daftar K1 per staf, terendah dulu. Catatan: tugas yang belum diperiksa belum dihitung sebagai realisasi staf, jadi ikut menurunkan skor koordinator. Riwayat IKP, Rapor PDF, Ajukan inovasi (K4) pada jendela awal bulan. |

## Hal yang perlu dikonfirmasi

- [ ] **Kapan usulan staf mulai berlaku.** KR-6 menulis usulan yang disetujui "berlaku mulai pekan depan", sedangkan KR-4 menulis perubahan set tugas berlaku "mulai besok". Menyetujui usulan berarti mengubah set tugas, jadi satu aturan perlu dipilih.
- [ ] **Frekuensi selain harian.** Contoh usulan di KR-6 berfrekuensi "Sepekan sekali", sedangkan semua tugas di KR-4 "Setiap hari". Model data set tugas perlu mendukung frekuensi mingguan, atau usulan seperti itu ditolak.
- [ ] **Tugas lewat tengah malam.** Dokumen 03 menyerahkan ini ke pengaturan Admin per set tugas. Belum ada layarnya di canvas.
