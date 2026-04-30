"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../../../../components/Icon";
import LanguageSwitcher from "../../../../components/LanguageSwitcher";
import CustomDateInput from "../../../../components/CustomDateInput";
import CustomSelect from "../../../../components/CustomSelect";
import { dictionary, useI18n } from "../../../../contexts/I18nContext";
import type { AdminCatalogBook } from "../../../../lib/bookCatalog";
import type { AdminLoan } from "../../../../lib/adminLoans";
import { getBorrowerClassLabel } from "../../../../lib/borrowerClassLabel";
import type { DerivedLoanStatus } from "../../../../lib/loanStatus";
import CopyQrScanner from "./CopyQrScanner";
import styles from "./LoanStationPage.module.css";

type LoanForm = {
  bookCopyId: string;
  borrowerName: string;
  borrowerClass: string;
  borrowedAt: string;
  dueAt: string;
  borrowNotes: string;
};

type ReturnForm = {
  returnedAt: string;
  returnNotes: string;
};

type StationMode = "loan" | "return";

type ApiErrorPayload = {
  code?: string;
  error?: string;
};

type LoanCopyOption = {
  bookCopyId: string;
  uniqueCode: string;
  title: string;
  author: string;
  coverUrl: string;
  derivedStatus: DerivedLoanStatus;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const createDefaultLoanForm = (): LoanForm => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  return {
    bookCopyId: "",
    borrowerName: "",
    borrowerClass: "",
    borrowedAt: toDateInputValue(new Date()),
    dueAt: toDateInputValue(dueDate),
    borrowNotes: "",
  };
};

const createDefaultReturnForm = (): ReturnForm => ({
  returnedAt: toDateInputValue(new Date()),
  returnNotes: "",
});

const normalizeCopySearchCode = (value: string) =>
  value.trim().replace(/^AUC-/i, "").toUpperCase();

const displayCopyCode = (value: string) =>
  value.trim().replace(/^AUC-/i, "").toUpperCase();

const extractCopyCodeFromQrValue = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const copySegmentIndex = pathSegments.findIndex(
      (segment) => segment.toLowerCase() === "copy",
    );
    const copyCode =
      copySegmentIndex >= 0
        ? pathSegments[copySegmentIndex + 1]
        : pathSegments[pathSegments.length - 1];

    return displayCopyCode(decodeURIComponent(copyCode ?? ""));
  } catch {
    const copyPathMatch = trimmedValue.match(/\/copy\/([^/?#]+)/i);
    if (copyPathMatch?.[1]) {
      return displayCopyCode(decodeURIComponent(copyPathMatch[1]));
    }

    return displayCopyCode(trimmedValue);
  }
};

const formatLoanDate = (value: string, lang: string) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : lang, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export default function LoanStationPage({
  initialBooks,
  initialActiveLoans,
  initialCopyCode,
  initialMode,
}: {
  initialBooks: AdminCatalogBook[];
  initialActiveLoans: AdminLoan[];
  initialCopyCode: string;
  initialMode: StationMode;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const copyInputRef = useRef<HTMLInputElement>(null);
  const borrowerNameRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<AdminCatalogBook[]>(initialBooks);
  const [activeLoans, setActiveLoans] =
    useState<AdminLoan[]>(initialActiveLoans);
  const [stationMode, setStationMode] = useState<StationMode>(initialMode);
  const [loanCopySearch, setLoanCopySearch] = useState(
    displayCopyCode(initialCopyCode),
  );
  const [loanForm, setLoanForm] = useState<LoanForm>(createDefaultLoanForm);
  const [returnForm, setReturnForm] = useState<ReturnForm>(
    createDefaultReturnForm,
  );
  const [isCreatingLoan, setIsCreatingLoan] = useState(false);
  const [isReturningLoan, setIsReturningLoan] = useState(false);
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [loanMessage, setLoanMessage] = useState("");
  const [loanError, setLoanError] = useState("");
  const [lastLoan, setLastLoan] = useState<AdminLoan | null>(null);

  const loanCopyOptions = useMemo<LoanCopyOption[]>(
    () =>
      books.flatMap((book) =>
        book.copies.map((copy) => ({
          bookCopyId: copy.id,
          uniqueCode: copy.uniqueCode,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          derivedStatus: copy.derivedStatus,
        })),
      ),
    [books],
  );

  const matchedLoanCopy = useMemo(() => {
    const searchCode = normalizeCopySearchCode(loanCopySearch);
    if (!searchCode) return null;

    return (
      loanCopyOptions.find(
        (copy) => normalizeCopySearchCode(copy.uniqueCode) === searchCode,
      ) ?? null
    );
  }, [loanCopyOptions, loanCopySearch]);

  const selectedAvailableLoanCopy =
    matchedLoanCopy?.derivedStatus === "available" ? matchedLoanCopy : null;
  const selectedReturnLoan = matchedLoanCopy
    ? activeLoans.find(
        (loan) =>
          normalizeCopySearchCode(loan.uniqueCode) ===
          normalizeCopySearchCode(matchedLoanCopy.uniqueCode),
      ) ?? null
    : null;
  const loanCopyNotFound =
    normalizeCopySearchCode(loanCopySearch).length > 0 && !matchedLoanCopy;
  const loanCopyUnavailable =
    Boolean(matchedLoanCopy) && matchedLoanCopy?.derivedStatus !== "available";
  const returnCopyUnavailable =
    Boolean(matchedLoanCopy) && !selectedReturnLoan;

  useEffect(() => {
    setLoanForm((prev) => ({
      ...prev,
      bookCopyId: selectedAvailableLoanCopy?.bookCopyId ?? "",
    }));
  }, [selectedAvailableLoanCopy?.bookCopyId]);

  useEffect(() => {
    if (stationMode === "loan" && selectedAvailableLoanCopy) {
      borrowerNameRef.current?.focus();
      return;
    }

    copyInputRef.current?.focus();
  }, [selectedAvailableLoanCopy, stationMode]);

  const getLoanApiErrorMessage = (
    data: ApiErrorPayload,
    fallbackKey: keyof typeof dictionary.id,
  ) => {
    const codeMap: Record<string, keyof typeof dictionary.id> = {
      LOAN_REQUIRED_FIELDS: "loanRequiredFieldsError",
      LOAN_INVALID_CLASS: "loanInvalidClassError",
      LOAN_INVALID_DUE_DATE: "loanInvalidDueDateError",
      LOAN_COPY_NOT_FOUND: "loanCopyNotFoundMessage",
      LOAN_COPY_UNAVAILABLE: "loanUnavailableMessage",
      LOAN_CREATE_FAILED: "loanCreateError",
      LOAN_INVALID_RETURN_DATE: "loanInvalidReturnDateError",
      LOAN_NOT_FOUND: "loanNotFoundError",
      LOAN_ALREADY_RETURNED: "loanAlreadyReturnedError",
      LOAN_RETURN_FAILED: "loanReturnError",
    };

    return data.code && codeMap[data.code]
      ? t(codeMap[data.code])
      : t(fallbackKey);
  };

  const getStatusBadgeClass = (status: DerivedLoanStatus) => {
    if (status === "available") return "badge-green";
    if (status === "overdue") return "badge-red";
    return "badge-yellow";
  };

  const getStatusLabel = (status: DerivedLoanStatus) => {
    if (status === "available") return t("availableCopies");
    if (status === "overdue") return t("statusOverdue");
    return t("statusLoaned");
  };

  const refreshStationData = async () => {
    const [booksRes, loansRes] = await Promise.all([
      fetch("/api/books"),
      fetch("/api/loans"),
    ]);

    if (!booksRes.ok || !loansRes.ok) {
      throw new Error(t("loanReloadError"));
    }

    setBooks((await booksRes.json()) as AdminCatalogBook[]);
    setActiveLoans((await loansRes.json()) as AdminLoan[]);
  };

  const resetStation = () => {
    setLoanCopySearch("");
    setLoanForm(createDefaultLoanForm());
    setReturnForm(createDefaultReturnForm());
    setLoanError("");
    setLoanMessage("");
    setLastLoan(null);
    copyInputRef.current?.focus();
  };

  const handleModeChange = (nextMode: StationMode) => {
    setStationMode(nextMode);
    setIsQrScannerOpen(false);
    setLoanError("");
    setLoanMessage("");
    setLastLoan(null);
    setLoanForm(createDefaultLoanForm());
    setReturnForm(createDefaultReturnForm());
    window.setTimeout(() => copyInputRef.current?.focus(), 0);
  };

  const handleLockStation = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const next = "/admin/loans/station";
    router.push(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  const handleQrDetected = (rawValue: string) => {
    const copyCode = extractCopyCodeFromQrValue(rawValue);
    setIsQrScannerOpen(false);
    setLoanCopySearch(copyCode);
    setLoanMessage("");
    setLoanError("");
    setLastLoan(null);
  };

  const handleCreateLoan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAvailableLoanCopy) {
      setLoanError(t("loanUnavailableMessage"));
      return;
    }

    setIsCreatingLoan(true);
    setLoanError("");
    setLoanMessage("");
    setLastLoan(null);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...loanForm,
          bookCopyId: selectedAvailableLoanCopy.bookCopyId,
        }),
      });
      const data = (await res.json()) as AdminLoan | ApiErrorPayload;

      if (!res.ok) {
        throw new Error(
          getLoanApiErrorMessage(data as ApiErrorPayload, "loanCreateError"),
        );
      }

      const createdLoan = data as AdminLoan;
      setLastLoan(createdLoan);
      setLoanMessage(t("stationSuccessMessage"));
      setLoanCopySearch("");
      setLoanForm(createDefaultLoanForm());
      await refreshStationData();
      window.setTimeout(() => copyInputRef.current?.focus(), 0);
    } catch (error) {
      setLoanError(error instanceof Error ? error.message : t("loanCreateError"));
    } finally {
      setIsCreatingLoan(false);
    }
  };

  const handleReturnLoan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedReturnLoan) {
      setLoanError(t("stationNoActiveLoanForCopy"));
      return;
    }

    setIsReturningLoan(true);
    setLoanError("");
    setLoanMessage("");
    setLastLoan(null);

    try {
      const res = await fetch(`/api/loans/${selectedReturnLoan.id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnForm),
      });
      const data = (await res.json()) as AdminLoan | ApiErrorPayload;

      if (!res.ok) {
        throw new Error(
          getLoanApiErrorMessage(data as ApiErrorPayload, "loanReturnError"),
        );
      }

      const returnedLoan = data as AdminLoan;
      setLastLoan(returnedLoan);
      setLoanMessage(t("stationReturnSuccessMessage"));
      setLoanCopySearch("");
      setReturnForm(createDefaultReturnForm());
      await refreshStationData();
      window.setTimeout(() => copyInputRef.current?.focus(), 0);
    } catch (error) {
      setLoanError(error instanceof Error ? error.message : t("loanReturnError"));
    } finally {
      setIsReturningLoan(false);
    }
  };

  return (
    <div className={styles.stationPage}>
      <div className={styles.stationControlArea}>
        <button
          type="button"
          className={styles.stationControlToggle}
          onClick={() => setIsStationMenuOpen((current) => !current)}
          aria-label={t("stationControlsToggle")}
          aria-expanded={isStationMenuOpen}
        >
          <Icon name={isStationMenuOpen ? "close" : "lock"} />
        </button>

        {isStationMenuOpen ? (
          <div className={`glass-panel ${styles.stationActions}`}>
            <LanguageSwitcher />
            <Link href="/admin/loans" className={styles.headerButton}>
              <Icon name="assignment_return" />
              {t("stationBackToLoans")}
            </Link>
            <Link href="/admin" className={styles.headerButton}>
              <Icon name="dashboard" />
              {t("openDashboard")}
            </Link>
            <button
              type="button"
              className={`${styles.headerButton} ${styles.lockButton}`}
              onClick={handleLockStation}
            >
              <Icon name="lock" />
              {t("lockStation")}
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.modeSwitch} role="tablist" aria-label={t("stationModeLabel")}>
        <button
          type="button"
          className={`${styles.modeButton} ${
            stationMode === "loan" ? styles.modeButtonActive : ""
          }`}
          onClick={() => handleModeChange("loan")}
        >
          <Icon name="assignment_add" />
          {t("stationLoanMode")}
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${
            stationMode === "return" ? styles.modeButtonActive : ""
          }`}
          onClick={() => handleModeChange("return")}
        >
          <Icon name="assignment_return" />
          {t("stationReturnMode")}
        </button>
      </div>

      {loanError ? (
        <div className={styles.errorNotice}>{loanError}</div>
      ) : null}
      {loanMessage ? (
        <div className={styles.successNotice}>
          <div>
            <strong>
              {stationMode === "return"
                ? t("stationReturnSuccessTitle")
                : t("stationSuccessTitle")}
            </strong>
            <span>{loanMessage}</span>
            {lastLoan ? (
              <span>
                {lastLoan.bookTitle} - {lastLoan.borrowerName}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.noticeButton}
            onClick={resetStation}
          >
            {stationMode === "return"
              ? t("stationNextReturn")
              : t("stationNextLoan")}
          </button>
        </div>
      ) : null}

      <div className={styles.stationGrid}>
        <section className={`glass-panel ${styles.scanPanel}`}>
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon}>
              <Icon name="keyboard" />
            </span>
            <div>
              <h2>{t("stationScanTitle")}</h2>
              <p>{t("stationScanHint")}</p>
            </div>
          </div>

          <input
            ref={copyInputRef}
            className={styles.scanInput}
            value={loanCopySearch}
            onChange={(event) => {
              setLoanCopySearch(event.target.value.toUpperCase());
              setLoanMessage("");
              setLastLoan(null);
            }}
            placeholder={t("loanCopyCodePlaceholder")}
            aria-label={t("loanCopyCode")}
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.scanQrButton}
            onClick={() => setIsQrScannerOpen(true)}
          >
            <Icon name="qr_code_scanner" />
            {t("stationScanQr")}
          </button>

          {isQrScannerOpen ? (
            <CopyQrScanner
              onDetected={handleQrDetected}
              onClose={() => setIsQrScannerOpen(false)}
            />
          ) : null}

          {matchedLoanCopy ? (
            <div
              className={`${styles.copyResult} ${
                (stationMode === "loan"
                  ? loanCopyUnavailable
                  : returnCopyUnavailable)
                  ? styles.copyResultUnavailable
                  : ""
              }`}
            >
              <div>
                <p className={styles.resultKicker}>
                  {stationMode === "loan"
                    ? loanCopyUnavailable
                      ? t("stationUnavailableTitle")
                      : t("stationReadyTitle")
                    : selectedReturnLoan
                      ? t("stationReturnReadyTitle")
                      : t("stationReturnUnavailableTitle")}
                </p>
                <h3>{matchedLoanCopy.title}</h3>
                <p>{matchedLoanCopy.uniqueCode}</p>
              </div>
              <span
                className={`badge ${getStatusBadgeClass(
                  matchedLoanCopy.derivedStatus,
                )} ${styles.statusBadge}`}
              >
                {getStatusLabel(matchedLoanCopy.derivedStatus)}
              </span>
            </div>
          ) : null}

          {loanCopyNotFound ? (
            <p className={styles.fieldFeedback}>{t("loanCopyNotFoundMessage")}</p>
          ) : null}
          {stationMode === "loan" && loanCopyUnavailable ? (
            <p className={styles.fieldFeedback}>{t("loanUnavailableMessage")}</p>
          ) : null}
          {stationMode === "return" && returnCopyUnavailable ? (
            <p className={styles.fieldFeedback}>
              {t("stationNoActiveLoanForCopy")}
            </p>
          ) : null}
        </section>

        {stationMode === "loan" ? (
          <form
            className={`glass-panel ${styles.borrowerPanel}`}
            onSubmit={handleCreateLoan}
          >
            <div className={styles.panelHeading}>
              <span className={styles.panelIcon}>
                <Icon name="person_edit" />
              </span>
              <div>
                <h2>{t("stationBorrowerTitle")}</h2>
                <p>{t("stationBorrowerHint")}</p>
              </div>
            </div>

            <div className={styles.formStack}>
              <div className="form-group">
                <label className="form-label">{t("borrowerName")}</label>
                <input
                  ref={borrowerNameRef}
                  className={styles.borrowerInput}
                  value={loanForm.borrowerName}
                  onChange={(event) =>
                    setLoanForm((prev) => ({
                      ...prev,
                      borrowerName: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("borrowerClass")}</label>
                <CustomSelect
                  buttonClassName={`${styles.borrowerInput} ${styles.borrowerSelect}`}
                  value={loanForm.borrowerClass}
                  onChange={(value) =>
                    setLoanForm((prev) => ({
                      ...prev,
                      borrowerClass: value,
                    }))
                  }
                  ariaLabel={t("borrowerClass")}
                  options={[
                    { value: "", label: t("selectClass") },
                    { value: "Kelas 1", label: t("classOne") },
                    { value: "Kelas 2", label: t("classTwo") },
                  ]}
                />
              </div>

              <div className={styles.dateGrid}>
                <div className="form-group">
                  <label className="form-label">{t("borrowedAtLabel")}</label>
                  <CustomDateInput
                    buttonClassName="form-input"
                    value={loanForm.borrowedAt}
                    onChange={(value) =>
                      setLoanForm((prev) => ({
                        ...prev,
                        borrowedAt: value,
                      }))
                    }
                    ariaLabel={t("borrowedAtLabel")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("dueAtLabel")}</label>
                  <CustomDateInput
                    buttonClassName="form-input"
                    value={loanForm.dueAt}
                    onChange={(value) =>
                      setLoanForm((prev) => ({
                        ...prev,
                        dueAt: value,
                      }))
                    }
                    ariaLabel={t("dueAtLabel")}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t("borrowNotes")}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={loanForm.borrowNotes}
                  onChange={(event) =>
                    setLoanForm((prev) => ({
                      ...prev,
                      borrowNotes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitButton}`}
              disabled={isCreatingLoan || !selectedAvailableLoanCopy}
            >
              <Icon name="assignment_add" />
              {isCreatingLoan ? t("creatingLoan") : t("createLoan")}
            </button>
          </form>
        ) : (
          <form
            className={`glass-panel ${styles.borrowerPanel}`}
            onSubmit={handleReturnLoan}
          >
            <div className={styles.panelHeading}>
              <span className={styles.panelIcon}>
                <Icon name="assignment_return" />
              </span>
              <div>
                <h2>{t("stationReturnTitle")}</h2>
                <p>{t("stationReturnHint")}</p>
              </div>
            </div>

            {selectedReturnLoan ? (
              <div className={styles.loanSummary}>
                <div>
                  <span>{t("borrowerName")}</span>
                  <strong>{selectedReturnLoan.borrowerName}</strong>
                </div>
                <div>
                  <span>{t("borrowerClass")}</span>
                  <strong>
                    {getBorrowerClassLabel(selectedReturnLoan.borrowerClass, t)}
                  </strong>
                </div>
                <div>
                  <span>{t("borrowedAtShortLabel")}</span>
                  <strong>
                    {formatLoanDate(selectedReturnLoan.borrowedAt, lang)}
                  </strong>
                </div>
                <div>
                  <span>{t("dueAtShortLabel")}</span>
                  <strong>{formatLoanDate(selectedReturnLoan.dueAt, lang)}</strong>
                </div>
              </div>
            ) : (
              <div className={styles.emptyReturnState}>
                {t("stationReturnEmptyState")}
              </div>
            )}

            <div className={styles.formStack}>
              <div className="form-group">
                <label className="form-label">{t("returnedAtLabel")}</label>
                <CustomDateInput
                  buttonClassName="form-input"
                  value={returnForm.returnedAt}
                  onChange={(value) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      returnedAt: value,
                    }))
                  }
                  ariaLabel={t("returnedAtLabel")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("returnNotes")}</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={returnForm.returnNotes}
                  onChange={(event) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      returnNotes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitButton}`}
              disabled={isReturningLoan || !selectedReturnLoan}
            >
              <Icon name="assignment_return" />
              {isReturningLoan ? t("returnProcessing") : t("returnAction")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
