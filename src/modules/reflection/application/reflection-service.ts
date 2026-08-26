import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { env } from "@/shared/lib/env";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

export async function getReflectionState(userId: string) {
  if (env.demoMode) return { consented: true, messages: [{ id: "demo-message-1", role: "assistant" as const, content: "Este es un espacio de demostración. Puedes explorar la interfaz sin conectar todavía tu cuenta.", createdAt: "2024-01-01T00:00:00.000Z" }] as ChatMessage[] };
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: thread }] = await Promise.all([
    supabase.from("profiles").select("ai_consent_at").eq("id", userId).maybeSingle(),
    supabase.from("chat_threads").select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (!thread) return { consented: Boolean(profile?.ai_consent_at), messages: [] as ChatMessage[] };
  const { data } = await supabase.from("chat_messages").select("id,role,content,created_at").eq("thread_id", thread.id).eq("user_id", userId).order("created_at", { ascending: true }).limit(60);
  return { consented: Boolean(profile?.ai_consent_at), messages: (data ?? []).map((item: any) => ({ id: item.id, role: item.role, content: item.content, createdAt: item.created_at })) as ChatMessage[] };
}

export async function ensureReflectionThread(userId: string) {
  if (env.demoMode) return "demo-thread";
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: listError } = await supabase.from("chat_threads").select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (listError) throw listError;
  if (existing) return existing.id;
  const { data, error } = await supabase.from("chat_threads").insert({ user_id: userId, title: "Life reflections" }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function saveReflectionMessage(userId: string, threadId: string, role: "user" | "assistant", content: string) {
  if (env.demoMode) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chat_messages").insert({ user_id: userId, thread_id: threadId, role, content });
  if (error) throw error;
}
