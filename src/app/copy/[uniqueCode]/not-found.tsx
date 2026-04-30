"use client";

import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useI18n } from "../../../contexts/I18nContext";
import styles from "./copy.module.css";

export default function CopyNotFound() {
  const { t } = useI18n();

  return (
    <div className={`${styles.copyPage} ${styles.notFoundPage} ${styles.notFound}`}>
      <div className={styles.copyTopBar}>
        <LanguageSwitcher />
      </div>
      <h1 className="badge badge-red">404</h1>
      <p>{t("copyNotFound")}</p>
    </div>
  );
}
