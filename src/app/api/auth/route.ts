import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  ADMIN_TOKEN_VALUE,
  VIEWER_TOKEN_VALUE,
  type AuthRole,
} from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD || "auc2700";
    const viewerPasscode =
      process.env.COMPANY_PASSCODE || process.env.VIEWER_PASSWORD || "aucbooks";
    let role: AuthRole | null = null;

    if (password === adminPassword) {
      role = "admin";
    } else if (password === viewerPasscode) {
      role = "viewer";
    }

    if (!role) {
      return NextResponse.json({ error: "Passcode salah" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      AUTH_COOKIE_NAME,
      role === "admin" ? ADMIN_TOKEN_VALUE : VIEWER_TOKEN_VALUE,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      },
    );

    return NextResponse.json({ success: true, role });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
