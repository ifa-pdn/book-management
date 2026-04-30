# AUC Books: Ringkasan Aplikasi dan Teknologi

## Ringkasan Aplikasi

AUC Books adalah aplikasi internal untuk manajemen koleksi buku, katalog perusahaan, inventaris admin, peminjaman, pengembalian, riwayat pinjam, dan label QR per copy buku.

User role `viewer` dapat login dengan company passcode untuk melihat katalog, mencari buku, membuka detail buku, dan membuka detail copy dari QR code. Admin dapat login dengan passcode admin untuk mengelola buku, menambah copy, mengubah metadata, mencetak label QR, membuat pinjaman, memproses pengembalian, serta melihat riwayat peminjaman.

## Fitur Utama

- Katalog publik dengan pencarian, filter, sort, halaman detail buku, dan halaman detail copy.
- Dashboard admin untuk inventaris, edit buku/copy, ekspor CSV, dan cetak label QR.
- Form tambah buku dengan fetch data ISBN dari database lokal, OpenBD, dan Google Books.
- Sistem pinjam/kembali dengan status tersedia, dipinjam, overdue, dan dikembalikan.
- Loan Station untuk device standby agar admin bisa cepat membuat pinjaman atau memproses pengembalian.
- Riwayat peminjaman dengan search, filter status, sort, dan edit catatan.
- Multi bahasa ID, EN, JA untuk teks utama aplikasi.
- Komponen custom untuk alert, confirm, select, date picker, dan combobox.

## Teknologi

- Next.js 16 App Router untuk routing, page, layout, route handler API, dan server/client component.
- React 19 untuk UI interaktif.
- TypeScript untuk type safety.
- CSS Modules dan global CSS untuk styling.
- Prisma 7 sebagai ORM.
- LibSQL/Turso adapter sebagai layer database.
- HTTP-only cookie untuk session role `viewer` dan `admin`.
- qrcode.react untuk generate QR code label.
- ESLint untuk pengecekan kualitas kode.

## Struktur Singkat

- `src/app`: halaman aplikasi dan API route.
- `src/components`: komponen UI reusable seperti sidebar, custom select, date input, dialog, dan icon.
- `src/contexts`: context multi bahasa.
- `src/lib`: helper data, auth, Prisma, loan status, dan translasi label.
- `prisma`: schema database dan migration.
- `docs`: dokumentasi fitur dan ringkasan aplikasi.
