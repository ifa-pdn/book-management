import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "../contexts/I18nContext";
import AppShell from "../components/AppShell";
import { DialogProvider } from "../components/DialogProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lentra",
  description: "Internal book catalog, inventory, lending, and QR label management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        />
      </head>
      <body>
        <I18nProvider>
          <DialogProvider>
            <AppShell>{children}</AppShell>
          </DialogProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
