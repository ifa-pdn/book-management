# Lentra

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-002d42?style=for-the-badge)](https://book-management-sandy.vercel.app/)

Lentra is a semi-public book catalog with internal library management tools. Visitors can browse the catalog and open book or QR pages, while admins can manage inventory, covers, copy codes, loans, returns, and borrowing reports.

## Features

- Public catalog with search, category filters, sorting, responsive book cards, and book detail pages.
- QR-based copy pages for each physical book copy.
- Admin dashboard for adding, editing, deleting, and exporting book data.
- Copy code generation and QR label support.
- Cover upload with Vercel Blob support in production and local file fallback during development.
- Loan and return management, including active loans, history, overdue status, notes, and top-borrowed reports.
- Role-aware authentication for admin and viewer sessions.
- Multilingual UI support for Indonesian, English, and Japanese.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7
- SQLite/libSQL with Turso for production
- Vercel Blob for uploaded cover images
- Vercel for deployment

## Environment Variables

Create a local `.env` file for development:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="your-admin-password"
COMPANY_PASSCODE="your-viewer-passcode"
```

For Vercel production, configure:

```env
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."
ADMIN_PASSWORD="your-admin-password"
COMPANY_PASSCODE="your-viewer-passcode"
BLOB_READ_WRITE_TOKEN="..."
```

`BLOB_READ_WRITE_TOKEN` is only needed when using Vercel Blob. Without it, uploads fall back to `public/uploads` for local development.

## Local Development

Install dependencies:

```bash
npm install
```

Prepare the database:

```bash
npx prisma generate
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful Commands

```bash
npm run lint
npm run build
```

`npm run build` also runs `prisma generate` before building the Next.js app.

## Deployment

This app is designed to deploy on Vercel with Turso as the production database and Vercel Blob for cover storage.

Before deploying, make sure:

- Turso tables have been created using the Prisma migration SQL files.
- The production environment variables are set in Vercel.
- `BLOB_READ_WRITE_TOKEN` is configured if cover uploads should be stored in Vercel Blob.
