import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { isAdminSession } from "../../../lib/auth";
import { getAvailabilitySummary } from "../../../lib/loanStatus";
import PublicBookClient from "./PublicBookClient";

const text = (value?: string | null) => value ?? "";

export default async function PublicBookPage({
  params,
}: {
  params: Promise<{ isbn: string }>;
}) {
  const { isbn } = await params;

  const book = await prisma.book.findUnique({
    where: { isbn },
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
  });

  if (!book) {
    notFound();
  }

  const availability = getAvailabilitySummary(book.copies);
  const isAdmin = await isAdminSession();
  const publicBook = {
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
    copyCodes: book.copies.map((copy) => copy.uniqueCode),
    ...availability,
  };

  return <PublicBookClient book={publicBook} isAdmin={isAdmin} />;
}
