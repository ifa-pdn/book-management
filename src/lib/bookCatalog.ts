import { prisma } from "./prisma";
import {
  type DerivedLoanStatus,
  getAvailabilitySummary,
  getCopyDerivedStatus,
} from "./loanStatus";

export type AdminCatalogBookCopy = {
  id: string;
  uniqueCode: string;
  location: string;
  condition: string;
  derivedStatus: DerivedLoanStatus;
};

export type AdminCatalogBook = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  edition: string;
  printing: string;
  publishDate: string;
  size: string;
  category: string;
  categoryCode: string;
  categorySeq: number;
  totalCopies: number;
  availableCopies: number;
  loanedCopies: number;
  overdueCopies: number;
  copies: AdminCatalogBookCopy[];
};

export type PublicCatalogBook = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  edition: string;
  printing: string;
  publishDate: string;
  size: string;
  category: string;
  categoryCode: string;
  categorySeq: number;
  totalCopies: number;
  availableCopies: number;
  loanedCopies: number;
  overdueCopies: number;
};

const text = (value?: string | null) => value ?? "";
const numberValue = (value?: number | null) => value ?? 0;

export async function getAdminCatalogBooks() {
  const books = await prisma.book.findMany({
    include: {
      copies: {
        include: {
          loans: {
            where: {
              returnedAt: null,
            },
            orderBy: {
              dueAt: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return books.map((book) => {
    const availability = getAvailabilitySummary(book.copies);

    return {
      isbn: book.isbn,
      title: book.title,
      author: text(book.author),
      publisher: text(book.publisher),
      coverUrl: text(book.coverUrl),
      edition: text(book.edition),
      printing: text(book.printing),
      publishDate: text(book.publishDate),
      size: text(book.size),
      category: text(book.category),
      categoryCode: text(book.categoryCode),
      categorySeq: numberValue(book.categorySeq),
      ...availability,
      copies: book.copies.map((copy) => ({
        id: copy.id,
        uniqueCode: copy.uniqueCode,
        location: text(copy.location),
        condition: text(copy.condition),
        derivedStatus: getCopyDerivedStatus(copy),
      })),
    };
  }) satisfies AdminCatalogBook[];
}

export async function getPublicCatalogBooks() {
  const books = await prisma.book.findMany({
    include: {
      copies: {
        include: {
          loans: {
            where: {
              returnedAt: null,
            },
            orderBy: {
              dueAt: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return books.map((book) => {
    const availability = getAvailabilitySummary(book.copies);

    return {
      isbn: book.isbn,
      title: book.title,
      author: text(book.author),
      publisher: text(book.publisher),
      coverUrl: text(book.coverUrl),
      edition: text(book.edition),
      printing: text(book.printing),
      publishDate: text(book.publishDate),
      size: text(book.size),
      category: text(book.category),
      categoryCode: text(book.categoryCode),
      categorySeq: numberValue(book.categorySeq),
      totalCopies: availability.totalCopies,
      availableCopies: availability.availableCopies,
      loanedCopies: availability.loanedCopies,
      overdueCopies: availability.overdueCopies,
    };
  }) satisfies PublicCatalogBook[];
}
