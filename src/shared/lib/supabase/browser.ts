"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/shared/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  browserClient ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return browserClient;
}
