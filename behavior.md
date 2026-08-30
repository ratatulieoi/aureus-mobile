# Alur perilaku Aureus

Dokumen ini mencatat alur perilaku yang sudah disepakati untuk aplikasi mobile Aureus.

## Identitas visual

Aureus memakai mark tiga bagian dan palette utama yang tetap:

- lime `#D7DF70`;
- ink `#0D110E`;
- paper `#F7F5EF`.

Favicon web, ikon launcher Android, adaptive icon, splash screen, mark pada header, dan tombol Home memakai identitas yang sama. Warna merah hanya dipakai untuk tindakan berbahaya seperti menghapus data. Branding Lovable, ikon Android bawaan, dan placeholder template tidak digunakan.

## Navigasi utama

Header menampilkan mark dan nama Aureus di kiri serta tombol tiga titik di kanan. Tombol tiga titik membuka popup berisi:

- Ganti tema;
- Backup & pulihkan;
- Others.

Navigasi utama berada pada dock tetap di bagian bawah. Dock memakai blur latar `4px`, permukaan transparan, dan rim terang. Dock tidak memakai filter SVG, pembiasan, glow, atau sapuan warna lime. Kapsul blur di dalam dock menandai halaman aktif. Dock menghormati safe area perangkat.

Susunan dock adalah:

- Home;
- Transaction;
- Subs;
- Others;
- tombol tambah terpisah di kanan.

Tombol tambah masih nonaktif. Setiap tujuan menampilkan ikon dan label. Tujuan aktif memiliki kapsul blur di dalam dock dan tetap diumumkan kepada pembaca layar.

Pengguna dapat berpindah halaman dengan menekan tombol dock atau menggeser isi halaman secara horizontal:

- geser ke kiri membuka halaman berikutnya;
- geser ke kanan membuka halaman sebelumnya;
- urutan geser mengikuti posisi dock, yaitu Home, Transaction, Subs, lalu Others;
- gestur berhenti pada Home dan Others;
- gerakan vertikal tetap menggulir isi halaman;
- gestur horizontal dapat dimulai dari bagian mana pun di dalam halaman.

Isi halaman memiliki ruang bawah yang cukup agar kontrol terakhir tidak tertutup dock. Penambahan kategori tersedia melalui Others lalu Kelola kategori.

## Dashboard

Dashboard dimulai dengan Pengeluaran sebagai jenis aktif.

Saat Pengeluaran aktif:

- total pengeluaran menjadi angka utama;
- total pemasukan menjadi angka pendamping;
- daftar menampilkan kategori pengeluaran.

Saat pengguna mengganti jenis ke Pemasukan:

- total pemasukan menjadi angka utama;
- total pengeluaran menjadi angka pendamping;
- daftar berubah menjadi kategori pemasukan;
- daftar kategori yang sedang diperluas kembali ke keadaan ringkas.

## Filter tanggal

Saat aplikasi dibuka, filter selalu dimulai dari `Hari ini`. Filter terakhir tidak disimpan setelah aplikasi ditutup.

Label filter menunjukkan periode yang sedang aktif.

### Tekan untuk memilih bulan

Menekan label filter membuka daftar bulan.

Daftar dimulai pada tahun yang sedang ditampilkan. Menekan angka tahun membuka daftar tahun. Daftar tahun hanya memuat tahun yang memiliki transaksi dan tahun berjalan.

Menekan nama bulan langsung menerapkan bulan tersebut dan menutup daftar. Label berubah menjadi nama bulan dan tahun, misalnya `Januari 2026`.

Bulan setelah bulan berjalan dan tahun mendatang tidak dapat dipilih. Bulan tanpa transaksi tetap dapat dipilih.

Menekan area di luar daftar atau melakukan tindakan kembali menutup daftar tanpa mengubah filter.

### Tahan untuk memilih periode

Seluruh label, termasuk ikon dan teks seperti `Hari ini`, dapat ditekan atau ditahan. Menahan label selama 550 milidetik membuka popup pada lapisan paling atas. Baris `Hari ini` selalu muncul tepat di atas posisi label yang sedang ditahan, terlepas dari periode yang sedang aktif. Popup boleh menutupi header dan isi dashboard:

- Semua;
- Hari ini;
- 7 hari;
- 2 minggu;
- 1 bulan;
- 3 bulan;
- 6 bulan;
- 1 tahun.

Setelah pilihan muncul, pengguna tetap menahan layar lalu menggeser jari ke pilihan yang diinginkan. Pilihan diterapkan saat jari dilepas.

Jika jari dilepas di luar pilihan, daftar ditutup dan filter sebelumnya tetap digunakan. Jika jari sudah bergerak untuk menggulir dashboard sebelum 550 milidetik, gestur tahan dibatalkan.

Rentang dihitung sampai hari ini dan mencakup hari ini:

- 7 hari berarti hari ini dan 6 hari sebelumnya;
- 2 minggu berarti 14 hari;
- 1 bulan berarti 30 hari;
- 3 bulan berarti 90 hari;
- 6 bulan berarti 180 hari;
- 1 tahun berarti 365 hari;
- Semua berarti seluruh transaksi sampai hari ini.

Setelah periode diterapkan, label memakai nama pilihannya, misalnya `7 hari` atau `1 bulan`.

### Dampak filter

Filter mengubah:

- total pengeluaran dan pemasukan;
- jumlah pada setiap kategori;
- frekuensi kategori yang ditampilkan.

Filter tidak mengubah urutan kategori.

Mengganti jenis Pengeluaran atau Pemasukan tidak mengubah filter yang sedang aktif.

Jika periode tidak memiliki transaksi:

- kedua total menjadi Rp0;
- urutan kategori tetap mengikuti frekuensi penggunaan sepanjang waktu;
- semua kategori menampilkan `••••`.

`Hari ini` mengikuti tanggal dan zona waktu perangkat. Jika aplikasi tetap terbuka ketika tanggal berganti, Hari ini dan seluruh rentang periode dihitung ulang secara otomatis.

## Urutan kategori

Kategori dirangking berdasarkan frekuensi seluruh transaksi yang tersimpan. Pergantian hari atau filter periode tidak mereset urutan.

Kategori yang lebih sering digunakan sepanjang waktu muncul lebih dahulu. Jika dua kategori memiliki frekuensi yang sama, gunakan urutan bawaan kategori.

Dashboard menampilkan lima kategori teratas terlebih dahulu.

Saat pengguna memilih `Lihat kategori lainnya`, semua kategori tersisa ditampilkan. Pengguna dapat memilih `Tampilkan lebih sedikit` untuk kembali ke lima kategori teratas.

Kategori yang belum memiliki transaksi menampilkan `••••` sebagai keadaan kosong.

## Kelola kategori

Tombol tambah membuka formulir kategori baru. Pengguna mengisi nama dan memilih Pengeluaran atau Pemasukan.

Nama kategori wajib diisi dan tidak boleh sama dengan kategori lain pada jenis yang sama.

Kategori dapat ditambah atau dihapus. Nama kategori tidak dapat diubah.

Saat kategori dihapus:

- kategori hilang dari dashboard dan pilihan input baru;
- transaksi lama tetap memakai nama kategori tersebut;
- transaksi lama tidak dihapus atau dipindahkan.

Daftar kategori disimpan di perangkat dan ikut dalam backup.

## Memulai input transaksi

Jenis transaksi mengikuti jenis yang sedang aktif di dashboard. Kategori mengikuti kategori yang dipilih dan tidak dapat diganti selama proses input.

Ada dua cara memulai input:

- tekan singkat kategori untuk input normal;
- tahan kategori untuk input suara.

Keduanya membuka formulir transaksi yang sama.

## Input normal

Saat pengguna menekan singkat kategori:

1. formulir transaksi dibuka;
2. jenis dan kategori langsung ditentukan dari dashboard;
3. tanggal otomatis berisi hari ini;
4. tidak ada kolom yang langsung mendapat fokus;
5. pengguna mengisi nominal dan deskripsi;
6. pengguna dapat mengubah tanggal;
7. pengguna memeriksa semua data;
8. pengguna memilih Simpan.

## Input suara

Saat pengguna menahan kategori:

1. formulir transaksi dibuka;
2. jenis dan kategori langsung ditentukan dari dashboard;
3. tanggal otomatis berisi hari ini;
4. Aureus langsung mulai mendengarkan;
5. perekaman berhenti setelah pengguna berhenti bicara dan terjadi jeda;
6. Aureus mengambil nominal dan deskripsi dari ucapan;
7. hasil dimasukkan ke kolom yang sesuai;
8. pengguna memeriksa dan dapat mengubah hasil;
9. pengguna memilih Simpan.

Input suara tidak mengubah kategori atau tanggal.

Jika Aureus hanya mengenali sebagian ucapan:

- hasil yang berhasil dikenali tetap dipertahankan;
- kolom yang kosong atau tidak valid harus dilengkapi secara manual;
- perekaman tidak diulang secara otomatis.

## Nominal

Nominal memakai Rupiah tanpa pecahan.

`Rp` selalu terlihat. Pengguna hanya memasukkan angka. Aureus menambahkan pemisah ribuan secara otomatis. Contoh, masukan `13000` ditampilkan sebagai `Rp13.000`.

Nominal harus lebih besar dari Rp0.

## Deskripsi

Deskripsi wajib diisi dan tidak boleh hanya berisi spasi.

## Tanggal

Tanggal awal selalu hari ini, termasuk saat dashboard sedang menampilkan bulan atau periode lain. Pengguna dapat memilih hari ini atau tanggal lampau.

Tanggal setelah hari ini tidak valid.

## Latest

Latest mengambil transaksi dari jenis dan kategori yang sama dengan formulir yang sedang dibuka. Latest tidak mengikuti filter dashboard.

Latest menampilkan lima transaksi terbaru dari seluruh riwayat jenis dan kategori tersebut, dimulai dari transaksi paling baru. Pengguna dapat menggeser daftar untuk melihat item yang tidak muat.

Setiap item memiliki nominal dan deskripsi.

- Menekan nominal menyalin nominal saja.
- Menekan deskripsi menyalin deskripsi saja.
- Menahan satu item menyalin nominal dan deskripsinya sekaligus.

Menyalin data dari Latest tidak langsung menyimpan transaksi. Pengguna masih dapat mengubah hasilnya.

Jika belum ada transaksi sebelumnya, Latest menampilkan `Belum ada transaksi sebelumnya`.

## Validasi

Transaksi hanya dapat disimpan jika:

- kategori sudah tersedia;
- nominal lebih besar dari Rp0;
- deskripsi sudah diisi;
- tanggal valid.

Transaksi hanya disimpan saat pengguna memilih Simpan.

## Setelah disimpan

Jika tanggal transaksi masuk dalam filter yang sedang aktif:

1. transaksi disimpan;
2. total jenis transaksi diperbarui;
3. jumlah kategori diperbarui;
4. frekuensi kategori diperbarui;
5. urutan kategori sepanjang waktu dihitung ulang;
6. Latest diperbarui;
7. formulir ditutup;
8. pesan berhasil ditampilkan.

Jika frekuensi kategori berubah, posisi kategori dapat ikut berubah.

Jika tanggal transaksi berada di luar filter yang sedang aktif:

1. transaksi tetap disimpan;
2. transaksi masuk ke riwayat dan Latest;
3. total yang sedang ditampilkan tidak berubah;
4. jumlah kategori yang sedang ditampilkan tidak berubah;
5. urutan kategori sepanjang waktu dapat berubah;
6. filter tidak berubah;
6. formulir ditutup;
7. pesan berhasil ditampilkan.

## Menutup tanpa menyimpan

Jika pengguna menutup formulir sebelum memilih Simpan:

- semua perubahan dibuang;
- tidak ada konfirmasi;
- tidak ada draf yang disimpan.

Jika papan ketik sedang terbuka, tindakan kembali pertama menutup papan ketik. Tindakan kembali berikutnya menutup formulir.

## Urutan langganan

Halaman Langganan tidak menampilkan jumlah langganan aktif. Perkiraan biaya bulanan tetap tersedia sebagai satu baris ringkas, dan tombol Notifikasi memakai tinggi yang lebih kecil agar daftar terlihat lebih awal.

Setiap kartu langganan memiliki pegangan urut. Pengguna dapat menahan pegangan lalu menggeser kartu secara vertikal. Urutan baru disimpan bersama data lokal dan dipertahankan dalam backup. Pegangan tidak memicu gestur perpindahan halaman.

## Langganan gratis

Biaya langganan boleh Rp0.

Langganan Rp0 tetap mengikuti tanggal mulai dan siklus yang dipilih. Saat jatuh tempo, Aureus memajukan jadwal pembayaran berikutnya seperti langganan lain.

Aureus tidak membuat transaksi Rp0 karena langganan gratis tidak mengubah pengeluaran.

## Perilaku yang belum ditentukan

Bagian berikut belum memiliki perilaku:

- avatar;
