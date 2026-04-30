import { prisma } from "../../../lib/prisma";
import { notFound } from "next/navigation";
import { isAdminSession } from "../../../lib/auth";
import {
  getActiveLoan,
  getAvailabilitySummary,
  getCopyDerivedStatus,
} from "../../../lib/loanStatus";
import CopyClientView from "./CopyClientView";

const text = (value?: string | null) => value ?? "";

export default async function CopyPage({
  params,
}: {
  params: Promise<{ uniqueCode: string }>;
}) {
  const { uniqueCode } = await params;
  
  const copy = await prisma.bookCopy.findUnique({
    where: { uniqueCode },
    include: {
      loans: {
        where: {
          returnedAt: null,
          status: {
            not: "returned",
          },
        },
        orderBy: {
          dueAt: "asc",
        },
      },
      book: {
        include: {
          copies: {
            include: {
              loans: {
                where: {
                  returnedAt: null,
                  status: {
                    not: "returned",
                  },
                },
                orderBy: {
                  dueAt: "asc",
                },
              },
            },
          },
        },
      },
    },
  });

  if (!copy) {
    notFound();
  }

  const isAdmin = await isAdminSession();
  const availability = getAvailabilitySummary(copy.book.copies);
  const currentCopy = copy.book.copies.find((item) => item.id === copy.id);
  const derivedStatus = currentCopy
    ? getCopyDerivedStatus(currentCopy)
    : "available";
  const activeLoan = getActiveLoan(copy);
  const publicCopy = {
    uniqueCode: copy.uniqueCode,
    derivedStatus,
    totalCopies: availability.totalCopies,
    availableCopies: availability.availableCopies,
    book: {
      isbn: copy.book.isbn,
      title: copy.book.title,
      author: text(copy.book.author),
      publisher: text(copy.book.publisher),
      coverUrl: text(copy.book.coverUrl),
      edition: text(copy.book.edition),
      printing: text(copy.book.printing),
      publishDate: text(copy.book.publishDate),
      size: text(copy.book.size),
    },
  };

  const copyView = isAdmin
    ? {
        ...publicCopy,
        location: text(copy.location),
        condition: text(copy.condition),
        activeLoan: activeLoan
          ? {
              id: activeLoan.id,
              borrowerName: activeLoan.borrowerName,
              borrowerClass: activeLoan.borrowerClass,
              borrowedAt: activeLoan.borrowedAt.toISOString(),
              dueAt: activeLoan.dueAt.toISOString(),
              status:
                derivedStatus === "overdue"
                  ? ("overdue" as const)
                  : ("active" as const),
            }
          : null,
      }
    : publicCopy;

  return <CopyClientView copy={copyView} isAdmin={isAdmin} />;
}
