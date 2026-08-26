import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { env } from "./env";
import { DEMO_USER_ID } from "./demo-data";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
  }
}

const demoUser = { id: DEMO_USER_ID, app_metadata: {}, user_metadata: { display_name: "Ana Demo" }, aud: "authenticated", created_at: "2024-01-01T00:00:00.000Z" } as User;

export async function getCurrentUser() {
  if (env.demoMode) return demoUser;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
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
