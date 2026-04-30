import { prisma } from "./prisma";
import { isLoanOverdue, isLoanReturned } from "./loanStatus";

type LoanWithBookCopy = {
  id: string;
  bookCopyId: string;
  borrowerName: string;
  borrowerClass: string;
  borrowedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  status: string;
  borrowNotes: string | null;
  returnNotes: string | null;
  bookCopy: {
    id: string;
    uniqueCode: string;
    book: {
      isbn: string;
      title: string;
      author: string | null;
    };
  };
};

export type AdminLoan = {
  id: string;
  bookCopyId: string;
  uniqueCode: string;
  isbn: string;
  bookTitle: string;
  bookAuthor: string;
  borrowerName: string;
  borrowerClass: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: "active" | "overdue" | "returned";
  borrowNotes: string;
  returnNotes: string;
};

export const activeLoanWhere = {
  returnedAt: null,
  status: {
    not: "returned",
  },
};

export function toAdminLoan(loan: LoanWithBookCopy): AdminLoan {
  const returned = isLoanReturned(loan);

  return {
    id: loan.id,
    bookCopyId: loan.bookCopyId,
    uniqueCode: loan.bookCopy.uniqueCode,
    isbn: loan.bookCopy.book.isbn,
    bookTitle: loan.bookCopy.book.title,
    bookAuthor: loan.bookCopy.book.author ?? "",
    borrowerName: loan.borrowerName,
    borrowerClass: loan.borrowerClass,
    borrowedAt: loan.borrowedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
    returnedAt: loan.returnedAt?.toISOString() ?? null,
    status: returned ? "returned" : isLoanOverdue(loan) ? "overdue" : "active",
    borrowNotes: loan.borrowNotes ?? "",
    returnNotes: loan.returnNotes ?? "",
  };
}

export async function getAdminActiveLoans() {
  const loans = await prisma.loan.findMany({
    where: activeLoanWhere,
    include: {
      bookCopy: {
        include: {
          book: true,
        },
      },
    },
    orderBy: {
      dueAt: "asc",
    },
  });

  return loans.map(toAdminLoan);
}

export async function getAdminLoanHistory() {
  const loans = await prisma.loan.findMany({
    include: {
      bookCopy: {
        include: {
          book: true,
        },
      },
    },
    orderBy: [
      {
        borrowedAt: "desc",
      },
    ],
  });

  return loans.map(toAdminLoan);
}
