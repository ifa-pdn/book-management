import { prisma } from "./prisma";
import { activeLoanWhere } from "./adminLoans";

export const reportPeriods = ["30d", "month", "year", "all"] as const;

export type ReportPeriod = (typeof reportPeriods)[number];

export type TopBorrowedBook = {
  rank: number;
  isbn: string;
  title: string;
  category: string;
  totalLoans: number;
  lastBorrowedAt: string;
  totalCopies: number;
  activeLoans: number;
};

type RankingInput = {
  period?: string | null;
  limit?: number;
};

const isReportPeriod = (value: string | null | undefined): value is ReportPeriod =>
  Boolean(value && reportPeriods.includes(value as ReportPeriod));

export function normalizeReportPeriod(value?: string | null): ReportPeriod {
  return isReportPeriod(value) ? value : "30d";
}

function getPeriodStart(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return start;
}

export async function getTopBorrowedBooks({
  period,
  limit = 10,
}: RankingInput = {}) {
  const normalizedPeriod = normalizeReportPeriod(period);
  const periodStart = getPeriodStart(normalizedPeriod);
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const loans = await prisma.loan.findMany({
    where: periodStart
      ? {
          borrowedAt: {
            gte: periodStart,
          },
        }
      : undefined,
    include: {
      bookCopy: {
        include: {
          book: true,
        },
      },
    },
  });

  const rankingMap = new Map<
    string,
    Omit<TopBorrowedBook, "rank" | "totalCopies" | "activeLoans"> & {
      lastBorrowedAtDate: Date;
    }
  >();

  for (const loan of loans) {
    const book = loan.bookCopy.book;
    const existing = rankingMap.get(book.isbn);

    if (!existing) {
      rankingMap.set(book.isbn, {
        isbn: book.isbn,
        title: book.title,
        category: book.category ?? "",
        totalLoans: 1,
        lastBorrowedAt: loan.borrowedAt.toISOString(),
        lastBorrowedAtDate: loan.borrowedAt,
      });
      continue;
    }

    existing.totalLoans += 1;
    if (loan.borrowedAt > existing.lastBorrowedAtDate) {
      existing.lastBorrowedAt = loan.borrowedAt.toISOString();
      existing.lastBorrowedAtDate = loan.borrowedAt;
    }
  }

  const isbns = [...rankingMap.keys()];
  if (isbns.length === 0) return [] satisfies TopBorrowedBook[];

  const [copyCounts, activeLoans] = await Promise.all([
    prisma.book.findMany({
      where: {
        isbn: {
          in: isbns,
        },
      },
      select: {
        isbn: true,
        _count: {
          select: {
            copies: true,
          },
        },
      },
    }),
    prisma.loan.findMany({
      where: activeLoanWhere,
      select: {
        bookCopy: {
          select: {
            isbn: true,
          },
        },
      },
    }),
  ]);

  const copyCountByIsbn = new Map(
    copyCounts.map((book) => [book.isbn, book._count.copies]),
  );
  const activeLoanCountByIsbn = new Map<string, number>();

  for (const loan of activeLoans) {
    const isbn = loan.bookCopy.isbn;
    activeLoanCountByIsbn.set(isbn, (activeLoanCountByIsbn.get(isbn) ?? 0) + 1);
  }

  return [...rankingMap.values()]
    .sort((a, b) => {
      if (b.totalLoans !== a.totalLoans) return b.totalLoans - a.totalLoans;
      const dateDiff =
        b.lastBorrowedAtDate.getTime() - a.lastBorrowedAtDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, safeLimit)
    .map((book, index) => ({
      rank: index + 1,
      isbn: book.isbn,
      title: book.title,
      category: book.category,
      totalLoans: book.totalLoans,
      lastBorrowedAt: book.lastBorrowedAt,
      totalCopies: copyCountByIsbn.get(book.isbn) ?? 0,
      activeLoans: activeLoanCountByIsbn.get(book.isbn) ?? 0,
    })) satisfies TopBorrowedBook[];
}
