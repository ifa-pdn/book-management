import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import {
  getTopBorrowedBooks,
  normalizeReportPeriod,
} from "../../../../lib/loanReports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const period = normalizeReportPeriod(searchParams.get("period"));
    const rawLimit = Number(searchParams.get("limit") ?? 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 10;

    return NextResponse.json(await getTopBorrowedBooks({ period, limit }));
  } catch (error) {
    console.error("Top borrowed books report error", error);
    return NextResponse.json(
      {
        error: "Failed to load top borrowed books report",
      },
      { status: 500 },
    );
  }
}
