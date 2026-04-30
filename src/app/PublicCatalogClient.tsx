"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "../contexts/I18nContext";
import Icon from "../components/Icon";
import CustomSelect from "../components/CustomSelect";
import LanguageSwitcher from "../components/LanguageSwitcher";
import type { PublicCatalogBook } from "../lib/bookCatalog";
import styles from "./PublicCatalogClient.module.css";

const CATEGORIES = [
  "HTML CSS",
  "Programming",
  "Design",
  "WordPress",
  "Adobe",
  "Kentei",
  "Office",
];

export default function PublicCatalogClient({
  initialBooks,
  isAdmin,
}: {
  initialBooks: PublicCatalogBook[];
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [books] = useState<PublicCatalogBook[]>(initialBooks);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const filteredBooks = useMemo(() => {
    const q = searchInput.trim().toLowerCase();

    return books
      .filter((book) => {
        const matchesSearch =
          book.title.toLowerCase().includes(q) ||
          book.isbn.toLowerCase().includes(q) ||
          (book.author || "").toLowerCase().includes(q);

        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(book.category);

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOrder === "title") return a.title.localeCompare(b.title);
        if (sortOrder === "stock_desc") return b.availableCopies - a.availableCopies;
        if (sortOrder === "stock_asc") return a.availableCopies - b.availableCopies;
        if (sortOrder === "category") return (a.category || "").localeCompare(b.category || "");
        if (sortOrder === "pub_date") {
          return (b.publishDate || "").localeCompare(a.publishDate || "");
        }
        return 0;
      });
  }, [books, searchInput, selectedCategories, sortOrder]);

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">AUC Books</h1>
        </div>
        <div className={styles.pageActions}>
          <LanguageSwitcher />
          {isAdmin ? (
            <Link href="/admin" className={styles.authButton}>
              <Icon name="dashboard" />
              {t("openDashboard")}
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.authButton}
            onClick={handleLogout}
          >
            <Icon name="logout" />
            {t("logoutAction")}
          </button>
        </div>
      </div>

      <div className={styles.searchStack}>
        <div className={`glass-panel ${styles.searchPanel}`}>
          <Icon name="search" size={22} className={styles.searchIcon} />
          <input
            type="text"
            className="form-input"
            placeholder={t("publicSearchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
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
                { value: "category", label: t("sortCategory") },
              ]}
            />
          </div>
        </div>
      </div>

      <div className={styles.bookGrid}>
        {filteredBooks.map((book) => (
          <article className={styles.bookCard} key={book.isbn}>
            <div className={styles.bookMain}>
              <div className={styles.bookCover}>
                {book.coverUrl ? (
                  <div className={styles.coverFrame}>
                    <Image
                      src={book.coverUrl}
                      alt={t("coverImage")}
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

                <div className={styles.badgeList}>
                  <span className={`badge ${styles.badgeReset}`}>
                    {t("totalCopies")}: {book.totalCopies}
                  </span>
                  <span className={`badge badge-green ${styles.badgeReset}`}>
                    {t("availableCopies")}: {book.availableCopies}
                  </span>
                  {book.category ? (
                    <span className={`badge ${styles.badgeReset}`}>
                      {book.category}
                    </span>
                  ) : null}
                </div>

                <div className={styles.cardActions}>
                  <Link
                    href={`/books/${book.isbn}`}
                    className={`btn btn-primary ${styles.detailLink}`}
                  >
                    <Icon name="menu_book" />
                    {t("viewDetails")}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
        {filteredBooks.length === 0 && (
          <p className={styles.emptyText}>{t("noBooks")}</p>
        )}
      </div>
    </div>
  );
}
