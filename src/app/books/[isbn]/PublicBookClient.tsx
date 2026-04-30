"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "../../../components/Icon";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useI18n } from "../../../contexts/I18nContext";
import styles from "./page.module.css";

export type PublicBookDetail = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  edition: string;
  printing: string;
  publishDate: string;
  size: string;
  category: string;
  copyCodes: string[];
  totalCopies: number;
  availableCopies: number;
  loanedCopies: number;
};

export default function PublicBookClient({
  book,
  isAdmin,
}: {
  book: PublicBookDetail;
  isAdmin: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();

  const enSuffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  const formatDynamic = (text: string, type: "edition" | "printing") => {
    if (!text || text === "-") return "-";
    let num = parseInt(text.replace(/[^\d]/g, ""));
    if (isNaN(num)) num = 1;

    if (type === "edition") {
      if (lang === "ja") return num === 1 ? "初版" : `第${num}版`;
      if (lang === "en") return enSuffix(num);
      return `Ke-${num}`;
    }

    if (lang === "ja") return `第${num}刷`;
    if (lang === "en") return enSuffix(num);
    return `Ke-${num}`;
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={styles.bookPage}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <Icon name="arrow_back" />
          {t("backToCatalog")}
        </Link>
        <div className={styles.topActions}>
          <LanguageSwitcher />
          {isAdmin ? (
            <Link href="/admin" className={styles.authButton}>
              <Icon name="dashboard" />
              {t("openDashboard")}
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.authButton}
            onClick={handleLogout}
          >
            <Icon name="logout" />
            {t("logoutAction")}
          </button>
        </div>
      </div>

      <div className={`glass-panel ${styles.bookPanel}`}>
        <div className={styles.bookHero}>
          <div className={styles.coverFrame}>
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={t("coverImage")}
                fill
                unoptimized
                className={styles.coverImage}
              />
            ) : (
              <div className={styles.noCover}>{t("noCover")}</div>
            )}
          </div>

          <div className={styles.bookInfo}>
            <h1 className={styles.bookTitle}>{book.title}</h1>
            <p className={styles.bookAuthor}>
              {book.author || "-"} • {book.publisher || "-"}
            </p>
            <p className={styles.isbn}>ISBN: {book.isbn}</p>

            <div className={styles.badgeList}>
              <span className={`badge ${styles.badgeReset}`}>
                {t("totalCopies")}: {book.totalCopies}
              </span>
              <span className={`badge badge-green ${styles.badgeReset}`}>
                {t("availableCopies")}: {book.availableCopies}
              </span>
              {book.loanedCopies > 0 ? (
                <span className={`badge badge-yellow ${styles.badgeReset}`}>
                  {t("statusLoaned")}: {book.loanedCopies}
                </span>
              ) : null}
              {book.category ? (
                <span className={`badge ${styles.badgeReset}`}>
                  {book.category}
                </span>
              ) : null}
            </div>

            {book.copyCodes.length > 0 ? (
              <div className={styles.skuSection}>
                <div className={styles.skuLabel}>SKU</div>
                <div className={styles.skuList}>
                  {book.copyCodes.map((code) => (
                    <span key={code} className={`badge ${styles.badgeReset}`}>
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={styles.detailGrid}>
              <div>
                {t("edition")}: <b>{formatDynamic(book.edition, "edition")}</b>
              </div>
              <div>
                {t("printing")}:{" "}
                <b>{formatDynamic(book.printing, "printing")}</b>
              </div>
              <div>
                {t("pubDate")}: <b>{book.publishDate || "-"}</b>
              </div>
              <div>
                {t("size")}: <b>{book.size || "-"}</b>
              </div>
            </div>

            <div className={styles.borrowNotice}>
              {t("borrowContactMessage")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
