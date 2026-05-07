import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/auth";
import {
  activeLoanWhere,
  getAdminActiveLoans,
  toAdminLoan,
} from "../../../lib/adminLoans";

type CreateLoanPayload = {
  bookCopyId?: string;
  borrowerName?: string;
  borrowerClass?: string;
  borrowedAt?: string;
  dueAt?: string;
  borrowNotes?: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
const borrowerClassOptions = new Set(["Kelas 1", "Kelas 2"]);
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string, time: "now" | "start" | "end") {
  const [year, month, day] = value.split("-").map(Number);
  const now = new Date();

  if (time === "now") {
    return new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
  }

  if (time === "end") {
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  return new Date(year, month - 1, day);
}

function parseDate(
  value: string | undefined,
  dateOnlyTime: "now" | "start" | "end",
) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  const date = dateOnlyPattern.test(normalizedValue)
    ? parseDateOnly(normalizedValue, dateOnlyTime)
    : new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  return NextResponse.json(await getAdminActiveLoans());
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = (await request.json()) as CreateLoanPayload;
    const bookCopyId = body.bookCopyId?.trim();
    const borrowerName = body.borrowerName?.trim();
    const borrowerClass = body.borrowerClass?.trim();
    const borrowedAt = parseDate(body.borrowedAt, "now");
    const dueAt = parseDate(body.dueAt, "end");

    if (!bookCopyId || !borrowerName || !borrowerClass || !borrowedAt || !dueAt) {
      return NextResponse.json(
        {
          code: "LOAN_REQUIRED_FIELDS",
          error: "Copy, nama peminjam, kelas, tanggal pinjam, dan jatuh tempo wajib diisi",
        },
        { status: 400 },
      );
    }

    if (!borrowerClassOptions.has(borrowerClass)) {
      return NextResponse.json(
        { code: "LOAN_INVALID_CLASS", error: "Kelas harus Kelas 1 atau Kelas 2" },
        { status: 400 },
      );
    }

    if (dueAt < borrowedAt) {
      return NextResponse.json(
        {
          code: "LOAN_INVALID_DUE_DATE",
          error: "Tanggal jatuh tempo tidak boleh sebelum tanggal pinjam",
        },
        { status: 400 },
      );
    }

    const loan = await prisma.$transaction(async (tx) => {
      const copy = await tx.bookCopy.findUnique({
        where: { id: bookCopyId },
        select: { id: true },
      });

      if (!copy) {
        throw new Error("COPY_NOT_FOUND");
      }

      const activeLoan = await tx.loan.findFirst({
        where: {
          bookCopyId,
          ...activeLoanWhere,
        },
        select: { id: true },
      });

      if (activeLoan) {
        throw new Error("COPY_ALREADY_LOANED");
      }

      return tx.loan.create({
        data: {
          bookCopyId,
          borrowerName,
          borrowerClass,
          borrowedAt,
          dueAt,
          status: "active",
          borrowNotes: body.borrowNotes?.trim() || null,
        },
        include: {
          bookCopy: {
            include: {
              book: true,
            },
          },
        },
      });
    });

    return NextResponse.json(toAdminLoan(loan), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "COPY_NOT_FOUND") {
      return NextResponse.json(
        { code: "LOAN_COPY_NOT_FOUND", error: "Eksemplar tidak ditemukan" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "COPY_ALREADY_LOANED") {
      return NextResponse.json(
        {
          code: "LOAN_COPY_UNAVAILABLE",
          error: "Eksemplar sedang dipinjam dan belum tersedia",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { code: "LOAN_CREATE_FAILED", error: getErrorMessage(error, "Gagal membuat pinjaman") },
      { status: 500 },
    );
  }
}
