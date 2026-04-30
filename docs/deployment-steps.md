# Tahapan Deploy AUC Books di Local Server Kantor

Dokumen ini menjelaskan tahapan deploy aplikasi AUC Books ke server lokal kantor agar bisa diakses dari jaringan internal/LAN.

Asumsi utama:

- Server memakai Linux Ubuntu/Debian, atau distro Linux lain yang setara.
- Server berada di jaringan kantor dan punya IP statis, misalnya `192.168.1.10`.
- Aplikasi dijalankan sebagai Node.js server dengan `next start`, sesuai panduan self-hosting Next.js 16.
- Database memakai SQLite/LibSQL file lokal lewat Prisma.

> Jangan menjalankan aplikasi kantor dengan `npm run dev`. Mode tersebut hanya untuk development.

## 1. Siapkan Server

Pastikan server memiliki:

- Node.js versi LTS modern yang kompatibel dengan Next.js 16.
- npm.
- Git.
- Akses terminal/SSH.
- IP statis di LAN kantor.
- Akses folder backup, misalnya disk eksternal, NAS, atau folder backup server.

Cek versi:

```bash
node -v
npm -v
git --version
```

Jika server memakai firewall, siapkan akses port:

- `22` untuk SSH, hanya dari komputer admin.
- `80` untuk akses HTTP intranet, jika memakai Nginx.
- `443` untuk HTTPS intranet, jika memakai sertifikat.
- `3000` hanya untuk tes langsung ke Next.js, sebaiknya tidak dibuka luas jika sudah memakai Nginx.

## 2. Tentukan Alamat Akses Kantor

Pilih salah satu pola akses:

```text
http://192.168.1.10
```

atau, jika kantor punya DNS lokal:

```text
http://auc-books.local
```

Jika ada DNS lokal, arahkan nama tersebut ke IP server aplikasi. Jika tidak ada DNS lokal, user bisa mengakses lewat IP server.

## 3. Clone atau Upload Project

Masuk ke server:

```bash
ssh user@192.168.1.10
```

Clone repository:

```bash
cd /opt
sudo git clone <url-repository> auc-books
sudo chown -R $USER:$USER /opt/auc-books
cd /opt/auc-books
```

Jika belum memakai repository remote, project bisa diupload manual ke `/opt/auc-books`, tetapi Git lebih disarankan agar update berikutnya lebih rapi.

## 4. Buat File Environment

Buat file `.env` di root project server:

```bash
nano .env
```

Isi minimal:

```env
NODE_ENV=production
DATABASE_URL="file:/opt/auc-books/data/prod.db"
COMPANY_PASSCODE="ganti-dengan-passcode-viewer-yang-kuat"
ADMIN_PASSWORD="ganti-dengan-password-admin-yang-kuat"
```

Catatan:

- `DATABASE_URL` menunjuk ke file database produksi.
- `COMPANY_PASSCODE` dipakai untuk login role viewer/user.
- `ADMIN_PASSWORD` dipakai untuk login admin.
- Jangan memakai password default.
- Jangan commit file `.env` ke repository.

## 5. Install Dependency

Jalankan:

```bash
npm ci
```

Gunakan `npm ci` di server agar dependency sesuai dengan `package-lock.json`.

## 6. Siapkan Folder Data dan Upload

Aplikasi butuh folder database dan folder upload cover.

```bash
mkdir -p data
mkdir -p public/uploads
```

Folder penting:

```text
data/prod.db
public/uploads
```

`public/uploads` wajib ikut backup karena berisi gambar cover yang diupload admin.

## 7. Siapkan Database

Generate Prisma Client:

```bash
npx prisma generate
```

Jalankan migration produksi:

```bash
npx prisma migrate deploy
```

Jika ingin membawa data dari komputer development, copy database lama ke server sebelum aplikasi dipakai:

```bash
cp /path/database-lama.db /opt/auc-books/data/prod.db
npx prisma migrate deploy
```

Pastikan file database bisa dibaca dan ditulis oleh user yang menjalankan aplikasi:

```bash
ls -lah data
```

## 8. Build Aplikasi

Jalankan build produksi:

```bash
npm run build
```

Jika build gagal, perbaiki error dulu sebelum lanjut. Jangan jalankan aplikasi produksi dari build yang gagal.

## 9. Tes Jalan Langsung dari Server

Jalankan sementara:

```bash
npm run start -- --hostname 0.0.0.0 --port 3000
```

Buka dari komputer di jaringan kantor:

```text
http://192.168.1.10:3000
```

Cek halaman:

- `/`
- `/login`
- `/admin`
- `/admin/add`
- `/admin/loans`
- `/admin/loans/station`

Tekan `Ctrl+C` di terminal setelah tes selesai.

## 10. Jalankan Permanen dengan PM2

Install PM2:

```bash
sudo npm install -g pm2
```

Jalankan aplikasi:

```bash
cd /opt/auc-books
pm2 start npm --name auc-books -- run start -- --hostname 0.0.0.0 --port 3000
pm2 save
pm2 startup
```

Ikuti perintah lanjutan yang ditampilkan oleh `pm2 startup`. Setelah itu cek status:

```bash
pm2 status
pm2 logs auc-books
```

Restart manual jika diperlukan:

```bash
pm2 restart auc-books
```

## 11. Pasang Nginx sebagai Reverse Proxy

Nginx membuat aplikasi bisa diakses lewat port `80`, misalnya `http://192.168.1.10`, tanpa mengetik `:3000`.

Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Buat konfigurasi:

```bash
sudo nano /etc/nginx/sites-available/auc-books
```

Isi contoh:

```nginx
server {
    listen 80;
    server_name 192.168.1.10 auc-books.local;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/auc-books /etc/nginx/sites-enabled/auc-books
sudo nginx -t
sudo systemctl reload nginx
```

Buka:

```text
http://192.168.1.10
```

## 12. Atur Firewall LAN

Contoh jika memakai `ufw` dan subnet kantor `192.168.1.0/24`:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw deny 3000/tcp
sudo ufw enable
sudo ufw status
```

Sesuaikan subnet dengan jaringan kantor. Jika belum yakin, tanya admin jaringan sebelum mengaktifkan firewall agar akses SSH tidak terputus.

## 13. HTTPS untuk Intranet

Untuk jaringan internal, pilih salah satu:

- Tetap HTTP jika hanya LAN tertutup dan risikonya diterima kantor.
- Pakai sertifikat internal dari tim IT.
- Pakai domain internal yang bisa diberi sertifikat.

Karena aplikasi memiliki login admin, HTTPS tetap lebih disarankan walaupun hanya dipakai di jaringan kantor.

## 14. Checklist Setelah Deploy

Cek dari komputer user, bukan hanya dari server:

- Halaman katalog `/` terbuka.
- Login viewer dengan `COMPANY_PASSCODE`.
- Login admin dengan `ADMIN_PASSWORD`.
- Admin bisa tambah buku.
- Upload cover berhasil dan file masuk ke `public/uploads`.
- Data buku muncul kembali setelah refresh.
- Peminjaman dan pengembalian berjalan.
- QR/copy detail bisa dibuka lewat `/copy/[uniqueCode]`.
- Setelah server restart, aplikasi tetap hidup.

Tes restart:

```bash
sudo reboot
```

Setelah server hidup lagi:

```bash
pm2 status
```

## 15. Backup Rutin

Backup minimal:

- Database: `/opt/auc-books/data/prod.db`
- Upload cover: `/opt/auc-books/public/uploads`
- File environment: `/opt/auc-books/.env`

Contoh backup manual:

```bash
mkdir -p /backup/auc-books
cp /opt/auc-books/data/prod.db /backup/auc-books/prod-$(date +%Y%m%d).db
tar -czf /backup/auc-books/uploads-$(date +%Y%m%d).tar.gz -C /opt/auc-books public/uploads
```

Simpan backup di lokasi berbeda dari server utama jika memungkinkan.

## 16. Update Versi Aplikasi

Saat ada update kode:

```bash
cd /opt/auc-books
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart auc-books
```

Setelah update, cek lagi halaman utama, login, upload cover, dan fitur peminjaman.

## 17. Rollback Sederhana

Jika update bermasalah:

1. Kembalikan kode ke versi commit sebelumnya.
2. Restore database dari backup jika migration sudah mengubah struktur/data.
3. Jalankan ulang build.
4. Restart aplikasi.

Contoh alur umum:

```bash
cd /opt/auc-books
git log --oneline -5
git checkout <commit-sebelumnya>
npm ci
npx prisma generate
npm run build
pm2 restart auc-books
```

Rollback database harus dilakukan hati-hati. Jangan menimpa `prod.db` sebelum membuat salinan kondisi terbaru.

## 18. Ringkasan Cepat

Urutan deploy pertama:

```bash
cd /opt
git clone <url-repository> auc-books
cd /opt/auc-books
nano .env
npm ci
mkdir -p data public/uploads
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start npm --name auc-books -- run start -- --hostname 0.0.0.0 --port 3000
pm2 save
```

Lalu pasang Nginx, atur firewall LAN, dan buat backup rutin.
