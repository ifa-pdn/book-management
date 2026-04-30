"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, dictionary } from "../../../contexts/I18nContext";
import CustomSelect from "../../../components/CustomSelect";
import { useDialog } from "../../../components/DialogProvider";
import styles from "./copy.module.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CopyActionForm({ copy }: { copy: any }) {
  const [location, setLocation] = useState(copy.location);
  const [condition, setCondition] = useState(copy.condition);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t, lang } = useI18n();
  const dialog = useDialog();

  const getTrans = (prefix: string, key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dictionary[lang] as any)?.[`${prefix}_${key}`] || key;
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/copy/${copy.uniqueCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, condition }),
      });

      if (res.ok) {
        await dialog.alert(t("copyUpdateSuccess"));
        router.refresh(); // Supaya data tampilan komponen server/klien ikut ter-refresh
      } else {
        await dialog.alert(t("copyUpdateFailed"));
      }
    } catch {
      await dialog.alert(t("copyUpdateNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.actionForm}>
      <div className="form-group">
        <label className={`form-label ${styles.strongLabel}`}>{t('location')}</label>
        <CustomSelect
          buttonClassName="form-input"
          value={location}
          onChange={setLocation}
          ariaLabel={t("location")}
          options={[
            { value: "Kantor", label: getTrans("loc", "Kantor") },
            { value: "Kelas", label: getTrans("loc", "Kelas") },
          ]}
        />
      </div>

      <div className="form-group">
        <label className={`form-label ${styles.strongLabel}`}>{t('condition')}</label>
        <CustomSelect
          buttonClassName="form-input"
          value={condition}
          onChange={setCondition}
          ariaLabel={t("condition")}
          options={[
            { value: "Baru", label: getTrans("cond", "Baru") },
            { value: "Bekas", label: getTrans("cond", "Bekas") },
          ]}
        />
      </div>

      <button 
        className={`btn btn-primary ${styles.primaryAction}`}
        onClick={handleUpdate}
        disabled={loading}
      >
        {loading ? t('saving') : t('saveChanges')}
      </button>

      <button 
        className={`btn ${styles.secondaryAction}`}
        onClick={() => router.push('/')}
      >
        {t('backToCatalog')}
      </button>
    </div>
  );
}
