import { NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/lib/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.appUrl}/auth/callback?next=/${locale}/app` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, request.url));
  return NextResponse.redirect(data.url);
}
