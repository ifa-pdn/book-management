"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useI18n } from "../contexts/I18nContext";
import CustomSelect from "./CustomSelect";
import { useDialog } from "./DialogProvider";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const dialog = useDialog();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDashboardRoute = pathname === "/" || pathname === "/admin";
  const isAddRoute = pathname === "/add" || pathname === "/admin/add";
  const isLoansRoute = pathname.startsWith("/admin/loans");

  if (pathname === "/login") return null;

  return (
    <header className={styles.topHeader}>
      <div className={styles.topHeaderBrand}>AUC Books</div>
      <div className={styles.topHeaderSpacer} />

      <div className={styles.topHeaderDesktop}>
        <Link
          href="/admin"
          className={`${styles.navLink} ${
            isDashboardRoute ? styles.navLinkActive : ""
          }`}
        >
          {t("dashboard")}
        </Link>
        <Link
          href="/admin/add"
          className={`${styles.navLink} ${
            isAddRoute ? styles.navLinkActive : ""
          }`}
        >
          {t("addNewBook")}
        </Link>
        <Link
          href="/admin/loans"
          className={`${styles.navLink} ${
            isLoansRoute ? styles.navLinkActive : ""
          }`}
        >
          {t("loanPanelTitle")}
        </Link>
        <CustomSelect
          className={styles.languageSelectRoot}
          buttonClassName={styles.languageSelect}
          ariaLabel="Language"
          value={lang}
          onChange={(value) => setLang(value as "id" | "en" | "ja")}
          options={[
            { value: "id", label: "ID" },
            { value: "en", label: "EN" },
            { value: "ja", label: "JA" },
          ]}
        />
        <button
          className={`btn ${styles.logout}`}
          onClick={async () => {
            if (await dialog.confirm(t("logoutConfirmMessage"))) {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }
          }}
        >
          Logout
        </button>
      </div>

      <button
        type="button"
        className={styles.hamburgerButton}
        aria-label="Open menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <Link
            href="/admin"
            className={`${styles.navLink} ${
              isDashboardRoute ? styles.navLinkActive : ""
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/admin/add"
            className={`${styles.navLink} ${
              isAddRoute ? styles.navLinkActive : ""
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t("addNewBook")}
          </Link>
          <Link
            href="/admin/loans"
            className={`${styles.navLink} ${
              isLoansRoute ? styles.navLinkActive : ""
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t("loanPanelTitle")}
          </Link>
          <CustomSelect
            className={`${styles.languageSelectRoot} ${styles.mobileLanguageRoot}`}
            buttonClassName={`${styles.languageSelect} ${styles.mobileLanguageSelect}`}
            ariaLabel="Language"
            value={lang}
            onChange={(value) => {
              setLang(value as "id" | "en" | "ja");
              setIsMobileMenuOpen(false);
            }}
            options={[
              { value: "id", label: "ID" },
              { value: "en", label: "EN" },
              { value: "ja", label: "JA" },
            ]}
          />
          <button
            className={`btn ${styles.logout} ${styles.mobileLogout}`}
            onClick={async () => {
              if (await dialog.confirm(t("logoutConfirmMessage"))) {
                setIsMobileMenuOpen(false);
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }
            }}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
