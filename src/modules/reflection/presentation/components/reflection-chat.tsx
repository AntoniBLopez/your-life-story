"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { grantAiConsentAction } from "@/modules/reflection/application/reflection-actions";
import type { ChatMessage } from "@/modules/reflection/application/reflection-service";

export function ReflectionChat({ locale, consented, initialMessages }: { locale: "es" | "en"; consented: boolean; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [permission, setPermission] = useState(consented);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const t = locale === "es" ? { eyebrow: "Herramienta complementaria", title: "Reflexiona con tu historia", intro: "Un espacio para buscar patrones, recordar aprendizajes y hacerte mejores preguntas.", consentTitle: "Antes de empezar", consent: "Al enviar un mensaje, la IA recibirá el texto de todas tus experiencias para responder con contexto. Tus fotos y PDF no se comparten. La conversación se guarda sólo en tu espacio; la solicitud se envía sin almacenamiento de respuesta en OpenAI.", consentAction: "Entiendo y quiero continuar", placeholder: "¿Qué te gustaría comprender mejor?", send: "Enviar", empty: "Prueba con: «¿Qué patrones ves en mis últimos cambios?»", disclaimer: "No sustituye apoyo médico, psicológico ni de emergencia.", error: "No se ha podido enviar el mensaje." } : { eyebrow: "Companion tool", title: "Reflect with your story", intro: "A space to find patterns, remember lessons and ask yourself better questions.", consentTitle: "Before you start", consent: "When you send a message, the AI receives the text of all your experiences to respond with context. Your photos and PDFs are never shared. The conversation stays in your space; the request is sent without OpenAI response storage.", consentAction: "I understand and want to continue", placeholder: "What would you like to understand better?", send: "Send", empty: "Try: “What patterns do you notice in my recent changes?”", disclaimer: "This is not a substitute for medical, psychological or emergency support.", error: "Your message could not be sent." };

  function grantConsent() {
    setError(undefined);
    startTransition(async () => { const result = await grantAiConsentAction(locale); if (!result.ok) setError(result.error); else setPermission(true); });
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim(); if (!content || sending) return;
    setMessage(""); setError(undefined); setSending(true);
    const userMessage: ChatMessage = { id: `local-u-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    const assistantId = `local-a-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, locale }) });
      if (!response.ok || !response.body) throw new Error(await response.text());
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let received = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        received += decoder.decode(value, { stream: true });
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: received } : item));
      }
    } catch { setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: t.error } : item)); setError(t.error); }
    finally { setSending(false); setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0); }
  }

  return <div className="mx-auto max-w-4xl fade-in"><p className="eyebrow">{t.eyebrow}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
    {!permission ? <section className="card mt-8 max-w-2xl p-7"><ShieldCheck className="text-[var(--moss)]" size={25} /><h2 className="display mt-4 text-3xl">{t.consentTitle}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.consent}</p><a className="mt-3 inline-block text-xs font-bold text-[var(--moss)] underline" href="https://developers.openai.com/api/docs/guides/your-data" target="_blank">{locale === "es" ? "Consultar controles de datos de OpenAI" : "Read OpenAI data controls"}</a>{error && <p className="field-error">{error}</p>}<button disabled={pending} onClick={grantConsent} className="btn btn-primary mt-6">{pending && <LoaderCircle className="animate-spin" size={15} />}{t.consentAction}</button></section> : <section className="card mt-8 overflow-hidden"><div className="max-h-[510px] min-h-[330px] space-y-5 overflow-y-auto bg-[#fcfdf9] p-5 sm:p-7">{messages.length === 0 ? <div className="grid min-h-65 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf3eb] text-[var(--moss)]"><Sparkles size={20} /></span><p className="mt-4 text-sm text-[var(--muted)]">{t.empty}</p></div></div> : messages.map((item) => <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-[var(--moss-deep)] text-white" : "bg-[#edf3eb] text-[var(--ink)]"}`}>{item.content || <LoaderCircle size={15} className="animate-spin" />}</div></div>)}<div ref={endRef} /></div><form onSubmit={send} className="border-t border-[var(--line)] p-3 sm:p-4"><div className="flex gap-3"><textarea value={message} onChange={(event) => setMessage(event.target.value)} className="textarea !min-h-12 flex-1 !py-3" placeholder={t.placeholder} maxLength={4000} rows={1} /><button disabled={sending || !message.trim()} className="btn btn-primary self-end !px-4" type="submit">{sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}<span className="hidden sm:inline">{t.send}</span></button></div>{error && <p className="field-error">{error}</p>}<p className="mt-2 text-[11px] text-[var(--muted)]">{t.disclaimer}</p></form></section>}
  </div>;
}
