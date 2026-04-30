import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/auth";
import { toAdminLoan } from "../../../../../lib/adminLoans";

type UpdateLoanNotesPayload = {
  borrowNotes?: string;
  returnNotes?: string;
};

const normalizeNote = (value: unknown) => {
  if (typeof value !== "string") return null;
  return value.trim() || null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = (await request.json()) as UpdateLoanNotesPayload;

    const existingLoan = await prisma.loan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingLoan) {
      return NextResponse.json(
        { code: "LOAN_NOT_FOUND", error: "Pinjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        borrowNotes: normalizeNote(body.borrowNotes),
        returnNotes: normalizeNote(body.returnNotes),
      },
      include: {
        bookCopy: {
          include: {
            book: true,
          },
        },
      },
    });

    return NextResponse.json(toAdminLoan(updatedLoan));
  } catch (error) {
    return NextResponse.json(
      {
        code: "LOAN_NOTES_UPDATE_FAILED",
        error: getErrorMessage(error, "Gagal memperbarui catatan pinjaman"),
      },
      { status: 500 },
    );
  }
}
