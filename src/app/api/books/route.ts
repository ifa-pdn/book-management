import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
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
    
    // Category mapping logic
    const catCodeMap: Record<string, string> = {
      "Desain": "De",
      "IT": "It",
      "Manajemen": "Mn",
      "Novel": "Nv",
      "Bisnis": "Bs",
      "Kamus": "Km"
    };
    
    const categoryCode = (category && catCodeMap[category]) || (category ? category.substring(0, 2).toUpperCase() : "XX");

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
        // e.g. "AUC-De30-1"
        const uniqueCode = `AUC-${book.categoryCode}${book.categorySeq}-${nextCopyNumber}`;
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

    const [updatedBook] = await prisma.$transaction([
      prisma.book.update({
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
          category,
        },
      }),
      ...copies.map((copy) =>
        prisma.bookCopy.update({
          where: { uniqueCode: copy.uniqueCode },
          data: {
            location: copy.location,
            condition: copy.condition,
          },
        }),
      ),
    ]);

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
          await prisma.bookCopy.delete({ where: { uniqueCode: copyId } });
          return NextResponse.json({ success: true });
      }

      if (isbn) {
          await prisma.$transaction([
            prisma.bookCopy.deleteMany({ where: { isbn } }),
            prisma.book.delete({ where: { isbn } })
          ]);
          return NextResponse.json({ success: true });
      }
      
      return NextResponse.json({ error: "Missing isbn or copyId" }, { status: 400 });
  } catch(error) {
      return NextResponse.json({ error: getErrorMessage(error, "Failed to delete book data") }, { status: 500 });
  }
}
