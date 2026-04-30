import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "../../../../lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  // Menghapus cookie dengan mengatur masa berlakunya (Max-Age = 0)
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, 
  });
  return NextResponse.json({ success: true, message: "Berhasil logout" });
}
