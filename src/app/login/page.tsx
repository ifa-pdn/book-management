"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useI18n } from "../../contexts/I18nContext";
import styles from "./login.module.css";

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
};

export default function LoginPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/");
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(nextPath);
        router.refresh(); // Refresh to update auth state in layouts
      } else {
        setError(t("loginFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={`glass-panel ${styles.loginPanel}`}>
        <div className={styles.loginTopBar}>
          <LanguageSwitcher />
        </div>

        <h1 className={styles.loginTitle}>{t("loginAdminTitle")}</h1>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className={`form-label ${styles.loginLabel}`}>
              {t("loginPasswordLabel")}
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder={t("loginPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>

          {error && <p className={styles.loginError}>{error}</p>}

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.loginButton}`}
            disabled={loading}
          >
            {loading ? t("loginChecking") : t("loginSubmit")}
          </button>
        </form>

        <p className={styles.loginFootnote}>
          {t("loginFootnote")}
        </p>
      </div>
    </div>
  );
}
