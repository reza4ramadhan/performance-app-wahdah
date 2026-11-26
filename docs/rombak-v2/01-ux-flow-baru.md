# UX Flow Baru Aplikasi IKP Kantor Pusat WI

Nov 26, 2026 · @Reza Ramadhan

## Ringkasan

Aplikasi baru disusun dari pekerjaan, bukan dari daftar indikator. Pegawai membuka aplikasi dan langsung melihat **apa yang harus dikerjakan hari ini**. Sistem yang memetakannya ke indikator K1 di belakang layar. Struktur mengikuti SK Nomor D.008/QR/I/04/1448 (8 Oktober 2026).

**Yang tidak berubah: rumus K1.**

- **Staf Administrasi:** indikator pokok SBK-1 s.d. SBK-5. Poin tambahan: +0,15 per tugas delegasi yang selesai tepat waktu (maks. 5) dan +0,15 per entri jurnal (maks. 5).
- **Staf Khusus:** SK-TK (tugas yang selesai tepat waktu dan disetujui ÷ tugas jatuh tempo). Poin tambahan dari jurnal.
- K2, K3, K4, dan rumus IKP tetap.

**Yang berubah: cara data masuk dan cara layar disusun.**

1. **Kerja datang ke pegawai.** Item SBK-2a/2b/3/4/5 dibuat otomatis begitu koordinator menjadwalkan kegiatan SKUO. Staf tidak memilih indikator. Ia cukup menandai selesai dan menempel link.
2. **Satu daftar "Tugas saya".** Item, tugas rutin, dan tugas delegasi tampil dalam satu daftar yang diurutkan berdasarkan tenggat. Isinya digabung dari semua unit tempat pegawai bertugas, jadi tidak ada lagi Pindah Amanah.
3. **Koordinator bekerja di dua tempat:** Jadwal kegiatan dan Delegasi. Verifikasi melekat di layar Tim, tidak berdiri sendiri.
4. **Penilaian bulanan disembunyikan dari harian.** K3, K4, kalibrasi, dan uji petik hanya muncul pada jendela akhir bulan, untuk orang yang berwenang.
5. **Paling banyak 4 tab per peran** di ponsel.

## Struktur menurut SK

SK menetapkan 1 Kepala Kantor, 2 Wakil Kepala Kantor, 1 Sekretaris dengan 2 Wakil Sekretaris, 1 petugas Keuangan, 1 petugas Personalia, dan 18 unit staf (A–R). Setiap unit punya satu Koordinator. Tiga unit juga punya Wakil Koordinator.

&#91;embedded content: Struktur SK D.008/QR/I/04/1448 · pimpinan, fungsi, 18 unit\]

Pola kerja unit A–M berbeda dari N–R, jadi aplikasi membedakan dua jenis staf. Unit N–R masuk jenis Tugas tetap. Ini **asumsi** (lihat Bagian Asumsi), karena SK hanya menyebut "Staf Khusus" untuk unit R.

| Kode | Unit | Koordinator | Wakil Koordinator | Anggota | Jenis staf |
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
| N | Pelayanan Umum | Syarifuddin Usman | – | 6 | Tugas tetap |
| O | Pelayanan Media | Rustam Hafid | – | 2 | Tugas tetap |
| P | Pelayanan Keamanan | H. Hasta Ahmad | – | 15 | Tugas tetap |
| Q | Sekolah Dai | M. Dzul Fadli S | – | 5 | Tugas tetap (perlu konfirmasi) |
| R | Staf Khusus | M. Amin Daus | – | 6 | Tugas tetap |

Anggota dihitung termasuk koordinator dan wakil. Perubahan penting dibanding draf sebelumnya: kini ada unit Sekolah Dai (Q). Staf Khusus menyusut dari 22 menjadi 6 orang dan kini punya koordinator. Ada juga lapisan Sekretaris dan Wakil Sekretaris. Lapisan SKUO tidak disebut di SK, jadi SKUO tetap dikelola sebagai data master terpisah.

## Peran dan menu

Setiap pegawai cukup punya **satu set tab**, ditentukan oleh peran tertingginya. Peran lain yang ia pegang muncul sebagai isi tab, bukan sebagai tab atau mode baru. Aturan pemersatunya: **apa pun yang menuntut tindakan dari seseorang muncul di "Tugas saya"-nya.** Ini berlaku juga untuk antrean Keuangan, unggahan Personalia, dan batas input kegiatan.

| Peran di aplikasi | Siapa (menurut SK) | Tab di ponsel | Isi utama |
| --- | --- | --- | --- |
| Staf Administrasi | Anggota unit A–M | Tugas · Jurnal · Progres · Akun | Tugas: item dari kegiatan + tugas delegasi + tombol Catat. Jurnal: jurnal + belajar |
| Staf Tugas tetap | Anggota unit N–R | Tugas · Jurnal · Progres · Akun | Tugas: rutin hari ini + delegasi |
| Koordinator / Wakil Koordinator | 18 koordinator + 4 wakil | Tim · Jadwal · Delegasi · Saya | Tim: siapa terlambat, yang perlu dicek. Jadwal: kegiatan SKUO (unit A–M) atau tugas rutin (N–R). Saya: tugas pribadi + progres |
| Pimpinan | Kepala Kantor, WaKa I, WaKa II — ditunda | Kantor · Penilaian · Saya | Kantor: tingkat pengisian & K1 berjalan per unit. Penilaian: kalibrasi K3, penetapan K4, pengesahan |
| Keuangan | Abd. Rahman Sampara (Bendahara) — ditunda | (tab perannya) + antrean di Tugas | SPP/SPB menunggu tanda "sesuai SOP / dikembalikan" |
| Personalia | Muh. Yasser Arafat — ditunda | (tab perannya) + tugas bulanan | "Unggah rekap absensi" muncul sebagai tugas bertenggat tgl 5 |
| Admin | Sekretaris + 2 Wakil Sekretaris (pengganti peran Sekretariat) | Hanya desktop | Data master, penugasan, indikator, libur, periode, ditambah tugas Sekretariat: verifikasi laporan bidang, hitung & kunci IKP sementara, ekspor |

**Keputusan 26 Nov 2026:** akun Personalia, Bendahara (Keuangan), Wakil Kepala Kantor, dan Kepala Kantor **ditunda** pembaruannya. Peran **Sekretariat dilebur ke Admin**, dipegang Sekretaris dan 2 Wakil Sekretaris. Selama ditunda, fungsi keempat akun itu perlu pengganti sementara.

**Pengganti sementara selama keempat akun ditunda** (disetujui 26 Nov 2026):

| Fungsi | Pemilik semula | Pengganti sementara |
| --- | --- | --- |
| Tanda SPP/SPB "sesuai SOP" | Bendahara | Tidak dinilai; SBK-2a/2b hanya mengukur ketepatan waktu |
| Konfirmasi dana cair untuk SPB pending | Bendahara | Koordinator unit |
| Unggah rekap absensi (K2) | Personalia | Admin |
| Kalibrasi K3 | WaKa I & II | Ditiadakan selama uji coba |
| Penetapan tingkat K4 | WaKa I & II | Admin |
| Pengesahan IKP bulanan | Kepala Kantor | IKP yang dikunci Admin langsung final |

Karena Admin dipegang Sekretaris dan 2 Wakil Sekretaris yang juga koordinator/staf, aturan saling periksa berlaku: tidak ada yang mengunci IKP, menetapkan K4, atau mengunggah absensi untuk datanya sendiri; sistem mengalihkannya ke salah satu dari dua yang lain.

**Tombol Catat** untuk Staf Administrasi hanya punya tiga pilihan dengan bahasa sehari-hari: *Surat masuk* (SBK-1), *Permintaan layanan* (SBK-4), dan *Dokumen arsip* (SBK-5). Ketiganya untuk pekerjaan yang muncul di luar jadwal kegiatan. Kode indikator tidak pernah tampil di layar staf.

**Penilaian bulanan** (K3 staf, periksa K4, uji petik arsip) tidak punya tab. Isinya muncul sebagai kartu di tab Tim mulai hari kerja terakhir bulan berjalan sampai batas verifikasi. Di luar jendela itu, kartunya tidak tampil. Catatan perilaku tetap bisa ditulis kapan saja, langsung dari profil staf di tab Tim.

## Flow Staf Administrasi (unit A–M)

Staf tidak lagi membuka form indikator. Sebagian besar itemnya sudah ada di daftar sebelum ia bekerja, karena dibuat dari kegiatan yang dijadwalkan koordinator.

&#91;embedded content: Flow Staf Administrasi · 3 sumber tugas, 1 daftar, 1 pemeriksaan\]

Beban isi per item turun menjadi satu ketukan dan satu link. Dari ketiga sumber tugas, hanya Catat cepat yang diisi staf sendiri.

**Pemetaan checklist kegiatan ke indikator** (tenggat mengikuti pedoman; yang belum punya angka ditandai):

| Baris checklist | Indikator | Tenggat yang dipakai sistem |
| --- | --- | --- |
| Pengingat ke-1 dan ke-2 | SBK-3 | Sebelum tanggal kegiatan |
| Input SPP (bila dicentang) | SBK-2a | Belum ada angka di pedoman (Hal terbuka 13.1 PRD) |
| Permintaan layanan (bila ada) | SBK-4 | Siap sebelum kegiatan dimulai |
| Input SPB (bila dicentang) | SBK-2b | ≤ 7 hari setelah kegiatan |
| Arsip dokumen kegiatan | SBK-5 | ≤ 3 hari kerja setelah kegiatan |

**Layar Tugas saya** dikelompokkan menjadi *Terlambat · Hari ini · Pekan ini · Nanti*. Tiap baris memuat nama kegiatan, apa yang harus dilakukan ("Kirim pengingat ke-2"), dan sisa waktu. Item ditolak muncul paling atas beserta alasannya. Jurnal dan belajar ada di tab Jurnal, bukan di layar ini.

**Staf PJ per kegiatan** adalah satu-satunya isian baru bagi koordinator. Tanpa isian ini, sistem tidak tahu ke daftar siapa checklist harus dikirim. Nilai default-nya staf yang terakhir memegang SKUO tersebut.

## Flow Staf Tugas tetap (unit N–R)

Staf pelayanan umum, media, keamanan, Sekolah Dai, dan staf khusus bekerja dengan tugas yang sama setiap hari. Karena itu, daftar mereka disusun **sekali** oleh koordinator, lalu muncul sendiri setiap pagi.

&#91;embedded content: Flow Staf Tugas tetap · rutin + delegasi, 1 pemeriksaan\]

Perhitungan K1 tidak berubah: SK-TK = tugas yang selesai sebelum jam tenggat dan disetujui ÷ tugas yang jatuh tempo. Yang berubah hanya cara tugas masuk.

- **Staf keamanan (15 orang):** tugas rutin dibuat per shift (mis. "Patroli malam 22.00", "Serah terima shift"). Jam tenggat mengikuti shift, bukan jam kantor.
- **Persetujuan massal:** koordinator unit P cukup satu ketukan "Setujui semua yang tepat waktu" di tab Tim. Tanpa ini, 15 staf × beberapa tugas × 22 hari kerja menjadi beban harian.
- **Usulan tugas dari staf** (fitur yang sudah ada) dipindah ke tombol kecil di tab Tugas: "Usulkan tugas rutin". Fitur ini tidak lagi menjadi menu sendiri.

## Flow Koordinator dan Wakil Koordinator

Koordinator bekerja di dua tempat yang diminta catatan revisi, yaitu **Jadwal** dan **Delegasi**, ditambah **Tim** untuk memantau. K1 koordinator (KSBK-1a s.d. 1e, KSBK-2, KSBK-3) tetap dihitung dari jejak waktu kerjanya, tanpa isian tambahan.

| Ritme | Tab | Yang dilakukan | Dampak ke K1 |
| --- | --- | --- | --- |
| Bulanan, ≤ tgl 5 | Jadwal | Input kegiatan SKUO bulan ini (unit A–M) atau perbarui tugas rutin (unit N–R) | KSBK-1c; pengingat muncul di tab Saya sejak tgl 25 |
| Kapan saja | Delegasi | Beri tugas sekali ke staf unitnya | Poin tambahan SBK-TK / masuk SK-TK staf |
| Harian | Tim | Periksa yang menunggu, tagih yang terlambat | KSBK-1a (periksa surat ≤ 1 hari kerja) |
| Akhir bulan | Tim (kartu Penilaian) | K3 staf, periksa K4, uji petik arsip | KSBK-1e, K3 staf |

**Tab Jadwal (unit A–M)**

1. Ketuk **+ Kegiatan**, lalu isi nama, SKUO, tanggal, **staf PJ**, dan centang *perlu SPP / perlu SPB / perlu layanan*.
2. Sistem menampilkan pratinjau checklist yang akan dikirim ke staf PJ, lengkap dengan tenggat tiap baris. Koordinator cukup menekan Simpan.
3. Tombol **Salin dari bulan lalu** untuk kegiatan berulang. Impor Excel SIMAKPRO tetap ditunda.
4. Tanggal kegiatan yang diubah ikut menggeser tenggat checklist secara otomatis.

**Tab Jadwal (unit N–R)** berisi daftar tugas rutin per staf. Satu tugas rutin bisa disalin ke banyak staf sekaligus. Ini penting untuk 15 staf keamanan.

**Tab Delegasi**

1. Pilih satu atau beberapa staf dari unitnya sendiri.
2. Isi judul, tenggat (tanggal + jam), dan pilih apakah link bukti wajib.
3. Kirim. Tugas langsung masuk ke Tugas saya milik staf. Di tab Delegasi, koordinator melihat status tiap tugas yang ia berikan.

**Tab Tim** dibuka dengan tiga angka: *Perlu diperiksa · Terlambat · Belum ada aktivitas hari ini*. Ketuk angka untuk membuka daftarnya. Daftar "Perlu diperiksa" mendukung **Setujui semua** dan tolak per item (alasan wajib). Ketuk nama staf untuk membuka profilnya: tugas berjalan, progres K1, dan tombol tulis catatan perilaku.

**Wakil Koordinator** (unit B, F, K) mendapat hak yang sama untuk Jadwal, Delegasi, dan memeriksa, tetapi K3 staf tetap diisi Koordinator. Ini asumsi dan perlu dikonfirmasi.

## Flow pimpinan, Sekretariat, Keuangan, Personalia

Pimpinan memantau setiap hari dan baru bertindak di akhir bulan. Peran "Sekretariat" di PRD lama kini dipegang Sekretaris dan 2 Wakil Sekretaris sesuai SK.

**Siklus bulanan** (urutan PRD tetap, pelakunya disesuaikan SK):

| Kapan | Kegiatan | Pelaku | Muncul di |
| --- | --- | --- | --- |
| ≤ tgl 5 | Input kegiatan / perbarui tugas rutin | 18 Koordinator | Tugas di tab Saya |
| Sepanjang bulan | Tandai selesai, periksa, delegasi | Staf, Koordinator, Keuangan | Tugas saya, Tim |
| ≤ tgl 5 bulan berikutnya | Unggah rekap absensi | Personalia | Tugas bertenggat |
| ≤ 5 hari kerja setelah bulan berakhir | Selesaikan pemeriksaan, isi K3, periksa K4, staf ajukan K4 | Koordinator, staf | Kartu Penilaian di Tim |
| Setelah batas pemeriksaan | Kalibrasi K3, tetapkan tingkat K4 | WaKa I & II | Tab Penilaian |
| Setelah kalibrasi | Hitung & kunci IKP sementara, verifikasi laporan bidang | Sekretaris / Wakil Sekretaris | Tab Rekap |
| ≤ tgl 10 | Sahkan IKP, ekspor | Kepala Kantor, Sekretariat | Tab Penilaian, Rekap |

**Tab Kantor (pimpinan dan Sekretariat)** memuat satu tabel 18 baris (unit A–R) dengan kolom: tingkat pengisian hari ini, K1 berjalan, jumlah menunggu diperiksa, dan jumlah terlambat. Unit yang koordinatornya menunda pemeriksaan diberi tanda. Tidak ada grafik berat di ponsel.

**Keuangan** tidak punya layar khusus. SPP/SPB yang ditandai selesai oleh staf masuk ke daftar Tugas-nya dengan dua tombol: *Sesuai SOP* dan *Dikembalikan + alasan*.

**Benturan kepentingan yang muncul dari SK** (sistem wajib mengalihkan pemeriksa):

- Sekretaris (Erwin Ardiansyah) juga Koordinator A. Wakil Sekretaris Muh. Rasul Ramli juga Koordinator E. Wakil Sekretaris Andi Muh. Reza R. Azikin juga staf A dan Koordinator H. Ketiganya tidak boleh mengunci IKP dirinya sendiri, jadi sistem mengalihkannya ke salah satu dari dua yang lain.
- Petugas Keuangan (Abd. Rahman Sampara) juga staf L Perbendaharaan. SPP/SPB yang ia input sendiri perlu pemeriksa lain.
- Personalia (Muh. Yasser Arafat) juga Wakil Koordinator K. Unggahan absensi memuat datanya sendiri. Perlu diputuskan siapa yang memeriksa baris miliknya.

## Rangkap jabatan tanpa Pindah Amanah

Menurut SK, 13 pegawai memegang lebih dari satu peran. Bagi mereka, Pindah Amanah memecah pekerjaan ke beberapa layar. Fitur itu dihapus, dan semua penugasan seseorang tampil dalam satu daftar.

| Pegawai | Peran menurut SK |
| --- | --- |
| Supriadi Sudirja | Staf A, J, K |
| Muh. Yusuf Rachman Rivai | Staf D, H, K |
| Ahsan Muzakkir | Staf A, G |
| Mussaddiq M | Staf B, G |
| Muharramsyah | Wakil Koordinator B, staf E |
| Marzuki | Staf C, F |
| Suhaedi | Staf G, L |
| Muh. Ridho Rachman | Staf J, M |
| Erwin Ardiansyah | Sekretaris, Koordinator A |
| Muh. Rasul Ramli | Wakil Sekretaris, Koordinator E |
| Andi Muh. Reza R. Azikin | Wakil Sekretaris, staf A, Koordinator H |
| Muh. Yasser Arafat | Personalia, Wakil Koordinator K |
| Abd. Rahman Sampara | Keuangan, staf L |

**Aturan tampilan**

- Set tab mengikuti peran tertinggi (lihat Peran dan menu). Tugas pribadi dari peran yang lebih rendah masuk ke tab Saya atau Tugas.
- Setiap baris tugas memuat label unit kecil (A, J, K). Chip filter per unit muncul hanya untuk pegawai yang rangkap.
- Tab Progres menampilkan K1 per penugasan dan K1 gabungan. Rumus penggabungan tidak berubah.
- **Beban lintas unit terlihat oleh pemberi tugas.** Saat Koordinator K mendelegasikan ke Supriadi, layar Delegasi menampilkan jumlah tugas Supriadi yang jatuh tempo pekan itu dari semua unit. Ini mencegah tiga koordinator menumpuk tugas di hari yang sama tanpa saling tahu.

Delapan staf yang rangkap 2–3 unit adalah kelompok yang paling terdampak risiko "rata-rata sederhana menghukum rangkap" di PRD. Pantau skor mereka selama uji coba sebelum memutuskan bobot alokasi.

## Peta layar lama → baru

Aplikasi sekarang punya 35 halaman. Hampir semuanya **digabung, bukan dibuang**, sehingga mesin hitung, data, dan aturan aksesnya tetap dipakai. Yang benar-benar hilang hanya Pindah Amanah dan tiga varian beranda per peran.

| Rute sekarang | Menjadi | Keterangan |
| --- | --- | --- |
| `/` (Hari Ini, tiga varian: umum, KSBK, SK) | Tab Tugas (staf) / Tim (koordinator) / Kantor (pimpinan) | Satu beranda per set tab |
| `/item`, `/item/[id]` | Tab Tugas + lembar detail | Item dan tugas khusus dalam satu daftar |
| `/tugas`, `/tugas/usulan` | Tab Tugas + tombol "Usulkan tugas rutin" | – |
| `/jurnal`, `/jurnal/sekaligus`, `/pengembangan-diri` | Tab Jurnal (dua bagian: Jurnal, Belajar) | – |
| `/progres`, `/k4` | Tab Progres; ajukan K4 hanya di jendela akhir bulan | – |
| `/verifikasi` | Tab Tim → Perlu diperiksa | Keuangan: masuk daftar Tugas |
| `/tim/kegiatan` | Tab Jadwal | + kolom Staf PJ dan pratinjau checklist |
| `/tim/tugas` | Tab Delegasi; tugas rutin pindah ke tab Jadwal (unit N–R) | – |
| `/tim`, `/tim/staf/[id]`, `/tim/catatan`, `/tim/jurnal` | Tab Tim + profil staf | Catatan perilaku & jurnal staf dibuka dari profil |
| `/tim/k3`, `/tim/k3/[id]`, `/tim/k4`, `/tim/uji-petik` | Kartu Penilaian di Tim (akhir bulan) | – |
| `/kantor`, `/kantor/kalibrasi`, `/kantor/k4` | Tab Kantor, tab Penilaian | – |
| `/kantor/rekap`, ekspor | Tab Rekap | – |
| `/absensi` | Tugas bulanan Personalia | Layar unggah tetap |
| `/admin/*` | Admin (desktop) | + impor struktur dari SK, jenis staf per unit, Wakil Koordinator |
| Pindah Amanah (cookie) | Dihapus | Diganti daftar gabungan + label unit |

**Perubahan data yang dibutuhkan** (di luar layar):

- `peran_kerja`: tambah Wakil Koordinator, Sekretaris, dan Wakil Sekretaris.
- `unit`: tambah atribut jenis staf (Administrasi / Tugas tetap). Ganti 13 kelompok lama dengan 18 unit SK.
- `kegiatan`: tambah `staf_pj_id` dan centang perlu layanan.
- Template checklist per kegiatan: aturan pembentuk item SBK-2a/2b/3/4/5 beserta tenggat relatifnya.

## Asumsi dan keputusan terbuka

Delapan hal ini perlu dijawab sebelum membangun. Butir 1 dan 4 paling menentukan bentuk layar.

- [ ] **Jenis staf unit N–Q.** Dokumen ini mengasumsikan Pelayanan Umum, Media, Keamanan, dan Sekolah Dai memakai pola Tugas tetap (K1 = SK-TK). Sekolah Dai paling meragukan karena juga menjalankan kegiatan.
- [ ] **Hak Wakil Koordinator** (B, F, K): diasumsikan sama dengan Koordinator untuk Jadwal, Delegasi, dan pemeriksaan, tetapi tidak mengisi K3.
- [ ] **Pembagian 18 unit antara WaKa I dan WaKa II.** Ini menentukan rute kalibrasi K3 dan siapa yang menilai K3 koordinator.
- [ ] **Staf PJ per kegiatan:** satu orang untuk semua baris checklist, atau bisa berbeda per baris (mis. SPP oleh staf lain)? Usulan: satu PJ sebagai default, bisa diubah per baris.
- [ ] **Tenggat SPP (SBK-2a)** masih tanpa angka di pedoman. Checklist butuh angka H-x.
- [ ] **Pemeriksa untuk benturan kepentingan:** baris absensi milik Personalia, SPP/SPB yang diinput petugas Keuangan, dan IKP Sekretaris/Wakil Sekretaris.
- [ ] **Siapa Admin** aplikasi setelah struktur baru berlaku.
- [ ] **Daftar SKUO resmi** sebagai data master, karena SK tidak memuatnya.

**Risiko yang perlu dikomunikasikan sebelum rilis.** Karena item kini dibuat otomatis dari kegiatan, target K1 staf administrasi kemungkinan **naik**. Item yang dulu tidak dicatat kini ikut terhitung. Skor bulan pertama bisa turun dibanding sebelumnya, walaupun kinerjanya sama. Itu tanda pengukurannya lebih jujur, bukan penurunan kinerja. Sampaikan ini ke pegawai dan pimpinan sejak awal, dan jangan bandingkan skor lintas versi selama uji coba.

**Langkah berikutnya yang disarankan:** jawab butir 1–4, lalu buat mockup tiga layar inti di ponsel (Tugas saya, Jadwal + pratinjau checklist, Tim). Uji dengan satu staf administrasi, satu staf keamanan, dan satu koordinator sebelum menyentuh kode.
