import { redirect } from "next/navigation";
import { getSessionUserId, destroySession } from "./auth/session";
import { findUserById } from "@/modules/identity/infrastructure/mongo-user-repository";
import { touchLastSeen } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { isArchiveAdmin } from "@/modules/archive/domain/archive";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
  }
}

export class AdminRequiredError extends Error {
  constructor() {
    super("Admin access required");
  }
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  locale: "es" | "en";
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
  };
}

async function rememberAccess(userId: string) {
  try {
    await touchLastSeen(userId);
  } catch {
    // Presence tracking must never block using the app.
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  await rememberAccess(user.id);
  return user;
}

export async function requirePageUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  await rememberAccess(user.id);
  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  if (!isArchiveAdmin(user.email)) throw new AdminRequiredError();
  return user;
}

export async function requireAdminPage(locale: string) {
  const user = await requirePageUser(locale);
  if (!isArchiveAdmin(user.email)) redirect(`/${locale}/app`);
  return user;
}

export async function signOutCurrentUser() {
  await destroySession();
}
