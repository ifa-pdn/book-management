"use client";

import { useI18n } from "../contexts/I18nContext";
import CustomSelect from "./CustomSelect";
import styles from "./LanguageSwitcher.module.css";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { t, lang, setLang } = useI18n();

  return (
    <label className={`${styles.switcher} ${className}`}>
      <span className={styles.label}>{t("language")}</span>
      <CustomSelect
        className={styles.selectRoot}
        buttonClassName={styles.select}
        ariaLabel={t("language")}
        value={lang}
        onChange={(value) => setLang(value as "id" | "en" | "ja")}
        options={[
          { value: "id", label: "ID" },
          { value: "en", label: "EN" },
          { value: "ja", label: "JA" },
        ]}
      />
    </label>
  );
}
