import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/auth";
import { toAdminLoan } from "../../../../../lib/adminLoans";

type ReturnLoanPayload = {
  returnedAt?: string;
  returnNotes?: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function parseReturnedAt(value?: string) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = (await request.json()) as ReturnLoanPayload;
    const returnedAt = parseReturnedAt(body.returnedAt);

    if (!returnedAt) {
      return NextResponse.json(
        { code: "LOAN_INVALID_RETURN_DATE", error: "Tanggal kembali tidak valid" },
        { status: 400 },
      );
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        bookCopy: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { code: "LOAN_NOT_FOUND", error: "Pinjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    if (loan.returnedAt || loan.status === "returned") {
      return NextResponse.json(
        { code: "LOAN_ALREADY_RETURNED", error: "Pinjaman sudah dikembalikan" },
        { status: 409 },
      );
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        returnedAt,
        status: "returned",
        returnNotes: body.returnNotes?.trim() || null,
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
        code: "LOAN_RETURN_FAILED",
        error: getErrorMessage(error, "Gagal memproses pengembalian"),
      },
      { status: 500 },
    );
  }
}
