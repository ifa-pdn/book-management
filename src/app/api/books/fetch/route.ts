import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

type OpenBdSummary = {
  title?: string;
  author?: string;
  publisher?: string;
  pubdate?: string;
  cover?: string;
};

type OpenBdItem = {
  summary?: OpenBdSummary;
} | null;

type GoogleBooksResponse = {
  items?: Array<{
    volumeInfo?: {
      title?: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      imageLinks?: {
        thumbnail?: string;
      };
    };
  }>;
};

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn");
  if (!isbn) {
    return NextResponse.json({ error: "ISBN is required" }, { status: 400 });
  }

  try {
    const cleanIsbn = isbn.replace(/-/g, "");

    // 1. Check Local DB First
    const localBook = await prisma.book.findUnique({
      where: { isbn },
      include: { copies: true }
    });

    if (localBook) {
      const highestCopyNumber = localBook.copies.reduce((max, copy) => Math.max(max, copy.copyNumber), 0);
      const nextCopyNumber = highestCopyNumber + 1;

      return NextResponse.json({
        title: localBook.title,
        author: localBook.author || "",
        publisher: localBook.publisher || "",
        publishDate: localBook.publishDate || "",
        coverUrl: localBook.coverUrl || "",
        size: localBook.size || "",
        existingCopies: localBook.copies.length,
        nextCopyNumber: nextCopyNumber,
        category: localBook.category
      });
    }

    // 2. Fallback to OpenBD if not in Local DB
    const openBdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleanIsbn}`);
    if (openBdRes.ok) {
        const openBdData = await openBdRes.json() as OpenBdItem[];
        if (openBdData && openBdData[0]?.summary) {
        const info = openBdData[0].summary;
        return NextResponse.json({
            title: info?.title || "",
            author: info?.author || "",
            publisher: info?.publisher || "",
            publishDate: info?.pubdate || "",
            coverUrl: info?.cover || "",
            existingCopies: 0,
            nextCopyNumber: 1
        });
        }
    }

    // 3. Fallback to Google Books API
    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    if (googleRes.ok) {
        const googleData = await googleRes.json() as GoogleBooksResponse;
        if (googleData.items && googleData.items.length > 0) {
        const info = googleData.items[0].volumeInfo;
        return NextResponse.json({
            title: info?.title || "",
            author: info?.authors ? info.authors.join(", ") : "",
            publisher: info?.publisher || "",
            publishDate: info?.publishedDate || "",
            coverUrl: info?.imageLinks?.thumbnail || "",
            existingCopies: 0,
            nextCopyNumber: 1
        });
        }
    }

    return NextResponse.json({ error: "Data buku tidak ditemukan di server global." }, { status: 404 });
  } catch (error) {
    console.error("API error", error);
    return NextResponse.json({ error: "Failed to fetch book data" }, { status: 500 });
  }
}
