"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dictionary, useI18n } from "../../../contexts/I18nContext";
import CustomDateInput from "../../../components/CustomDateInput";
import CustomSelect from "../../../components/CustomSelect";
import Icon from "../../../components/Icon";
import type { AdminCatalogBook } from "../../../lib/bookCatalog";
import type { AdminLoan } from "../../../lib/adminLoans";
import { getBorrowerClassLabel } from "../../../lib/borrowerClassLabel";
import styles from "./LoanManagementPage.module.css";

type Book = AdminCatalogBook;

type LoanForm = {
  bookCopyId: string;
  borrowerName: string;
  borrowerClass: string;
  borrowedAt: string;
  dueAt: string;
  borrowNotes: string;
};

type NoteDraft = {
  borrowNotes: string;
  returnNotes: string;
};

type ApiErrorPayload = {
  code?: string;
  error?: string;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
};

const normalizeCopySearchCode = (value: string) =>
  value.trim().replace(/^AUC-/i, "").toUpperCase();

const sortLoans = (items: AdminLoan[]) =>
  [...items].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );

export default function LoanManagementPage({
  initialBooks,
  initialLoans,
}: {
  initialBooks: Book[];
  initialLoans: AdminLoan[];
}) {
  const { t, lang } = useI18n();
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loans, setLoans] = useState<AdminLoan[]>(() =>
    sortLoans(initialLoans),
  );
  const [loanCopySearch, setLoanCopySearch] = useState("");
  const [loanForm, setLoanForm] = useState<LoanForm>({
    bookCopyId: "",
    borrowerName: "",
    borrowerClass: "",
    borrowedAt: toDateInputValue(new Date()),
    dueAt: getDefaultDueDate(),
    borrowNotes: "",
  });
  const [isCreatingLoan, setIsCreatingLoan] = useState(false);
  const [returningLoanId, setReturningLoanId] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const [returnDates, setReturnDates] = useState<Record<string, string>>({});
  const [editingNotesLoanId, setEditingNotesLoanId] = useState<string | null>(
    null,
  );
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    borrowNotes: "",
    returnNotes: "",
  });
  const [savingNotesLoanId, setSavingNotesLoanId] = useState<string | null>(null);
  const [loanMessage, setLoanMessage] = useState("");
  const [loanError, setLoanError] = useState("");
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const overdueLoanCount = loans.filter((loan) => loan.status === "overdue").length;

  const loanCopyOptions = useMemo(
    () =>
      books.flatMap((book) =>
        book.copies.map((copy) => ({
          bookCopyId: copy.id,
          uniqueCode: copy.uniqueCode,
          title: book.title,
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
  const loanCopyNotFound =
    normalizeCopySearchCode(loanCopySearch).length > 0 && !matchedLoanCopy;
  const loanCopyUnavailable =
    Boolean(matchedLoanCopy) && matchedLoanCopy?.derivedStatus !== "available";

  useEffect(() => {
    setLoanForm((prev) => ({
      ...prev,
      bookCopyId: selectedAvailableLoanCopy?.bookCopyId ?? "",
    }));
  }, [selectedAvailableLoanCopy?.bookCopyId]);

  const formatLoanDate = (value: string) =>
    new Intl.DateTimeFormat(
      lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "id-ID",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    ).format(new Date(value));

  const refreshAdminData = async () => {
    const [booksRes, loansRes] = await Promise.all([
      fetch("/api/books"),
      fetch("/api/loans"),
    ]);

    if (!booksRes.ok || !loansRes.ok) {
      throw new Error(t("loanReloadError"));
    }

    const [nextBooks, nextLoans] = (await Promise.all([
      booksRes.json(),
      loansRes.json(),
    ])) as [Book[], AdminLoan[]];

    setBooks(nextBooks);
    setLoans(sortLoans(nextLoans));
  };

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
      LOAN_INVALID_RETURN_DATE: "loanInvalidReturnDateError",
      LOAN_NOT_FOUND: "loanNotFoundError",
      LOAN_ALREADY_RETURNED: "loanAlreadyReturnedError",
      LOAN_CREATE_FAILED: "loanCreateError",
      LOAN_RETURN_FAILED: "loanReturnError",
      LOAN_NOTES_UPDATE_FAILED: "loanNotesUpdateError",
    };

    return data.code && codeMap[data.code]
      ? t(codeMap[data.code])
      : t(fallbackKey);
  };

  const handleCreateLoan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingLoan(true);
    setLoanError("");
    setLoanMessage("");

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loanForm),
      });
      const data = (await res.json()) as AdminLoan | ApiErrorPayload;

      if (!res.ok) {
        throw new Error(
          getLoanApiErrorMessage(data as ApiErrorPayload, "loanCreateError"),
        );
      }

      setLoans((prev) => sortLoans([data as AdminLoan, ...prev]));
      setLoanForm({
        bookCopyId: "",
        borrowerName: "",
        borrowerClass: "",
        borrowedAt: toDateInputValue(new Date()),
        dueAt: getDefaultDueDate(),
        borrowNotes: "",
      });
      setLoanCopySearch("");
      await refreshAdminData();
      setLoanMessage(t("loanCreatedMessage"));
    } catch (err) {
      setLoanError(err instanceof Error ? err.message : t("loanCreateError"));
    } finally {
      setIsCreatingLoan(false);
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    setReturningLoanId(loanId);
    setLoanError("");
    setLoanMessage("");

    try {
      const currentLoan = loans.find((loan) => loan.id === loanId);
      const res = await fetch(`/api/loans/${loanId}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnedAt: returnDates[loanId] || toDateInputValue(new Date()),
          returnNotes: returnNotes[loanId] ?? currentLoan?.returnNotes ?? "",
        }),
      });
      const data = (await res.json()) as AdminLoan | ApiErrorPayload;

      if (!res.ok) {
        throw new Error(
          getLoanApiErrorMessage(data as ApiErrorPayload, "loanReturnError"),
        );
      }

      setLoans((prev) => prev.filter((loan) => loan.id !== loanId));
      setReturnDates((prev) => {
        const next = { ...prev };
        delete next[loanId];
        return next;
      });
      setReturnNotes((prev) => {
        const next = { ...prev };
        delete next[loanId];
        return next;
      });
      await refreshAdminData();
      setLoanMessage(t("loanReturnedMessage"));
    } catch (err) {
      setLoanError(err instanceof Error ? err.message : t("loanReturnError"));
    } finally {
      setReturningLoanId(null);
    }
  };

  const startEditingNotes = (loan: AdminLoan) => {
    setEditingNotesLoanId(loan.id);
    setNoteDraft({
      borrowNotes: loan.borrowNotes,
      returnNotes: returnNotes[loan.id] ?? loan.returnNotes,
    });
    setLoanError("");
    setLoanMessage("");
  };

  const cancelEditingNotes = () => {
    setEditingNotesLoanId(null);
    setNoteDraft({
      borrowNotes: "",
      returnNotes: "",
    });
  };

  const handleSaveNotes = async (loanId: string) => {
    setSavingNotesLoanId(loanId);
    setLoanError("");
    setLoanMessage("");

    try {
      const res = await fetch(`/api/loans/${loanId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteDraft),
      });
      const data = (await res.json()) as AdminLoan | ApiErrorPayload;

      if (!res.ok) {
        throw new Error(
          getLoanApiErrorMessage(data as ApiErrorPayload, "loanNotesUpdateError"),
        );
      }

      const updatedLoan = data as AdminLoan;
      setLoans((prev) =>
        sortLoans(
          prev.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan)),
        ),
      );
      setReturnNotes((prev) => ({
        ...prev,
        [updatedLoan.id]: updatedLoan.returnNotes,
      }));
      setEditingNotesLoanId(null);
      setLoanMessage(t("loanNotesUpdatedMessage"));
    } catch (err) {
      setLoanError(err instanceof Error ? err.message : t("loanNotesUpdateError"));
    } finally {
      setSavingNotesLoanId(null);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">{t("loanPanelTitle")}</h1>
        </div>
        <div className={styles.headerBadges}>
          <span className={`badge ${styles.headerBadge}`}>
            {t("activeLoansLabel")}: {loans.length}
          </span>
          <span className={`badge badge-red ${styles.headerBadge}`}>
            {t("statusOverdue")}: {overdueLoanCount}
          </span>
        </div>
      </div>

      <section className={`glass-panel ${styles.loanPanel}`}>
        <div className={styles.panelToolbar}>
          <Link
            href="/admin/loans/station"
            className={styles.toolbarLink}
          >
            <Icon name="qr_code_scanner" />
            {t("loanStationNav")}
          </Link>
          <Link
            href="/admin/loans/history"
            className={styles.toolbarLink}
          >
            <Icon name="history" />
            {t("loanHistoryNav")}
          </Link>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              refreshAdminData().catch((err) =>
                setLoanError(
                  err instanceof Error ? err.message : t("loanReloadError"),
                ),
              );
            }}
          >
            <Icon name="refresh" />
            {t("refresh")}
          </button>
        </div>

        {loanError ? (
          <div className={styles.errorNotice}>{loanError}</div>
        ) : null}
        {loanMessage ? (
          <div className={styles.successNotice}>{loanMessage}</div>
        ) : null}

        <div className={styles.contentGrid}>
            <form className={styles.formCard} onSubmit={handleCreateLoan}>
              <div className={styles.formCardHeader}>
                <h2 className={styles.cardTitle}>{t("createLoanTitle")}</h2>
                <button
                  type="button"
                  className={styles.formToggleButton}
                  aria-expanded={isLoanFormOpen}
                  onClick={() => setIsLoanFormOpen((prev) => !prev)}
                >
                  <Icon
                    name={isLoanFormOpen ? "expand_less" : "expand_more"}
                  />
                  {isLoanFormOpen ? t("hideLoanPanel") : t("showLoanPanel")}
                </button>
              </div>

              <div
                className={`${styles.formBody} ${
                  isLoanFormOpen ? styles.formBodyOpen : ""
                }`}
              >
                <div className="form-group">
                  <label className="form-label">{t("loanCopyCode")}</label>
                  <input
                    className="form-input"
                    value={loanCopySearch}
                    onChange={(e) => setLoanCopySearch(e.target.value)}
                    placeholder={t("loanCopyCodePlaceholder")}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("loanBookTitle")}</label>
                  <input
                    className="form-input"
                    value={matchedLoanCopy?.title ?? ""}
                    placeholder={t("loanBookTitlePlaceholder")}
                    readOnly
                  />
                  {loanCopyUnavailable ? (
                    <p className={styles.fieldFeedback}>
                      {t("loanUnavailableMessage")}
                    </p>
                  ) : null}
                  {loanCopyNotFound ? (
                    <p className={styles.fieldFeedback}>
                      {t("loanCopyNotFoundMessage")}
                    </p>
                  ) : null}
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">{t("borrowerName")}</label>
                    <input
                      className="form-input"
                      value={loanForm.borrowerName}
                      onChange={(e) =>
                        setLoanForm({
                          ...loanForm,
                          borrowerName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("borrowerClass")}</label>
                    <CustomSelect
                      buttonClassName="form-input"
                      value={loanForm.borrowerClass}
                      onChange={(value) =>
                        setLoanForm({
                          ...loanForm,
                          borrowerClass: value,
                        })
                      }
                      ariaLabel={t("borrowerClass")}
                      options={[
                        { value: "", label: t("selectClass") },
                        { value: "Kelas 1", label: t("classOne") },
                        { value: "Kelas 2", label: t("classTwo") },
                      ]}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">{t("borrowedAtLabel")}</label>
                    <CustomDateInput
                      buttonClassName="form-input"
                      value={loanForm.borrowedAt}
                      onChange={(value) =>
                        setLoanForm({ ...loanForm, borrowedAt: value })
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
                        setLoanForm({ ...loanForm, dueAt: value })
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
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, borrowNotes: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary ${styles.submitButton}`}
                  disabled={isCreatingLoan || !selectedAvailableLoanCopy}
                >
                  <Icon name="assignment_add" />
                  {isCreatingLoan ? t("creatingLoan") : t("createLoan")}
                </button>
              </div>
            </form>

            <div className={styles.activeLoansCard}>
              <h2 className={styles.cardTitle}>{t("activeLoansTitle")}</h2>
              <div className={styles.loanList}>
                {loans.map((loan) => {
                  const isEditingNotes = editingNotesLoanId === loan.id;
                  const isSavingNotes = savingNotesLoanId === loan.id;
                  const displayReturnNotes =
                    returnNotes[loan.id] ?? loan.returnNotes;

                  return (
                    <div
                    key={loan.id}
                    className={`${styles.loanCard} ${
                      loan.status === "overdue" ? styles.loanCardOverdue : ""
                    }`}
                  >
                    <div className={styles.loanCardHeader}>
                      <div className={styles.loanBookInfo}>
                        <div className={styles.loanBookTitle}>
                          {loan.bookTitle}
                        </div>
                        <div className={styles.loanMeta}>
                          {`${loan.uniqueCode} - ${loan.borrowerName} (${getBorrowerClassLabel(loan.borrowerClass, t)})`}
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <span
                          className={`${
                            loan.status === "overdue"
                              ? "badge badge-red"
                              : "badge badge-yellow"
                          } ${styles.statusBadge}`}
                        >
                          {loan.status === "overdue"
                            ? t("statusOverdue")
                            : t("statusLoaned")}
                        </span>
                        {!editingNotesLoanId ? (
                          <button
                            type="button"
                            className={styles.noteIconButton}
                            onClick={() => startEditingNotes(loan)}
                            title={t("editNotes")}
                            aria-label={`${t("editNotes")}: ${loan.bookTitle}`}
                          >
                            <Icon name="edit_note" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.loanDateGrid}>
                      <div>
                        {t("borrowedAtShortLabel")}:{" "}
                        {formatLoanDate(loan.borrowedAt)}
                      </div>
                      <div>
                        {t("dueAtShortLabel")}: {formatLoanDate(loan.dueAt)}
                      </div>
                    </div>

                    <div className={styles.notesGrid}>
                      <div className={styles.noteBox}>
                        <div className={styles.noteHeader}>
                          <span className={styles.noteLabel}>
                            {t("borrowNotes")}
                          </span>
                        </div>
                        {isEditingNotes ? (
                          <textarea
                            className={`form-input ${styles.noteTextarea}`}
                            rows={3}
                            value={noteDraft.borrowNotes}
                            onChange={(e) =>
                              setNoteDraft((prev) => ({
                                ...prev,
                                borrowNotes: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p>{loan.borrowNotes || "-"}</p>
                        )}
                      </div>

                      <div className={styles.noteBox}>
                        <div className={styles.noteHeader}>
                          <span className={styles.noteLabel}>
                            {t("returnNotes")}
                          </span>
                        </div>
                        {isEditingNotes ? (
                          <textarea
                            className={`form-input ${styles.noteTextarea}`}
                            rows={3}
                            value={noteDraft.returnNotes}
                            onChange={(e) =>
                              setNoteDraft((prev) => ({
                                ...prev,
                                returnNotes: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p>{displayReturnNotes || "-"}</p>
                        )}
                      </div>
                    </div>

                    {isEditingNotes ? (
                      <div className={styles.noteActions}>
                        <button
                          type="button"
                          className={`btn btn-primary ${styles.noteActionButton}`}
                          disabled={isSavingNotes}
                          onClick={() => handleSaveNotes(loan.id)}
                        >
                          <Icon name="save" />
                          {isSavingNotes ? t("saving") : t("saveNotes")}
                        </button>
                        <button
                          type="button"
                          className={`btn ${styles.noteActionButton} ${styles.secondaryButton}`}
                          disabled={isSavingNotes}
                          onClick={cancelEditingNotes}
                        >
                          <Icon name="close" />
                          {t("cancelEdit")}
                        </button>
                      </div>
                    ) : null}

                    <div className={styles.returnGrid}>
                      <div>
                        <label className="form-label">
                          {t("returnedAtLabel")}
                        </label>
                        <CustomDateInput
                          buttonClassName="form-input"
                          value={
                            returnDates[loan.id] || toDateInputValue(new Date())
                          }
                          onChange={(value) =>
                            setReturnDates((prev) => ({
                              ...prev,
                              [loan.id]: value,
                            }))
                          }
                          ariaLabel={t("returnedAtLabel")}
                        />
                      </div>
                      <button
                        type="button"
                        className={`btn btn-primary ${styles.returnButton}`}
                        onClick={() => handleReturnLoan(loan.id)}
                        disabled={returningLoanId === loan.id || isEditingNotes}
                      >
                        <Icon name="assignment_return" />
                        {returningLoanId === loan.id
                          ? t("returnProcessing")
                          : t("returnAction")}
                      </button>
                    </div>
                  </div>
                  );
                })}
                {loans.length === 0 ? (
                  <div className={styles.emptyState}>{t("noActiveLoans")}</div>
                ) : null}
              </div>
            </div>
        </div>
      </section>
    </div>
  );
}
