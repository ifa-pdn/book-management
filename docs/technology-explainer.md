# Penjelasan Teknologi yang Dipakai

Dokumen ini menjelaskan teknologi utama di AUC Books dengan bahasa sederhana.

## Next.js

Next.js adalah framework untuk membuat aplikasi web dengan React. Di project ini, Next.js mengatur halaman seperti katalog, dashboard admin, halaman login, halaman detail buku, dan API internal seperti `/api/books` atau `/api/loans`.

Anggap Next.js sebagai kerangka utama aplikasi: ia mengatur route, halaman, server, dan cara data dikirim ke browser.

## React

React adalah library untuk membangun tampilan interaktif. Bagian seperti search field, dropdown custom, modal dialog, form pinjam/kembali, dan language switcher dibuat sebagai komponen React.

Anggap React seperti sistem lego untuk UI: kita membuat bagian kecil, lalu menyusunnya menjadi halaman lengkap.

## TypeScript

TypeScript adalah JavaScript yang ditambah sistem tipe. Tujuannya membantu menangkap kesalahan lebih awal, misalnya data buku harus punya `title`, loan harus punya `borrowerName`, atau bahasa hanya boleh `id`, `en`, dan `ja`.

Untuk pemula, TypeScript terasa lebih ketat, tapi membantu aplikasi lebih aman saat makin besar.

## CSS Modules

CSS Modules adalah cara menulis CSS yang hanya berlaku untuk file komponen atau halaman tertentu. Contohnya `LoanStationPage.module.css` hanya dipakai oleh halaman loan station.

Ini mencegah style saling bentrok antar halaman. Cocok untuk layout dan desain spesifik halaman.

## Global CSS

Global CSS adalah CSS yang berlaku untuk seluruh aplikasi. Di project ini, `globals.css` dipakai untuk warna dasar, tombol umum, badge, form input, dan panel kaca.

Anggap global CSS sebagai aturan desain umum, sedangkan CSS Modules sebagai aturan khusus per halaman.

## Prisma

Prisma adalah alat untuk berkomunikasi dengan database menggunakan kode yang lebih rapi. Kita tidak perlu menulis query database mentah untuk semua operasi.

Di app ini, Prisma dipakai untuk membaca dan menyimpan data buku, copy fisik, pinjaman, pengembalian, dan catatan.

## LibSQL / Turso Adapter

LibSQL adalah database yang mirip SQLite, dan adapter Turso membantu Prisma terhubung ke database tersebut.

Sederhananya, ini adalah tempat data aplikasi disimpan: buku, copy, status pinjaman, dan riwayat.

## HTTP-only Cookie

HTTP-only cookie dipakai untuk menyimpan status login dan role user, yaitu `viewer` atau `admin`.

Artinya setelah user memasukkan company passcode, aplikasi bisa mengenali role user tanpa harus login ulang di setiap halaman. Disebut HTTP-only karena cookie tidak bisa dibaca langsung oleh JavaScript di browser.

## iron-session dan JOSE

iron-session dan JOSE tersedia di dependency project, tetapi flow company passcode saat ini memakai cookie role sederhana terlebih dahulu.

Nanti jika sistem login dibuat lebih serius, dua library ini bisa dipakai untuk session/token yang lebih kuat.

## qrcode.react

qrcode.react dipakai untuk membuat QR code langsung dari React.

Di app ini, QR code digunakan pada label copy buku. Saat QR discan, user diarahkan ke halaman detail copy seperti `/copy/[uniqueCode]`.

## ESLint

ESLint adalah alat pengecek kualitas kode. Ia membantu menemukan masalah seperti import yang tidak dipakai, pola React yang kurang tepat, atau potensi error kecil.

ESLint tidak menjalankan aplikasi, tapi membantu menjaga kode tetap bersih dan konsisten.

## Route Handler API

Route handler adalah API yang dibuat di dalam folder `src/app/api`. Contohnya:

- `/api/books` untuk data buku.
- `/api/loans` untuk data peminjaman.
- `/api/auth` untuk login.
- `/api/upload` untuk upload cover.

Anggap ini sebagai pintu komunikasi antara tampilan aplikasi dan data di server.

## Server Component dan Client Component

Di Next.js, ada dua jenis komponen:

- Server Component berjalan di server, cocok untuk ambil data awal.
- Client Component berjalan di browser, cocok untuk interaksi seperti klik, input, dropdown, modal, dan form.

Di project ini, halaman bisa mengambil data di server, lalu UI interaktifnya dikelola oleh Client Component.

## Multi Bahasa

Sistem multi bahasa dibuat dengan context React dan file translasi. Bahasa yang tersedia adalah ID, EN, dan JA.

Saat user mengganti bahasa, teks utama aplikasi berubah mengikuti pilihan tersebut.

## Ringkasan Sederhana

Jika disederhanakan:

- Next.js adalah rangka aplikasi.
- React adalah pembuat tampilan interaktif.
- TypeScript membantu mencegah salah data.
- CSS Modules dan global CSS mengatur desain.
- Prisma dan LibSQL menyimpan serta mengambil data.
- HTTP-only cookie menyimpan login role viewer/admin.
- qrcode.react membuat QR label.
- ESLint membantu menjaga kode tetap rapi.
