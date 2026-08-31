"use client";

import { FormEvent, useRef, useState } from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export function ArchiveAiChat({ locale, slug, displayName }: { locale: "es" | "en"; slug: string; displayName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const t = locale === "es"
    ? {
        title: `Preguntar sobre la vida de ${displayName}`,
        intro: "La IA responde sólo con lo que esta persona dejó escrito: experiencias, aprendizajes, familia y decisiones.",
        placeholder: "¿Qué decisiones marcaron su vida?",
        send: "Preguntar",
        empty: "Prueba con: «¿Qué patrones ves en sus decisiones?»",
        error: "No se ha podido completar la pregunta.",
        disclaimer: "Respuestas basadas en el testimonio publicado. No inventa hechos que no estén en el archivo.",
      }
    : {
        title: `Ask about ${displayName}’s life`,
        intro: "The AI answers only from what this person left in writing: experiences, lessons, family and decisions.",
        placeholder: "Which decisions shaped their life?",
        send: "Ask",
        empty: "Try: “What patterns do you notice in their decisions?”",
        error: "The question could not be completed.",
        disclaimer: "Answers are grounded in the published testimony. It does not invent facts missing from the archive.",
      };

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || sending) return;
    setMessage("");
    setError(undefined);
    setSending(true);
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    try {
      const response = await fetch("/api/ai/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: content, locale }),
      });
      if (!response.ok || !response.body) throw new Error(await response.text());
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
        setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, content: received } : item)));
      }
    } catch {
      setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, content: t.error } : item)));
      setError(t.error);
    } finally {
      setSending(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  return (
    <section className="card mt-10 overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4 sm:px-7">
        <p className="eyebrow">{locale === "es" ? "Estudiar con IA" : "Study with AI"}</p>
        <h2 className="display mt-1 text-2xl">{t.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
      </div>
      <div className="max-h-[420px] min-h-[240px] space-y-4 overflow-y-auto bg-[#fcfdf9] p-5 sm:p-7">
        {messages.length === 0 ? (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf3eb] text-[var(--moss)]"><Sparkles size={20} /></span>
              <p className="mt-4 text-sm text-[var(--muted)]">{t.empty}</p>
            </div>
          </div>
        ) : messages.map((item) => (
          <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-[var(--moss-deep)] text-white" : "bg-[#edf3eb] text-[var(--ink)]"}`}>
              {item.content || <LoaderCircle size={15} className="animate-spin" />}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t border-[var(--line)] p-3 sm:p-4">
        <div className="flex gap-3">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="textarea !min-h-12 flex-1 !py-3" placeholder={t.placeholder} maxLength={4000} rows={1} />
          <button disabled={sending || !message.trim()} className="btn btn-primary self-end !px-4" type="submit">
            {sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
            <span className="hidden sm:inline">{t.send}</span>
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
        <p className="mt-2 text-[11px] text-[var(--muted)]">{t.disclaimer}</p>
      </form>
    </section>
  );
}
