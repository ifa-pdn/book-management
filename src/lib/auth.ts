import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type AuthRole = "viewer" | "admin";

export const AUTH_COOKIE_NAME = "auth_token";
export const ADMIN_COOKIE_NAME = AUTH_COOKIE_NAME;
export const VIEWER_TOKEN_VALUE = "viewer";
export const ADMIN_TOKEN_VALUE = "admin";
const LEGACY_ADMIN_TOKEN_VALUE = "admin_token_secure_auc";

export function getAuthRoleFromToken(token?: string | null): AuthRole | null {
  if (token === ADMIN_TOKEN_VALUE || token === LEGACY_ADMIN_TOKEN_VALUE) {
    return "admin";
  }

  if (token === VIEWER_TOKEN_VALUE) {
    return "viewer";
  }

  return null;
}

export function isAuthenticatedToken(token?: string | null) {
  return Boolean(getAuthRoleFromToken(token));
}

export function isAdminToken(token?: string | null) {
  return getAuthRoleFromToken(token) === "admin";
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function getCurrentRole() {
  return getAuthRoleFromToken(await getAuthToken());
}

export async function isAuthenticatedSession() {
  return Boolean(await getCurrentRole());
}

export async function isAdminSession() {
  return (await getCurrentRole()) === "admin";
}

export async function requireLogin() {
  if (await isAuthenticatedSession()) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireAdmin() {
  if (await isAdminSession()) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
