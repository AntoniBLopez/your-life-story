import { redirect } from "next/navigation";
import { getSessionUserId, destroySession } from "./auth/session";
import { findUserById } from "@/modules/identity/infrastructure/mongo-user-repository";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
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

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export async function requirePageUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

export async function signOutCurrentUser() {
  await destroySession();
}
