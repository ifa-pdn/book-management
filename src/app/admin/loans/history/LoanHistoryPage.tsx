"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CustomSelect from "../../../../components/CustomSelect";
import Icon from "../../../../components/Icon";
import { dictionary, useI18n } from "../../../../contexts/I18nContext";
import type { AdminLoan } from "../../../../lib/adminLoans";
import { getBorrowerClassLabel } from "../../../../lib/borrowerClassLabel";
import styles from "./LoanHistoryPage.module.css";

type HistoryFilter = "all" | "active" | "overdue" | "returned";
type HistorySort =
  | "borrowed_desc"
  | "borrowed_asc"
  | "due_asc"
  | "returned_desc"
  | "borrower_asc"
  | "title_asc";

const filterOptions: HistoryFilter[] = ["all", "active", "overdue", "returned"];
const sortOptions: HistorySort[] = [
  "borrowed_desc",
  "borrowed_asc",
  "due_asc",
  "returned_desc",
  "borrower_asc",
  "title_asc",
];

type NoteDraft = {
  borrowNotes: string;
  returnNotes: string;
};

type ApiErrorPayload = {
  code?: string;
  error?: string;
};

const isReturnedLate = (loan: AdminLoan) =>
  Boolean(loan.returnedAt) &&
  new Date(loan.returnedAt as string).getTime() >
    new Date(loan.dueAt).getTime();

export default function LoanHistoryPage({
  initialLoans,
}: {
  initialLoans: AdminLoan[];
}) {
  const { t, lang } = useI18n();
  const [loans, setLoans] = useState<AdminLoan[]>(initialLoans);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryFilter>("all");
  const [sortOrder, setSortOrder] = useState<HistorySort>("borrowed_desc");
  const [editingNotesLoanId, setEditingNotesLoanId] = useState<string | null>(
    null,
  );
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    borrowNotes: "",
    returnNotes: "",
  });
  const [savingNotesLoanId, setSavingNotesLoanId] = useState<string | null>(null);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteError, setNoteError] = useState("");
  const activeLoanCount = loans.filter(
    (loan) => loan.status !== "returned",
  ).length;
  const overdueLoanCount = loans.filter(
    (loan) => loan.status === "overdue",
  ).length;
  const pageSubtitle = t("loanHistorySub");

  const formatLoanDate = (value: string | null) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat(
      lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "id-ID",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    ).format(new Date(value));
  };

  const getStatusLabel = (loan: AdminLoan) => {
    if (loan.status === "returned") {
      return isReturnedLate(loan) ? t("statusReturnedLate") : t("statusReturned");
    }

    if (loan.status === "overdue") return t("statusOverdue");
    return t("statusLoaned");
  };

  const getFilterLabel = (filter: HistoryFilter) => {
    if (filter === "all") return t("loanHistoryFilterAll");
    if (filter === "active") return t("statusLoaned");
    if (filter === "overdue") return t("statusOverdue");
    return t("statusReturned");
  };

  const getSortLabel = (sort: HistorySort) => {
    if (sort === "borrowed_desc") return t("loanHistorySortBorrowedDesc");
    if (sort === "borrowed_asc") return t("loanHistorySortBorrowedAsc");
    if (sort === "due_asc") return t("loanHistorySortDueAsc");
    if (sort === "returned_desc") return t("loanHistorySortReturnedDesc");
    if (sort === "borrower_asc") return t("loanHistorySortBorrowerAsc");
    return t("loanHistorySortTitleAsc");
  };

  const getLoanApiErrorMessage = (
    data: ApiErrorPayload,
    fallbackKey: keyof typeof dictionary.id,
  ) => {
    const codeMap: Record<string, keyof typeof dictionary.id> = {
      LOAN_NOT_FOUND: "loanNotFoundError",
      LOAN_NOTES_UPDATE_FAILED: "loanNotesUpdateError",
    };

    return data.code && codeMap[data.code]
      ? t(codeMap[data.code])
      : t(fallbackKey);
  };

  const startEditingNotes = (loan: AdminLoan) => {
    setEditingNotesLoanId(loan.id);
    setNoteDraft({
      borrowNotes: loan.borrowNotes,
      returnNotes: loan.returnNotes,
    });
    setNoteError("");
    setNoteMessage("");
  };

  const cancelEditingNotes = () => {
    setEditingNotesLoanId(null);
    setNoteDraft({
      borrowNotes: "",
      returnNotes: "",
    });
    setNoteError("");
  };

  const handleSaveNotes = async (loanId: string) => {
    setSavingNotesLoanId(loanId);
    setNoteError("");
    setNoteMessage("");

    try {
      const res = await fetch(`/api/loans/${loanId}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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
        prev.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan)),
      );
      setEditingNotesLoanId(null);
      setNoteMessage(t("loanNotesUpdatedMessage"));
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : t("loanNotesUpdateError"));
    } finally {
      setSavingNotesLoanId(null);
    }
  };

  const filteredLoans = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return loans
      .filter((loan) => {
        const matchesStatus =
          statusFilter === "all" || loan.status === statusFilter;
        const matchesSearch =
          !query ||
          loan.bookTitle.toLowerCase().includes(query) ||
          loan.uniqueCode.toLowerCase().includes(query) ||
          loan.borrowerName.toLowerCase().includes(query) ||
          loan.borrowerClass.toLowerCase().includes(query) ||
          getBorrowerClassLabel(loan.borrowerClass, t)
            .toLowerCase()
            .includes(query) ||
          loan.isbn.toLowerCase().includes(query);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === "borrowed_asc") {
          return new Date(a.borrowedAt).getTime() - new Date(b.borrowedAt).getTime();
        }

        if (sortOrder === "due_asc") {
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }

        if (sortOrder === "returned_desc") {
          return (
            new Date(b.returnedAt ?? 0).getTime() -
            new Date(a.returnedAt ?? 0).getTime()
          );
        }

        if (sortOrder === "borrower_asc") {
          return a.borrowerName.localeCompare(b.borrowerName);
        }

        if (sortOrder === "title_asc") {
          return a.bookTitle.localeCompare(b.bookTitle);
        }

        return new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime();
      });
  }, [loans, searchInput, sortOrder, statusFilter, t]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">{t("loanHistoryTitle")}</h1>
          {pageSubtitle ? (
            <p className={`page-subtitle ${styles.pageSubtitle}`}>
              {pageSubtitle}
            </p>
          ) : null}
        </div>
        <Link href="/admin/loans" className={`btn ${styles.backLink}`}>
          <Icon name="arrow_back" />
          {t("loanPanelTitle")}
        </Link>
      </div>

      <div className={styles.historyLayout}>
        <div className={styles.resultColumn}>
          <section className={`glass-panel ${styles.historyPanel}`}>
            <div className={styles.summaryPanel}>
              <div className={styles.resultSummary}>
                {filteredLoans.length} / {loans.length} {t("loanHistoryItems")}
              </div>
              <div className={styles.resultBadges}>
                <span className={`badge badge-yellow ${styles.summaryBadge}`}>
                  {t("activeLoansLabel")}: {activeLoanCount}
                </span>
                <span className={`badge badge-red ${styles.summaryBadge}`}>
                  {t("statusOverdue")}: {overdueLoanCount}
                </span>
              </div>
            </div>

            {noteError ? (
              <div className={styles.errorNotice}>{noteError}</div>
            ) : null}
            {noteMessage ? (
              <div className={styles.successNotice}>{noteMessage}</div>
            ) : null}

            <div className={styles.historyList}>
              {filteredLoans.map((loan) => {
                const isEditingNotes = editingNotesLoanId === loan.id;
                const isSavingNotes = savingNotesLoanId === loan.id;

                return (
                  <article key={loan.id} className={styles.historyCard}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2 className={styles.bookTitle}>{loan.bookTitle}</h2>
                        <p className={styles.loanMeta}>
                          {`${loan.uniqueCode} - ${loan.borrowerName} (${getBorrowerClassLabel(loan.borrowerClass, t)})`}
                        </p>
                      </div>
                      <div className={styles.cardActions}>
                        <span
                          className={`badge ${
                            loan.status === "overdue" || isReturnedLate(loan)
                              ? "badge-red"
                              : loan.status === "returned"
                                ? "badge-green"
                                : "badge-yellow"
                          } ${styles.statusBadge}`}
                        >
                          {getStatusLabel(loan)}
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

                  <div className={styles.dateGrid}>
                    <div>
                      {t("borrowedAtShortLabel")}:{" "}
                      <b>{formatLoanDate(loan.borrowedAt)}</b>
                    </div>
                    <div>
                      {t("dueAtShortLabel")}: <b>{formatLoanDate(loan.dueAt)}</b>
                    </div>
                    <div>
                      {t("returnedAtLabel")}:{" "}
                      <b>{formatLoanDate(loan.returnedAt)}</b>
                    </div>
                  </div>

                  <div className={styles.notesGrid}>
                    <div className={styles.noteBox}>
                      <div className={styles.noteHeader}>
                        <div className={styles.noteLabel}>{t("borrowNotes")}</div>
                      </div>
                      {isEditingNotes ? (
                        <textarea
                          className={`form-input ${styles.noteTextarea}`}
                          rows={3}
                          value={noteDraft.borrowNotes}
                          onChange={(event) =>
                            setNoteDraft((prev) => ({
                              ...prev,
                              borrowNotes: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <p>{loan.borrowNotes || "-"}</p>
                      )}
                    </div>
                    <div className={styles.noteBox}>
                      <div className={styles.noteHeader}>
                        <div className={styles.noteLabel}>{t("returnNotes")}</div>
                      </div>
                      {isEditingNotes ? (
                        <textarea
                          className={`form-input ${styles.noteTextarea}`}
                          rows={3}
                          value={noteDraft.returnNotes}
                          onChange={(event) =>
                            setNoteDraft((prev) => ({
                              ...prev,
                              returnNotes: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <p>{loan.returnNotes || "-"}</p>
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
                </article>
                );
              })}

              {filteredLoans.length === 0 ? (
                <div className={styles.emptyState}>{t("noLoanHistory")}</div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className={`glass-panel ${styles.controlPanel}`}>
          <div className={styles.searchPanel}>
            <Icon name="search" size={22} className={styles.searchIcon} />
            <input
              type="text"
              className="form-input"
              placeholder={t("loanHistorySearchPlaceholder")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabel}>
              {t("loanHistoryFilterBy")}
            </div>
            <div className={styles.filterTabs}>
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`${styles.filterButton} ${
                    statusFilter === filter ? styles.filterButtonActive : ""
                  }`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {getFilterLabel(filter)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sortWrap}>
            <label className={`form-label ${styles.sortLabel}`}>
              {t("loanHistorySortBy")}
            </label>
            <CustomSelect
              buttonClassName={`form-input ${styles.sortSelect}`}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as HistorySort)}
              ariaLabel={t("loanHistorySortBy")}
              options={sortOptions.map((sort) => ({
                value: sort,
                label: getSortLabel(sort),
              }))}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
