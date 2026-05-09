import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { createCopyCode } from "../../../lib/copyCode";
import { deleteStoredCoverFile } from "../../../lib/coverStorage";
import { isAdminSession, requireAdmin, requireLogin } from "../../../lib/auth";
import {
  getAdminCatalogBooks,
  getPublicCatalogBooks,
} from "../../../lib/bookCatalog";

type BookPayload = {
  isbn?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publishDate?: string;
  coverUrl?: string;
  edition?: string;
  printing?: string;
  size?: string;
  category?: string;
  location?: string;
  condition?: string;
  count?: number;
  copies?: Array<{
    uniqueCode: string;
    location?: string;
    condition?: string;
  }>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const categoryCodeMap: Record<string, string> = {
  Desain: "De",
  IT: "It",
  Manajemen: "Mn",
  Novel: "Nv",
  Bisnis: "Bs",
  Kamus: "Km",
};

const getCategoryCode = (category?: string | null) =>
  (category && categoryCodeMap[category]) ||
  (category ? category.substring(0, 2).toUpperCase() : "XX");

const deleteCoverFileIfUnused = async (coverUrl?: string | null) => {
  if (!coverUrl) return;

  const remainingReferences = await prisma.book.count({
    where: { coverUrl },
  });

  if (remainingReferences === 0) {
    await deleteStoredCoverFile(coverUrl);
  }
};

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json() as BookPayload;
    const { isbn, title, author, publisher, publishDate, coverUrl, edition, printing, size, category, location, condition, count = 1 } = body;

    if (!isbn || !title) {
        return NextResponse.json({ error: "ISBN and Title are required" }, { status: 400 });
    }

    // Logic: Check if Book already exists
    let book = await prisma.book.findUnique({ where: { isbn } });
    
    const categoryCode = getCategoryCode(category);

    if (!book) {
      // Find the latest categorySeq for this categoryCode
      const lastBookInCategory = await prisma.book.findFirst({
        where: { categoryCode },
        orderBy: { categorySeq: 'desc' },
      });
      const newSeq = (lastBookInCategory?.categorySeq || 0) + 1;

      book = await prisma.book.create({
        data: {
          isbn,
          title,
          author,
          publisher,
          publishDate,
          coverUrl,
          edition,
          printing,
          size,
          category,
          categoryCode,
          categorySeq: newSeq,
        }
      });
    }

    // Now insert copies
    const copiesToCreate = [];
    
    // Get existing latest copy number for this ISBN
    const lastCopy = await prisma.bookCopy.findFirst({
      where: { isbn },
      orderBy: { copyNumber: 'desc' },
    });
    let nextCopyNumber = (lastCopy?.copyNumber || 0) + 1;

    for (let i = 0; i < count; i++) {
        const uniqueCode = createCopyCode(
          book.categoryCode,
          book.categorySeq,
          nextCopyNumber,
        );
        copiesToCreate.push({
            isbn,
            copyNumber: nextCopyNumber,
            uniqueCode,
            location,
            condition,
        });
        nextCopyNumber++;
    }

    const createdCopies = await prisma.$transaction(
      copiesToCreate.map(c => prisma.bookCopy.create({ data: c }))
    );

    return NextResponse.json({ book, copies: createdCopies }, { status: 201 });
  } catch (error) {
    console.error("Save error", error);
    return NextResponse.json({ error: getErrorMessage(error, "Failed to process book") }, { status: 500 });
  }
}

export async function GET() {
    const authError = await requireLogin();
    if (authError) return authError;

    const adminView = await isAdminSession();
    return NextResponse.json(
      adminView ? await getAdminCatalogBooks() : await getPublicCatalogBooks(),
    );
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json() as BookPayload;
    const { isbn, title, author, publisher, publishDate, coverUrl, edition, printing, size, category, copies = [] } = body;

    if (!isbn) {
      return NextResponse.json({ error: "ISBN is required" }, { status: 400 });
    }

    const currentBook = await prisma.book.findUnique({
      where: { isbn },
      include: {
        copies: {
          orderBy: { copyNumber: "asc" },
          select: {
            uniqueCode: true,
            copyNumber: true,
            location: true,
            condition: true,
          },
        },
      },
    });

    if (!currentBook) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const nextCategory = category ?? currentBook.category;
    const nextCategoryCode = getCategoryCode(nextCategory);
    const currentCategoryCode =
      currentBook.categoryCode ?? getCategoryCode(currentBook.category);
    const shouldRegenerateCopyCodes =
      nextCategoryCode !== currentCategoryCode || currentBook.categorySeq == null;
    const copyUpdates = new Map(
      copies.map((copy) => [
        copy.uniqueCode,
        {
          location: copy.location,
          condition: copy.condition,
        },
      ]),
    );

    const updatedBook = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const nextCategorySeq = shouldRegenerateCopyCodes
        ? (
            (
              await tx.book.findFirst({
                where: {
                  categoryCode: nextCategoryCode,
                  NOT: { isbn },
                },
                orderBy: { categorySeq: "desc" },
                select: { categorySeq: true },
              })
            )?.categorySeq ?? 0
          ) + 1
        : (currentBook.categorySeq ?? 1);

      const book = await tx.book.update({
        where: { isbn },
        data: {
          title,
          author,
          publisher,
          publishDate,
          coverUrl,
          edition,
          printing,
          size,
          category: nextCategory,
          categoryCode: nextCategoryCode,
          categorySeq: nextCategorySeq,
        },
      });

      for (const copy of currentBook.copies) {
        const copyEdit = copyUpdates.get(copy.uniqueCode);

        await tx.bookCopy.update({
          where: { uniqueCode: copy.uniqueCode },
          data: {
            uniqueCode: shouldRegenerateCopyCodes
              ? createCopyCode(
                  nextCategoryCode,
                  nextCategorySeq,
                  copy.copyNumber,
                )
              : copy.uniqueCode,
            location: copyEdit?.location ?? copy.location,
            condition: copyEdit?.condition ?? copy.condition,
          },
        });
      }

      return book;
    });

    const updatedBookWithCopies = (await getAdminCatalogBooks()).find(
      (book) => book.isbn === isbn,
    );

    return NextResponse.json(updatedBookWithCopies ?? updatedBook);
  } catch (error) {
    console.error("Update error", error);
    return NextResponse.json({ error: getErrorMessage(error, "Failed to update book") }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
      const authError = await requireAdmin();
      if (authError) return authError;

      const { searchParams } = new URL(request.url);
      const isbn = searchParams.get('isbn');
      const copyId = searchParams.get('copyId');

      if (copyId) {
          const copy = await prisma.bookCopy.findUnique({
            where: { uniqueCode: copyId },
            select: {
              id: true,
              isbn: true,
              book: {
                select: {
                  coverUrl: true,
                },
              },
            },
          });

          if (!copy) {
            return NextResponse.json(
              { error: "Copy not found" },
              { status: 404 },
            );
          }

          const deletedBook = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.loan.deleteMany({ where: { bookCopyId: copy.id } });
            await tx.bookCopy.delete({ where: { uniqueCode: copyId } });

            const remainingCopies = await tx.bookCopy.count({
              where: { isbn: copy.isbn },
            });

            if (remainingCopies > 0) return false;

            await tx.book.delete({ where: { isbn: copy.isbn } });
            return true;
          });

          if (deletedBook) {
            await deleteCoverFileIfUnused(copy.book.coverUrl);

            return NextResponse.json({
              success: true,
              deletedBook: true,
              isbn: copy.isbn,
              book: null,
            });
          }

          const updatedBook =
            (await getAdminCatalogBooks()).find(
              (book) => book.isbn === copy.isbn,
            ) ??
            null;

          return NextResponse.json({
            success: true,
            deletedBook: false,
            isbn: copy.isbn,
            book: updatedBook,
          });
      }

      if (isbn) {
          const book = await prisma.book.findUnique({
            where: { isbn },
            select: { isbn: true, coverUrl: true },
          });

          if (!book) {
            return NextResponse.json(
              { error: "Book not found" },
              { status: 404 },
            );
          }

          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const copies = await tx.bookCopy.findMany({
              where: { isbn },
              select: { id: true },
            });
            const copyIds = copies.map((copy) => copy.id);

            if (copyIds.length > 0) {
              await tx.loan.deleteMany({
                where: {
                  bookCopyId: {
                    in: copyIds,
                  },
                },
              });
            }

            await tx.bookCopy.deleteMany({ where: { isbn } });
            await tx.book.delete({ where: { isbn } });
          });

          await deleteCoverFileIfUnused(book.coverUrl);

          return NextResponse.json({
            success: true,
            deletedBook: true,
            isbn,
          });
      }
      
      return NextResponse.json({ error: "Missing isbn or copyId" }, { status: 400 });
  } catch(error) {
      return NextResponse.json({ error: getErrorMessage(error, "Failed to delete book data") }, { status: 500 });
  }
}
