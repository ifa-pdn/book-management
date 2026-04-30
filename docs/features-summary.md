# Rangkuman Fitur AUC Books

Dokumen ini merangkum fitur yang tersedia pada aplikasi AUC Books saat ini.

## Area Internal

- Halaman `/` menjadi katalog internal dengan judul `AUC Books`.
- Semua halaman katalog dan QR membutuhkan login company passcode.
- Role `viewer` dapat membuka katalog, detail buku, dan detail copy QR.
- Role `admin` dapat membuka semua halaman viewer serta area admin.
- User internal dapat mencari buku berdasarkan judul, penulis, atau ISBN.
- User internal dapat memfilter buku berdasarkan kategori.
- User internal dapat mengurutkan buku berdasarkan terbaru, judul, tanggal terbit, stok tersedia, dan kategori.
- Kartu katalog menampilkan cover, judul, penulis, penerbit, ISBN, total copy, copy tersedia, dan kategori.
- Halaman detail buku tersedia di `/books/[isbn]`.
- Halaman detail copy tersedia di `/copy/[uniqueCode]`.
- Halaman detail buku menampilkan informasi buku, SKU/copy code, total copy, jumlah tersedia, dan status dipinjam jika ada.
- Halaman detail copy menampilkan SKU, total copy, jumlah tersedia, dan detail buku terkait.
- Halaman `/books/[isbn]` dan `/copy/[uniqueCode]` menampilkan pesan:
  `Hubungi penanggung jawab perpustakaan untuk meminjam buku ini.`
- Payload publik disanitasi agar tidak membocorkan lokasi copy, kondisi copy, atau data peminjam.

## Login dan Area Admin

- User internal dan admin login melalui `/login`.
- Login memakai company passcode:
  - `COMPANY_PASSCODE` untuk role `viewer`.
  - `ADMIN_PASSWORD` untuk role `admin`.
- Route admin dilindungi autentikasi:
  - `/admin`
  - `/admin/add`
  - `/admin/loans`
  - `/add`
- User yang belum login diarahkan ke halaman login saat membuka katalog, QR, atau route admin.
- User role `viewer` diarahkan kembali ke katalog jika mencoba membuka route admin.
- Admin memiliki header/menu untuk:
  - Dashboard
  - Tambah Buku Baru
  - Pinjam・Kembali
  - Pilihan bahasa
  - Logout
- Bahasa yang tersedia:
  - ID
  - EN
  - JA
- Halaman katalog internal menampilkan tombol Logout untuk user yang sudah login.
- Jika user adalah admin, halaman katalog internal juga menampilkan akses ke Dashboard.
- Login mendukung parameter `next`, sehingga admin dapat kembali ke halaman asal setelah login.

## Dashboard Admin

- Halaman `/admin` menampilkan dashboard inventaris.
- Dashboard menampilkan ringkasan:
  - Pinjaman aktif
  - Overdue
- Admin dapat mencari buku berdasarkan judul, penulis, ISBN, atau kode copy.
- Admin dapat memfilter buku berdasarkan kategori.
- Admin dapat mengurutkan buku berdasarkan:
  - Terbaru
  - Judul
  - Tanggal terbit
  - Stok terbanyak
  - Stok tersedikit
  - Kategori
- Kartu buku menampilkan cover, metadata buku, total copy, copy tersedia, dan overdue jika ada.
- Detail copy pada kartu buku dapat dibuat collaps jika jumlah copy lebih dari satu.
- Setiap copy menampilkan:
  - Kode unik copy
  - Status tersedia, dipinjam, atau overdue
  - Lokasi
  - Kondisi
- Admin dapat mengedit metadata buku.
- Admin dapat mengubah atau mengunggah cover buku.
- Admin dapat mengedit lokasi dan kondisi setiap copy.
- Admin dapat menghapus copy fisik.
- Admin dapat menghapus buku beserta semua copy.
- Admin dapat mengekspor data buku ke CSV.
- Admin dapat mencetak label QR.
- Admin dapat masuk ke mode cetak label massal.
- Admin dapat memilih semua atau sebagian buku untuk dicetak labelnya.
- Tersedia modal review label sebelum mencetak.
- Label berisi QR code yang mengarah ke halaman `/copy/[uniqueCode]`.

## Tambah Buku

- Form tambah buku tersedia di `/admin/add` dan `/add`.
- Admin dapat mengambil data buku berdasarkan ISBN.
- Admin dapat scan barcode ISBN buku memakai kamera smartphone.
- Hasil scan otomatis mengisi field ISBN dan menjalankan pencarian data buku.
- Pencarian ISBN mengecek database lokal terlebih dahulu.
- Jika buku belum ada di database lokal, sistem mencoba mengambil data dari OpenBD.
- Jika OpenBD tidak menemukan data, sistem mencoba Google Books.
- Form mendukung input:
  - ISBN
  - Judul
  - Penulis
  - Penerbit
  - Tanggal terbit
  - Ukuran
  - Cover
  - Edisi
  - Cetakan
  - Kategori
  - Lokasi copy
  - Kondisi copy
  - Jumlah copy
- Edisi dan cetakan memakai counter.
- Format edisi dan cetakan mengikuti bahasa aktif.
- Cover dapat diunggah manual.
- Gambar cover dikompres ke WebP di sisi client.
- Upload cover menggunakan deduplikasi berbasis hash file.
- Jika ISBN sudah ada, sistem otomatis melanjutkan nomor copy berikutnya.
- Sistem membuat kode unik copy otomatis, misalnya `AUC-XX1-1`.

## Pinjam・Kembali

- Halaman operasional peminjaman tersedia di `/admin/loans`.
- Halaman menampilkan ringkasan:
  - Pinjaman aktif
  - Overdue
- Form `Catat Pinjaman` dapat collaps pada layar kecil.
- Admin mencari copy menggunakan kode tanpa harus mengetik prefix `AUC-`, misalnya `WO1-1`.
- Judul buku otomatis terisi jika kode copy ditemukan.
- Tombol `Buat Pinjaman` hanya aktif jika copy tersedia.
- Jika copy tidak tersedia atau sedang dipinjam, tombol dibuat nonaktif dan sistem menampilkan pesan.
- Data peminjaman mencakup:
  - Kode copy
  - Nama peminjam
  - Kelas
  - Tanggal pinjam
  - Jatuh tempo
  - Catatan pinjam
- Pilihan kelas dibatasi pada:
  - Kelas 1
  - Kelas 2
- Tanggal jatuh tempo default adalah 1 hari dari tanggal saat ini.
- Daftar pinjaman aktif menampilkan:
  - Judul buku
  - Kode copy
  - Nama peminjam
  - Kelas
  - Tanggal pinjam
  - Tanggal jatuh tempo
  - Status pinjaman
  - Catatan pinjam
  - Catatan kembali
- Admin dapat memproses pengembalian dengan tanggal kembali.
- Admin dapat mengisi dan mengedit catatan pinjam serta catatan kembali.
- Tombol edit catatan berada di kanan atas kartu pinjaman.
- Saat catatan pada kartu sedang diedit, tombol pengembalian pada kartu tersebut dinonaktifkan sementara.
- Tersedia tombol refresh untuk memuat ulang data admin.
- Tersedia navigasi ke halaman riwayat peminjaman.
- Tersedia navigasi ke halaman `Loan Station`.

## Loan Station

- Halaman station tersedia di `/admin/loans/station`.
- Halaman station dilindungi login admin.
- Jika device membuka station tanpa login, sistem mengarahkan ke `/login?next=/admin/loans/station`.
- Setelah login berhasil, admin dikembalikan ke halaman station.
- Halaman station tidak menampilkan header admin penuh agar cocok dipakai sebagai device standby.
- Station memiliki dua mode:
  - Pinjam
  - Kembali
- Admin dapat memasukkan kode copy tanpa prefix `AUC-`.
- Admin dapat scan QR label internal AUC untuk mengisi kode copy otomatis.
- QR station dapat membaca URL `/copy/[uniqueCode]` atau kode copy langsung.
- Kode copy yang diketik di station otomatis ditampilkan dalam huruf kapital.
- Jika copy tersedia, form data peminjam aktif dan fokus berpindah ke nama peminjam.
- Peminjam dapat mengisi sendiri:
  - Nama
  - Kelas
- Admin dapat memeriksa data lalu membuat pinjaman.
- Tanggal jatuh tempo default tetap 1 hari dari tanggal saat ini.
- Setelah pinjaman berhasil dibuat, station mengosongkan form dan siap untuk pinjaman berikutnya.
- Pada mode `Kembali`, admin memasukkan copy yang sedang dipinjam.
- Jika copy memiliki pinjaman aktif, station menampilkan data peminjam, kelas sesuai bahasa aktif, tanggal pinjam, dan jatuh tempo.
- Admin dapat mengisi tanggal kembali dan catatan kembali lalu memproses pengembalian.
- Setelah pengembalian berhasil diproses, station mengosongkan form dan siap untuk pengembalian berikutnya.
- Tersedia tombol kecil untuk:
  - Pinjam・Kembali
  - Dashboard
  - Kunci Station
- `Kunci Station` melakukan logout dan mengembalikan device ke login station.
- Halaman QR copy `/copy/[uniqueCode]` menampilkan tombol `Buat Pinjaman` untuk admin.
- Tombol dari halaman QR membawa admin ke `/admin/loans/station?copy=[uniqueCode]`.
- Jika copy sedang dipinjam, halaman QR copy menampilkan form pengembalian langsung untuk admin.
- Dari halaman QR copy, admin juga dapat membuka mode kembali di station melalui `/admin/loans/station?mode=return&copy=[uniqueCode]`.
- Jika user belum login saat membuka halaman QR, sistem mengarahkan ke `/login?next=/copy/[uniqueCode]`.

## Riwayat Peminjaman

- Halaman riwayat tersedia di `/admin/loans/history`.
- Halaman menampilkan:
  - Jumlah data riwayat yang sedang terlihat
  - Total data riwayat
  - Pinjaman aktif
  - Overdue
- Admin dapat mencari riwayat berdasarkan:
  - Judul
  - Kode copy
  - Nama peminjam
  - Kelas
  - ISBN
- Label kelas pada riwayat mengikuti bahasa aktif.
- Admin dapat memfilter status:
  - Semua status
  - Dipinjam
  - Overdue
  - Dikembalikan
- Admin dapat mengurutkan riwayat berdasarkan:
  - Tanggal pinjam terbaru
  - Tanggal pinjam terlama
  - Jatuh tempo terdekat
  - Tanggal kembali terbaru
  - Nama peminjam
  - Judul
- Kartu riwayat menampilkan status:
  - Dipinjam
  - Overdue
  - Dikembalikan
  - Dikembalikan terlambat
- Catatan pinjam dan catatan kembali dapat diedit dari halaman riwayat.
- Tombol edit catatan berada di kanan atas kartu riwayat.

## Status Copy dan Overdue

- Status copy dihitung dari loan aktif.
- Jika tidak ada loan aktif, copy berstatus `available`.
- Jika ada loan aktif dan belum lewat jatuh tempo, copy berstatus `loaned`.
- Jika ada loan aktif dan sudah lewat jatuh tempo, copy berstatus `overdue`.
- Overdue dihitung saat data dibaca, bukan melalui background scheduler terpisah.
- Pinjaman yang sudah dikembalikan memiliki `returnedAt` dan status `returned`.

## API

- `POST /api/books`
  - Menambah buku dan copy.
  - Admin-only.
- `GET /api/books`
  - Mengambil data katalog.
  - Public mendapat payload aman.
  - Admin mendapat data lengkap.
- `PUT /api/books`
  - Mengubah metadata buku dan data copy.
  - Admin-only.
- `DELETE /api/books`
  - Menghapus buku atau copy.
  - Admin-only.
- `GET /api/books/fetch`
  - Mengambil data buku berdasarkan ISBN dari lokal, OpenBD, atau Google Books.
- `GET /api/books/export`
  - Mengekspor data buku ke CSV.
  - Admin-only.
- `POST /api/upload`
  - Mengunggah cover buku.
  - Admin-only.
- `GET /api/books/copy/[id]`
  - Mengambil detail copy.
  - Payload publik disanitasi.
- `PATCH /api/books/copy/[id]`
  - Mengubah lokasi dan kondisi copy.
  - Admin-only.
- `GET /api/loans`
  - Mengambil pinjaman aktif.
  - Admin-only.
- `POST /api/loans`
  - Membuat pinjaman baru.
  - Admin-only.
- `PATCH /api/loans/[id]/return`
  - Memproses pengembalian.
  - Admin-only.
- `PATCH /api/loans/[id]/notes`
  - Mengedit catatan pinjam dan catatan kembali.
  - Admin-only.
- `POST /api/auth`
  - Login company passcode untuk role `viewer` atau `admin`.
- `POST /api/auth/logout`
  - Logout user.

## Data Model

- `Book`
  - Menyimpan data utama buku seperti ISBN, judul, penulis, penerbit, cover, kategori, dan metadata.
- `BookCopy`
  - Menyimpan data copy fisik seperti kode unik, nomor copy, lokasi, dan kondisi.
- `Loan`
  - Menyimpan data peminjaman seperti copy, peminjam, kelas, tanggal pinjam, jatuh tempo, tanggal kembali, status, catatan pinjam, dan catatan kembali.

## Catatan Teknis

- Internal catalog dan admin dashboard menggunakan data shape yang berbeda.
- Role `viewer` tidak menampilkan data sensitif operasional.
- Mutasi data penting diproteksi di server melalui pengecekan admin.
- Desain sudah memakai CSS module per halaman untuk area utama.
- Alert, confirm, select, date picker, dan combobox sudah memakai komponen custom yang mengikuti desain aplikasi.
- Teks utama sudah terhubung dengan sistem multi bahasa ID, EN, dan JA.
- Key terjemahan ID, EN, dan JA sudah dicek agar tidak ada key yang hilang atau kosong.
- Nilai internal seperti `Kelas 1` dan `Kelas 2` tetap disimpan stabil di database, lalu ditampilkan sesuai bahasa aktif di UI.
