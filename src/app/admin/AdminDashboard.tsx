"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useI18n, dictionary } from "../../contexts/I18nContext";
import { QRCodeSVG } from "qrcode.react";
import CustomCombobox from "../../components/CustomCombobox";
import CustomDateInput from "../../components/CustomDateInput";
import CustomSelect from "../../components/CustomSelect";
import { useDialog } from "../../components/DialogProvider";
import Icon from "../../components/Icon";
import type { AdminCatalogBook } from "../../lib/bookCatalog";
import type { AdminLoan } from "../../lib/adminLoans";
import styles from "./AdminDashboard.module.css";

const CATEGORIES = [
  "HTML CSS",
  "Programming",
  "Design",
  "WordPress",
  "Adobe",
  "Kentei",
  "Office",
];
const SIZES = ["A4", "A5", "B5", "B5 変形", "B6", "四六判", "文庫"];
type TranslationMap = typeof dictionary.id;

interface EditableBookCopy {
  uniqueCode: string;
  condition: string;
  location: string;
}

interface SelectedPrintCopy {
  isbn: string;
  title: string;
  uniqueCode: string;
}

type Book = AdminCatalogBook;

type PrintableLabelsProps = {
  copies: SelectedPrintCopy[];
};

export default function Dashboard({
  initialBooks,
  initialLoans,
}: {
  initialBooks: Book[];
  initialLoans: AdminLoan[];
}) {
  const { t, lang } = useI18n();
  const dialog = useDialog();
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const loading = false;
  const error = "";

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState<Partial<Book>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState("");
  const [editCopies, setEditCopies] = useState<EditableBookCopy[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editionInt, setEditionInt] = useState(1);
  const [printingInt, setPrintingInt] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]); // Menyimpan daftar ISBN yang diceklis
  const [reviewBooks, setReviewBooks] = useState<Book[]>([]);
  const [selectedPrintCopies, setSelectedPrintCopies] = useState<
    SelectedPrintCopy[]
  >([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [expandedCopyBooks, setExpandedCopyBooks] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const overdueLoanCount = initialLoans.filter(
    (loan) => loan.status === "overdue",
  ).length;

  const getTrans = (prefix: string, key: string) => {
    const translatedKey = `${prefix}_${key}` as keyof TranslationMap;
    return dictionary[lang][translatedKey] || key;
  };

  const enSuffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return n + "th";
    switch (n % 10) {
      case 1:
        return n + "st";
      case 2:
        return n + "nd";
      case 3:
        return n + "rd";
      default:
        return n + "th";
    }
  };

  const formatDynamic = (
    text: string,
    type: "edition" | "printing",
    l: string,
  ) => {
    if (!text || text === "-") return "-";
    let num = parseInt(text.replace(/[^\d]/g, ""));
    if (isNaN(num)) {
      if (
        text.includes("初") ||
        text.includes("1st") ||
        text.toLowerCase().includes("pertama")
      )
        num = 1;
      else num = 1;
    }

    if (type === "edition") {
      if (l === "ja") return num === 1 ? "初版" : `第${num}版`;
      if (l === "en") return enSuffix(num);
      return `Ke-${num}`;
    } else {
      if (l === "ja") return `第${num}刷`;
      if (l === "en") return enSuffix(num);
      return `Ke-${num}`;
    }
  };

  useEffect(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  useEffect(() => {
    if (!isPrintModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPrintModalOpen]);

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  };

  const handleDeleteBook = async (isbn: string, title: string) => {
    if (
      !(await dialog.confirm(
        `Yakin ingin menghapus SEMUA data buku "${title}" beserta semua kopinya dari sistem?`,
      ))
    )
      return;
    try {
      const res = await fetch(`/api/books?isbn=${isbn}`, { method: "DELETE" });
      if (res.ok) setBooks(books.filter((b) => b.isbn !== isbn));
    } catch {
      await dialog.alert("Gagal menghapus buku");
    }
  };

  const handleDeleteCopy = async (isbn: string, copyId: string) => {
    if (!(await dialog.confirm(`Hapus eksemplar fisik dengan kode ${copyId}?`)))
      return;
    try {
      const res = await fetch(`/api/books?copyId=${copyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBooks(
          books.map((b) => {
            if (b.isbn === isbn) {
              return {
                ...b,
                copies: b.copies.filter((c) => c.uniqueCode !== copyId),
              };
            }
            return b;
          }),
        );
      }
    } catch {
      await dialog.alert("Gagal menghapus eksemplar");
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No Canvas Context");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject("Canvas is empty");
              const newFile = new File([blob], "compressed.webp", {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(newFile);
            },
            "image/webp",
            0.8,
          );
        };
        img.onerror = () => reject(new Error("Image load failed"));
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
    });
  };

  const handleEditClick = (book: Book) => {
    setEditingBook(book);
    setEditForm({ ...book });
    setEditPreview(book.coverUrl || "");
    setEditFile(null);
    setEditCopies(
      book.copies.map((copy) => ({
        uniqueCode: copy.uniqueCode,
        location: copy.location || "Kantor",
        condition: copy.condition || "Baru",
      })),
    );

    // Parse edition/printing ints
    const eInt = parseInt(book.edition.replace(/[^\d]/g, "")) || 1;
    const pInt = parseInt(book.printing.replace(/[^\d]/g, "")) || 1;
    setEditionInt(eInt);
    setPrintingInt(pInt);

    setIsEditModalOpen(true);
  };

  const handleUpdateBook = async () => {
    setIsUpdating(true);
    try {
      let finalCover = editForm.coverUrl;

      if (editFile) {
        const fd = new FormData();
        fd.append("file", editFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload cover image.");
        const uploadData = await uploadRes.json();
        finalCover = uploadData.url;
      }

      // Re-format edition/printing based on current ints and lang
      // Note: We'll use formatting consistent with add page
      const formatEditionStr = (num: number, l: string) => {
        if (l === "ja") return num === 1 ? "初版" : `第${num}版`;
        if (l === "en") return enSuffix(num);
        return `Ke-${num}`;
      };
      const formatPrintingStr = (num: number, l: string) => {
        if (l === "ja") return `第${num}刷`;
        if (l === "en") return enSuffix(num);
        return `Ke-${num}`;
      };

      const res = await fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          coverUrl: finalCover,
          edition: formatEditionStr(editionInt, lang),
          printing: formatPrintingStr(printingInt, lang),
          copies: editCopies,
        }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui buku");

      const updated = (await res.json()) as Book;
      setBooks(
        books.map((b) => (b.isbn === updated.isbn ? { ...b, ...updated } : b)),
      );
      setIsEditModalOpen(false);
    } catch (error) {
      await dialog.alert(
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredBooks = books
    .filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        b.title.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        (b.author || "").toLowerCase().includes(q) ||
        b.copies.some((c) => c.uniqueCode.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(b.category);

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title);
      if (sortOrder === "stock_desc") return b.copies.length - a.copies.length;
      if (sortOrder === "stock_asc") return a.copies.length - b.copies.length;
      if (sortOrder === "category") return a.category.localeCompare(b.category);
      if (sortOrder === "pub_date")
        return (b.publishDate || "").localeCompare(a.publishDate || "");
      return 0; // "latest" uses original order from API (updatedAt desc)
    });

  const visibleBookIds = filteredBooks.map((book) => book.isbn);
  const visibleSelectedCount = visibleBookIds.filter((id) =>
    selectedBooks.includes(id),
  ).length;
  const allVisibleSelected =
    visibleBookIds.length > 0 && visibleSelectedCount === visibleBookIds.length;
  const hasVisibleSelection = visibleSelectedCount > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        hasVisibleSelection && !allVisibleSelected;
    }
  }, [hasVisibleSelection, allVisibleSelected]);

  const handleToggleSelectAll = () => {
    if (!visibleBookIds.length) return;

    if (allVisibleSelected) {
      setSelectedBooks((prev) => prev.filter((id) => !visibleBookIds.includes(id)));
      return;
    }

    setSelectedBooks((prev) => [...new Set([...prev, ...visibleBookIds])]);
  };

  const toggleCopyList = (isbn: string) => {
    setExpandedCopyBooks((prev) =>
      prev.includes(isbn)
        ? prev.filter((bookIsbn) => bookIsbn !== isbn)
        : [...prev, isbn],
    );
  };

  const getBulkStatusText = () => {
    if (lang === "en") {
      return `${selectedBooks.length} books selected, ${visibleSelectedCount} of ${visibleBookIds.length} visible`;
    }

    if (lang === "ja") {
      return `${selectedBooks.length}冊を選択中、表示中 ${visibleBookIds.length}冊のうち${visibleSelectedCount}冊`;
    }

    return `${selectedBooks.length} buku dipilih, ${visibleSelectedCount} dari ${visibleBookIds.length} sedang terlihat`;
  };

  const openPrintReview = (booksForReview: Book[]) => {
    const defaultSelectedCopies = booksForReview.flatMap((book) =>
      book.copies.map((copy) => ({
        isbn: book.isbn,
        title: book.title,
        uniqueCode: copy.uniqueCode,
      })),
    );

    setReviewBooks(booksForReview);
    setSelectedPrintCopies(defaultSelectedCopies);
    setIsReviewModalOpen(true);
  };

  const togglePrintCopy = (book: Book, uniqueCode: string, checked: boolean) => {
    setSelectedPrintCopies((prev) => {
      if (checked) {
        return [
          ...prev,
          {
            isbn: book.isbn,
            title: book.title,
            uniqueCode,
          },
        ];
      }

      return prev.filter((copy) => copy.uniqueCode !== uniqueCode);
    });
  };

  return (
    <div
      className={`${styles.dashboardTheme} ${
        isPrintModalOpen ? styles.printing : ""
      }`}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">{t("inventoryTitle")}</h1>
        </div>
        <div className={styles.headerBadges}>
          <span className={`badge ${styles.badgeReset}`}>
            {t("activeLoansLabel")}: {initialLoans.length}
          </span>
          <span className={`badge badge-red ${styles.badgeReset}`}>
            {t("statusOverdue")}: {overdueLoanCount}
          </span>
        </div>
      </div>

      <div className={styles.searchStack}>
        <div className={styles.searchForm}>
          <div
            className={`glass-panel ${styles.searchPanel}`}
          >
            <Icon name="search" size={22} className={styles.searchIcon} />
            <input
              type="text"
              className="form-input"
              placeholder={t("searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.actionRow}>
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (isBulkMode) setSelectedBooks([]);
            }}
            className={`btn no-print ${styles.toolbarButton} ${
              isBulkMode ? styles.toolbarButtonActive : ""
            }`}
          >
            <Icon name="print" />
            {t("printBulk")}
          </button>
          <a
            href={`/api/books/export?lang=${lang}`}
            className={`btn ${styles.toolbarLink}`}
          >
            <Icon name="download" />
            {t("exportCsv")}
          </a>
        </div>
      </div>

      <div
        className={`glass-panel ${styles.filterPanel}`}
      >
        <div className={styles.filterBar}>
          <div className={styles.filterTags}>
            <div
              className={`tag ${styles.filterTag} ${selectedCategories.length === 0 ? "selected" : ""}`}
              onClick={() => setSelectedCategories([])}
            >
              {t("filterAll")}
            </div>
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`tag ${styles.filterTag} ${selectedCategories.includes(cat) ? "selected" : ""}`}
                onClick={() => toggleCategoryFilter(cat)}
              >
                {cat}
              </div>
            ))}
          </div>

          <div className={styles.sortWrap}>
            <label
              className={`form-label ${styles.sortLabel}`}
            >
              {t("sortBy")}
            </label>
            <CustomSelect
              buttonClassName={`form-input ${styles.sortSelect}`}
              value={sortOrder}
              onChange={setSortOrder}
              ariaLabel={t("sortBy")}
              options={[
                { value: "latest", label: t("sortLatest") },
                { value: "title", label: t("sortTitle") },
                { value: "pub_date", label: t("sortPubDate") },
                { value: "stock_desc", label: t("sortStockDesc") },
                { value: "stock_asc", label: t("sortStockAsc") },
                { value: "category", label: "Kategori (A-Z)" },
              ]}
            />
          </div>
        </div>
      </div>

      {isBulkMode && (
        <div
          className={`glass-panel ${styles.bulkToolbar}`}
        >
          <div className={styles.bulkInfo}>
            <label className={`${styles.bulkCheckbox} no-print`}>
              <input
                ref={selectAllRef}
                type="checkbox"
                className={styles.bulkCheckboxInput}
                checked={allVisibleSelected}
                onChange={handleToggleSelectAll}
                disabled={visibleBookIds.length === 0}
              />
              <span className={styles.bulkCheckboxLabel}>{t("selectAll")}</span>
            </label>

            <span className={styles.bulkStatus}>
              {getBulkStatusText()}
            </span>
          </div>

          <div className={styles.bulkActions}>
            <button
              onClick={() => setSelectedBooks([])}
              className={`btn ${styles.whiteButton}`}
            >
              {t("clearSelection")}
            </button>
            <button
              onClick={() => {
                const bks = books.filter((b) => selectedBooks.includes(b.isbn));
                openPrintReview(bks);
              }}
              disabled={selectedBooks.length === 0}
              className={`btn btn-primary ${styles.inlineIconButton} ${
                selectedBooks.length === 0 ? styles.disabledButton : ""
              }`}
            >
              <Icon name="print" />
              {t("printSelected")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>{t("loading")}</p>
      ) : error ? (
        <div className={`glass-panel ${styles.errorPanel}`}>
          {error}
        </div>
      ) : (
        <div className={styles.bookGrid}>
          {filteredBooks.map((book) => {
            const isCopyListCollapsible = book.copies.length > 1;
            const isCopyListExpanded =
              !isCopyListCollapsible || expandedCopyBooks.includes(book.isbn);

            return (
              <div className={styles.bookCard} key={book.isbn}>
                <div className={styles.bookMain}>
	                <div className={styles.bookCover}>
	                  {book.coverUrl ? (
	                    <div className={styles.coverFrame}>
	                      <Image
	                        src={book.coverUrl}
	                        alt="Cover"
	                        fill
	                        unoptimized
	                        className={styles.coverImage}
	                      />
	                    </div>
	                  ) : (
	                    <div className={styles.noCover}>
	                      {t("noCover")}
	                    </div>
	                  )}
                </div>

                <div className={styles.bookInfo}>
                  <div className={styles.bookTitle}>{book.title}</div>
                  <div className={styles.bookMeta}>
                    {book.author} • {book.publisher}
                  </div>
	                  <div
	                    className={`${styles.bookMeta} ${styles.isbnMeta}`}
	                  >
                    ISBN: {book.isbn}
                  </div>

                  {(book.edition ||
                    book.printing ||
                    book.publishDate ||
                    book.size) && (
	                    <div className={styles.bookDetailGrid}>
                      <div>
                        {t("edition")}:{" "}
                        <b>{formatDynamic(book.edition, "edition", lang)}</b>
                      </div>
                      <div>
                        {t("printing")}:{" "}
                        <b>{formatDynamic(book.printing, "printing", lang)}</b>
                      </div>
                      <div>
                        {t("pubDate")}: <b>{book.publishDate || "-"}</b>
                      </div>
                      <div>
                        {t("size")}: <b>{book.size || "-"}</b>
                      </div>
                    </div>
                  )}

	                  <div className={styles.badgeList}>
	                    <span className={`badge ${styles.summaryBadge}`}>
	                      {t("totalCopies")}: {book.totalCopies ?? book.copies.length}
	                    </span>
	                    <span className={`badge badge-green ${styles.summaryBadge}`}>
	                      {t("availableCopies")}: {book.availableCopies ?? book.copies.length}
	                    </span>
	                    {(book.overdueCopies ?? 0) > 0 ? (
	                      <span className={`badge badge-red ${styles.summaryBadge}`}>
	                        {t("statusOverdue")}: {book.overdueCopies}
	                      </span>
                    ) : null}
                  </div>

                  <div className={styles.copyListBlock}>
                    {isCopyListCollapsible ? (
                      <button
                        type="button"
                        className={styles.copyToggleButton}
                        aria-expanded={isCopyListExpanded}
                        onClick={() => toggleCopyList(book.isbn)}
                      >
                        <Icon
                          name={
                            isCopyListExpanded
                              ? "expand_less"
                              : "expand_more"
                          }
                        />
                        {isCopyListExpanded ? t("hideCopies") : t("showCopies")}
                      </button>
                    ) : null}
                    {isCopyListExpanded ? book.copies.map((copy) => (
	                      <div
	                        key={copy.uniqueCode}
	                        className={styles.copyRow}
	                      >
	                        <span className={`badge ${styles.copyBadge}`}>
                            {copy.uniqueCode}
                          </span>
	                        {copy.derivedStatus === "overdue" ? (
	                          <span className={`badge badge-red ${styles.copyBadge}`}>
	                            {t("statusOverdue")}
	                          </span>
	                        ) : copy.derivedStatus === "loaned" ? (
	                          <span className={`badge ${styles.copyBadge} ${styles.loanedBadge}`}>
	                            {t("statusLoaned")}
	                          </span>
	                        ) : (
	                          <span className={`badge badge-green ${styles.copyBadge}`}>
	                            {t("availableCopies")}
	                          </span>
	                        )}
	                        <span
	                          className={`badge badge-green ${styles.copyBadge} ${styles.neutralBadge}`}
	                        >
                          {getTrans("loc", copy.location)}
                        </span>
	                        <span
	                          className={`badge badge-red ${styles.copyBadge} ${styles.neutralBadge}`}
	                        >
                          {getTrans("cond", copy.condition)}
                        </span>
	                        <button
                          onClick={() =>
                            handleDeleteCopy(book.isbn, copy.uniqueCode)
                          }
	                          className={styles.copyDeleteButton}
                          title="Hapus Copy Ini"
                          aria-label="Hapus Copy Ini"
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    )) : null}
                    {book.copies.length === 0 && (
	                      <span className={styles.emptyCopiesText}>
                        Semua fisik telah dihapus.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
	                <div className={styles.bulkCell}>
                  {isBulkMode && (
                    <label className={`${styles.bulkCheckbox} no-print`}>
                      <input
                        type="checkbox"
                        className={styles.bulkCheckboxInput}
                        checked={selectedBooks.includes(book.isbn)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBooks((prev) => [...prev, book.isbn]);
                          } else {
                            setSelectedBooks((prev) =>
                              prev.filter((id) => id !== book.isbn),
                            );
                          }
                        }}
                      />
                      <span className={styles.bulkCheckboxLabel}>
                        {t("printLabel")}
                      </span>
                    </label>
                  )}
                </div>

	                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleEditClick(book)}
	                    className={styles.cardIconButton}
                    title={t("editBook")}
                    aria-label={t("editBook")}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    onClick={() => {
                      openPrintReview([book]);
                    }}
	                    className={styles.cardIconButton}
                    title={t("printLabel")}
                    aria-label={t("printLabel")}
                  >
                    <Icon name="print" />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.isbn, book.title)}
	                    className={styles.cardIconButton}
                    title={t("deleteBook")}
                    aria-label={t("deleteBook")}
                  >
                    <Icon name="delete" />
                  </button>
	                </div>
              </div>
            </div>
            );
          })}
          {filteredBooks.length === 0 && (
	            <p className={styles.emptyText}>{t("noBooks")}</p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className={styles.modalBackdrop}>
          <div
            className={`glass-panel ${styles.editModalPanel}`}
          >
            <div className={styles.modalHeaderLarge}>
              <h2 className={styles.modalTitle}>
                {t("editTitlePrefix")}: {editingBook?.title}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={styles.modalIconButton}
                aria-label="Close edit modal"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className={styles.editGrid}>
              <div>
                <div className={styles.editCoverBox}>
                  {editPreview ? (
                    <div className={styles.editCoverFrame}>
                      <Image
                        src={editPreview}
                        alt="Preview"
                        fill
                        unoptimized
                        className={styles.editCoverImage}
                      />
                    </div>
                  ) : (
                    <span>No Preview</span>
                  )}
                </div>
                <label
                  className={`btn ${styles.editUploadLabel}`}
                >
                  {t("uploadBtn")}
                  <input
                    type="file"
                    className={styles.hiddenInput}
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const f = e.target.files[0];
                        setEditPreview(URL.createObjectURL(f));
                        const comp = await compressImage(f);
                        setEditFile(comp);
                      }
                    }}
                  />
                </label>
              </div>

              <div className={styles.modalFormStack}>
                <div className="form-group">
                  <label className="form-label">{t("title")}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />
                </div>
                <div className={styles.twoColumnGrid}>
                  <div className="form-group">
                    <label className="form-label">{t("author")}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.author}
                      onChange={(e) =>
                        setEditForm({ ...editForm, author: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("publisher")}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.publisher}
                      onChange={(e) =>
                        setEditForm({ ...editForm, publisher: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className={styles.twoColumnGrid}>
                  <div className="form-group">
                    <label className="form-label">{t("pubDate")}</label>
                    <CustomDateInput
                      value={editForm.publishDate ?? ""}
                      displayValue={editForm.publishDate ?? ""}
                      placeholder="e.g. 2012/03/08"
                      ariaLabel={t("pubDate")}
                      buttonClassName="form-input"
                      onChange={(value) =>
                        setEditForm({
                          ...editForm,
                          publishDate: value.replace(/-/g, "/"),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("size")}</label>
                    <CustomCombobox
                      inputClassName="form-input"
                      value={editForm.size ?? ""}
                      onChange={(value) =>
                        setEditForm({ ...editForm, size: value })
                      }
                      options={SIZES}
                      placeholder="e.g. B5"
                      ariaLabel={t("size")}
                    />
                  </div>
                </div>

                <div className={styles.twoColumnGrid}>
                  <div>
                    <label className="form-label">{t("edition")}</label>
                    <div className={styles.counterControlSmall}>
                      <button
                        className={`btn ${styles.counterSmallButton}`}
                        onClick={() => setEditionInt((e) => Math.max(1, e - 1))}
                      >
                        -
                      </button>
                      <div className={styles.counterSmallValue}>
                        {editionInt}
                      </div>
                      <button
                        className={`btn ${styles.counterSmallButton}`}
                        onClick={() => setEditionInt((e) => e + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t("printing")}</label>
                    <div className={styles.counterControlSmall}>
                      <button
                        className={`btn ${styles.counterSmallButton}`}
                        onClick={() =>
                          setPrintingInt((e) => Math.max(1, e - 1))
                        }
                      >
                        -
                      </button>
                      <div className={styles.counterSmallValue}>
                        {printingInt}
                      </div>
                      <button
                        className={`btn ${styles.counterSmallButton}`}
                        onClick={() => setPrintingInt((e) => e + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("category")}</label>
                  <CustomSelect
                    buttonClassName="form-input"
                    value={editForm.category ?? CATEGORIES[0]}
                    onChange={(value) =>
                      setEditForm({ ...editForm, category: value })
                    }
                    ariaLabel={t("category")}
                    options={CATEGORIES.map((category) => ({
                      value: category,
                      label: category,
                    }))}
                  />
                </div>

                <div className={`form-group ${styles.noMargin}`}>
                  <label className="form-label">{t("copiesSection")}</label>
                  <div className={styles.editCopiesList}>
                    {editCopies.map((copy, index) => (
                      <div
                        key={copy.uniqueCode}
                        className={styles.editCopyCard}
                      >
                        <div className={styles.editCopyCode}>
                          {copy.uniqueCode}
                        </div>
                        <div className={styles.twoColumnGrid}>
                          <div>
                            <label className="form-label">{t("location")}</label>
                            <CustomSelect
                              buttonClassName="form-input"
                              value={copy.location}
                              onChange={(value) =>
                                setEditCopies((prev) =>
                                  prev.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, location: value }
                                      : item,
                                  ),
                                )
                              }
                              ariaLabel={t("location")}
                              options={[
                                { value: "Kantor", label: getTrans("loc", "Kantor") },
                                { value: "Kelas", label: getTrans("loc", "Kelas") },
                              ]}
                            />
                          </div>
                          <div>
                            <label className="form-label">{t("condition")}</label>
                            <CustomSelect
                              buttonClassName="form-input"
                              value={copy.condition}
                              onChange={(value) =>
                                setEditCopies((prev) =>
                                  prev.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, condition: value }
                                      : item,
                                  ),
                                )
                              }
                              ariaLabel={t("condition")}
                              options={[
                                { value: "Baru", label: getTrans("cond", "Baru") },
                                { value: "Bekas", label: getTrans("cond", "Bekas") },
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              className={`btn btn-primary ${styles.updateButton}`}
              onClick={handleUpdateBook}
              disabled={isUpdating}
            >
              {isUpdating ? t("saving") : t("updateBook")}
            </button>
          </div>
        </div>
      )}

      {isReviewModalOpen && (
        <div className={styles.modalBackdrop}>
          <div
            className={`glass-panel ${styles.reviewModalPanel}`}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{t("reviewLabels")}</h2>
                <p className={styles.modalSubtext}>
                  {t("chooseLabelsToPrint")}
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className={styles.modalIconButton}
                aria-label="Close review modal"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className={styles.reviewBookList}>
              {reviewBooks.map((book) => (
                <div
                  key={book.isbn}
                  className={styles.reviewBookCard}
                >
                  <div className={styles.reviewBookTitle}>
                    {book.title}
                  </div>
                  <div className={styles.reviewBookMeta}>
                    ISBN: {book.isbn}
                  </div>

                  <div className={styles.reviewCopyList}>
                    {book.copies.map((copy) => {
                      const isChecked = selectedPrintCopies.some(
                        (selectedCopy) =>
                          selectedCopy.uniqueCode === copy.uniqueCode,
                      );

                      return (
                        <label
                          key={copy.uniqueCode}
                          className={styles.reviewCopyOption}
                        >
                          <div className={styles.reviewCopyMain}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                togglePrintCopy(book, copy.uniqueCode, e.target.checked)
                              }
                              className={styles.reviewCheckbox}
                            />
                            <span className={styles.reviewCopyCode}>
                              {copy.uniqueCode}
                            </span>
                          </div>

                          <div className={styles.reviewCopyBadges}>
                            <span
                              className={`badge badge-green ${styles.neutralBadge}`}
                            >
                              {getTrans("loc", copy.location)}
                            </span>
                            <span
                              className={`badge badge-red ${styles.neutralBadge}`}
                            >
                              {getTrans("cond", copy.condition)}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.reviewFooter}>
              <div className={styles.selectedLabelCount}>
                {selectedPrintCopies.length} {t("labels")}
              </div>

              <div className={styles.reviewActions}>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className={`btn ${styles.secondaryButton}`}
                  aria-label="Close review modal"
                >
                  <Icon name="close" />
                </button>
                <button
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  className={`btn btn-primary ${
                    selectedPrintCopies.length === 0 ? styles.disabledButton : ""
                  }`}
                  disabled={selectedPrintCopies.length === 0}
                >
                  {t("continueToPreview")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && selectedPrintCopies.length > 0 && (
        <div
          className={styles.printArea}
        >
          <div
            className={`no-print ${styles.printToolbar}`}
          >
            <h2 className={styles.printTitle}>
              {t("printLabel")} ({selectedPrintCopies.length} {t("labels")})
            </h2>
            <div className={styles.printActions}>
              <button
                onClick={() => window.print()}
                className={`btn btn-primary ${styles.printButton}`}
              >
                <Icon name="print" />
                {t("printAll")}
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className={`btn ${styles.printCloseButton}`}
                aria-label="Close print preview"
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          {/* Area ini saja yang akan tercetak tanpa batas */}
          <div className={styles.printContent}>
            <PrintableLabels copies={selectedPrintCopies} />
          </div>
        </div>
      )}
    </div>
  );
}

function PrintableLabels({ copies }: PrintableLabelsProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className={styles.printGrid}>
      {copies.map((copy) => (
        <div
          key={copy.uniqueCode}
          className={styles.labelContainer}
        >
          <QRCodeSVG
            value={`${baseUrl}/copy/${copy.uniqueCode}`}
            size={55}
            level="L"
            marginSize={1}
          />
          <div className={styles.labelText}>
            <div className={styles.labelBrand}>
              AUC
            </div>
            <div className={styles.labelCode}>
              {copy.uniqueCode.split("-").slice(1).join("-")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Add state and modal to Dashboard
// (This is a simplified representation, in real code it would be inside Dashboard function)
