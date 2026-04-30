"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useI18n, dictionary } from "../../../contexts/I18nContext";
import CopyActionForm from "./CopyActionForm";
import CustomDateInput from "../../../components/CustomDateInput";
import Icon from "../../../components/Icon";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { getBorrowerClassLabel } from "../../../lib/borrowerClassLabel";
import type { DerivedLoanStatus } from "../../../lib/loanStatus";
import styles from "./copy.module.css";

export type CopyViewModel = {
  uniqueCode: string;
  derivedStatus: DerivedLoanStatus;
  totalCopies: number;
  availableCopies: number;
  location?: string;
  condition?: string;
  activeLoan?: {
    id: string;
    borrowerName: string;
    borrowerClass: string;
    borrowedAt: string;
    dueAt: string;
    status: "active" | "overdue";
  } | null;
  book: {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    coverUrl: string;
    edition: string;
    printing: string;
    publishDate: string;
    size: string;
  };
};

type ApiErrorPayload = {
  code?: string;
  error?: string;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export default function CopyClientView({
  copy,
  isAdmin,
}: {
  copy: CopyViewModel;
  isAdmin: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const stationHref = `/admin/loans/station?mode=loan&copy=${encodeURIComponent(
    copy.uniqueCode,
  )}`;
  const returnStationHref = `/admin/loans/station?mode=return&copy=${encodeURIComponent(
    copy.uniqueCode,
  )}`;
  const canCreateLoan = copy.derivedStatus === "available";
  const canReturnLoan = Boolean(copy.activeLoan);
  const [returnedAt, setReturnedAt] = useState(toDateInputValue(new Date()));
  const [returnNotes, setReturnNotes] = useState("");
  const [returnMessage, setReturnMessage] = useState("");
  const [returnError, setReturnError] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  // Helper untuk terjemahan dinamis
  const getTrans = (prefix: string, key?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dictionary[lang] as any)?.[`${prefix}_${key}`] || key || "-";
  };

  const enSuffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
    switch (n % 10) {
        case 1: return n + 'st';
        case 2: return n + 'nd';
        case 3: return n + 'rd';
        default: return n + 'th';
    }
  };

  const formatDynamic = (text: string, type: 'edition' | 'printing', l: string) => {
    if (!text || text === '-') return '-';
    let num = parseInt(text.replace(/[^\d]/g, ''));
    if (isNaN(num)) num = 1;
    if (type === 'edition') {
      if (l === 'ja') return num === 1 ? '初版' : `第${num}版`;
      if (l === 'en') return enSuffix(num);
      return `Ke-${num}`;
    } else {
      if (l === 'ja') return `第${num}刷`;
      if (l === 'en') return enSuffix(num);
      return `Ke-${num}`;
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const getReturnApiErrorMessage = (data: ApiErrorPayload) => {
    const codeMap: Record<string, keyof typeof dictionary.id> = {
      LOAN_INVALID_RETURN_DATE: "loanInvalidReturnDateError",
      LOAN_NOT_FOUND: "loanNotFoundError",
      LOAN_ALREADY_RETURNED: "loanAlreadyReturnedError",
      LOAN_RETURN_FAILED: "loanReturnError",
    };

    return data.code && codeMap[data.code]
      ? t(codeMap[data.code])
      : t("loanReturnError");
  };

  const handleReturnLoan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!copy.activeLoan) {
      setReturnError(t("stationNoActiveLoanForCopy"));
      return;
    }

    setIsReturning(true);
    setReturnError("");
    setReturnMessage("");

    try {
      const res = await fetch(`/api/loans/${copy.activeLoan.id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnedAt,
          returnNotes,
        }),
      });
      const data = (await res.json()) as ApiErrorPayload;

      if (!res.ok) {
        throw new Error(getReturnApiErrorMessage(data));
      }

      setReturnMessage(t("loanReturnedMessage"));
      setReturnNotes("");
      router.refresh();
    } catch (error) {
      setReturnError(
        error instanceof Error ? error.message : t("loanReturnError"),
      );
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className={styles.copyPage}>
      <div className={styles.copyTopBar}>
        <div className={styles.copyTopActions}>
          <LanguageSwitcher />
          {isAdmin ? (
            <Link href="/admin" className={styles.topActionButton}>
              <Icon name="dashboard" />
              {t("openDashboard")}
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.topActionButton}
            onClick={handleLogout}
          >
            <Icon name="logout" />
            {t("logoutAction")}
          </button>
        </div>
      </div>

      <div className={`glass-panel ${styles.copyPanel}`}>
        
        {/* Identitas Buku Utama */}
        <div className={styles.copyHeader}>
          <div className={styles.copyCover}>
            {copy.book.coverUrl ? (
              <Image
                src={copy.book.coverUrl}
                alt={t("coverImage")}
                fill
                unoptimized
                className={styles.coverImage}
              />
            ) : (
              <div className={styles.noCover}>{t('noCover')}</div>
            )}
          </div>
          <div>
            <h1 className={styles.copyTitle}>{copy.book.title}</h1>
            <p className={styles.copyAuthor}>{copy.book.author} • {copy.book.publisher}</p>
            <p className={styles.copyIsbn}>ISBN: {copy.book.isbn}</p>
            <div className={styles.skuWrap}>
              <span className={`badge ${styles.skuBadge}`}>SKU: {copy.uniqueCode}</span>
              <span className={`badge ${styles.skuBadge}`}>
                {t("totalCopies")}: {copy.totalCopies}
              </span>
              <span className={`badge badge-green ${styles.skuBadge}`}>
                {t("availableCopies")}: {copy.availableCopies}
              </span>
            </div>
          </div>
        </div>

        {/* Kotak Detail Tambahan (Sepeti di Dashboard) */}
        <div className={styles.copyDetailGrid}>
            <div>{t('edition')}: <b>{formatDynamic(copy.book.edition, 'edition', lang)}</b></div>
            <div>{t('printing')}: <b>{formatDynamic(copy.book.printing, 'printing', lang)}</b></div>
            <div>{t('pubDate')}: <b>{copy.book.publishDate || '-'}</b></div>
            <div>{t('size')}: <b>{copy.book.size || '-'}</b></div>
        </div>

        <div className={styles.borrowNotice}>
          {t("borrowContactMessage")}
        </div>

        {isAdmin && (
          <div className={styles.statusBox}>
            <div className={styles.statusRowSeparated}>
              <span className={styles.statusLabel}>{t('location')}:</span>
              <span className={`badge badge-green ${styles.statusBadge}`}>{getTrans('loc', copy.location)}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>{t('condition')}:</span>
              <span className={`badge badge-red ${styles.statusBadge}`}>{getTrans('cond', copy.condition)}</span>
            </div>
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className={`glass-panel ${styles.managerPanel}`}>
          <h2 className={styles.managerTitle}><Icon name="settings" />{t('labelManager')}</h2>
          {returnError ? (
            <div className={styles.returnError}>{returnError}</div>
          ) : null}
          {returnMessage ? (
            <div className={styles.returnSuccess}>{returnMessage}</div>
          ) : null}
          {canCreateLoan ? (
            <Link
              href={stationHref}
              className={`btn btn-primary ${styles.createLoanLink}`}
            >
              <Icon name="assignment_add" />
              {t("createLoanFromCopy")}
            </Link>
          ) : null}
          {canReturnLoan ? (
            <form className={styles.returnPanel} onSubmit={handleReturnLoan}>
              <div className={styles.returnHeader}>
                <div>
                  <h3>{t("copyReturnPanelTitle")}</h3>
                  <p>{t("copyReturnPanelHint")}</p>
                </div>
                <Link href={returnStationHref} className={styles.stationReturnLink}>
                  <Icon name="qr_code_scanner" />
                  {t("openReturnStation")}
                </Link>
              </div>

              <div className={styles.returnSummary}>
                <div>
                  <span>{t("borrowerName")}</span>
                  <strong>{copy.activeLoan?.borrowerName}</strong>
                </div>
                <div>
                  <span>{t("borrowerClass")}</span>
                  <strong>
                    {copy.activeLoan
                      ? getBorrowerClassLabel(copy.activeLoan.borrowerClass, t)
                      : "-"}
                  </strong>
                </div>
                <div>
                  <span>{t("dueAtShortLabel")}</span>
                  <strong>
                    {copy.activeLoan
                      ? new Intl.DateTimeFormat(lang === "id" ? "id-ID" : lang, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(copy.activeLoan.dueAt))
                      : "-"}
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t("returnedAtLabel")}</label>
                <CustomDateInput
                  buttonClassName="form-input"
                  value={returnedAt}
                  onChange={setReturnedAt}
                  ariaLabel={t("returnedAtLabel")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("returnNotes")}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={returnNotes}
                  onChange={(event) => setReturnNotes(event.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary ${styles.createLoanLink}`}
                disabled={isReturning}
              >
                <Icon name="assignment_return" />
                {isReturning ? t("returnProcessing") : t("returnLoanFromCopy")}
              </button>
            </form>
          ) : null}
          {!canCreateLoan && !canReturnLoan ? (
            <div className={styles.unavailableNotice}>
              {t("loanUnavailableMessage")}
            </div>
          ) : null}
          <CopyActionForm copy={copy} />
        </div>
      ) : (
        <div className={styles.guestMessage}>
          <p className={styles.guestTitle}><Icon name="menu_book" />{t('guestMessageTitle')}</p>
          <p className={styles.guestBody}>{t('guestMessageBody')}</p>
        </div>
      )}
    </div>
  );
}
