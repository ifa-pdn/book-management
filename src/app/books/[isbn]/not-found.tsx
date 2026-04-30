"use client";

import Link from "next/link";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useI18n } from "../../../contexts/I18nContext";
import styles from "./page.module.css";

export default function BookNotFound() {
  const { t } = useI18n();

  return (
    <div className={styles.bookPage}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          {t("backToCatalog")}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className={`glass-panel ${styles.notFoundPanel}`}>
        <h1 className="badge badge-red">404</h1>
        <p>{t("publicBookNotFound")}</p>
      </div>
    </div>
  );
}
