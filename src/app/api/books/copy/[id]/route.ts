import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { isAdminSession, requireAdmin, requireLogin } from "../../../../../lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireLogin();
    if (authError) return authError;

    const { id: uniqueCode } = await params;
    const copy = await prisma.bookCopy.findUnique({
      where: { uniqueCode },
      include: { book: true },
    });

    if (!copy) {
      return NextResponse.json({ error: "Eksemplar tidak ditemukan" }, { status: 404 });
    }

    if (await isAdminSession()) {
      return NextResponse.json(copy);
    }

    return NextResponse.json({
      uniqueCode: copy.uniqueCode,
      book: {
        isbn: copy.book.isbn,
        title: copy.book.title,
        author: copy.book.author,
        publisher: copy.book.publisher,
        coverUrl: copy.book.coverUrl,
        edition: copy.book.edition,
        printing: copy.book.printing,
        publishDate: copy.book.publishDate,
        size: copy.book.size,
        category: copy.book.category,
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data copy" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id: uniqueCode } = await params;
    const body = await request.json();
    const { location, condition } = body;

    const updatedCopy = await prisma.bookCopy.update({
      where: { uniqueCode },
      data: { location, condition },
      include: { book: true }
    });

    return NextResponse.json(updatedCopy);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate status copy" }, { status: 500 });
  }
}
