"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Globe } from "lucide-react";
import { signInAction, signUpAction, requestPasswordResetAction } from "@/modules/identity/application/auth-actions";

type Mode = "login" | "register";

export function AuthForm({ mode, locale }: { mode: Mode; locale: "es" | "en" }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const isRegister = mode === "register";
  const copy = locale === "es"
    ? {
        title: isRegister ? "Empieza a ordenar tu historia" : "Qué alegría verte de nuevo",
        subtitle: isRegister ? "Tu espacio personal, privado y sólo tuyo." : "Vuelve a tu historia cuando quieras.",
        name: "¿Cómo te llamamos?", email: "Email", password: "Contraseña", submit: isRegister ? "Crear mi espacio" : "Entrar", switch: isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?", switchAction: isRegister ? "Inicia sesión" : "Crea tu cuenta", adult: "Confirmo que tengo al menos 18 años.", forgot: "He olvidado mi contraseña", google: "Continuar con Google", sent: "Te hemos enviado un enlace para confirmar tu email.", resetSent: "Si existe una cuenta, recibirás un email para restablecer tu contraseña.",
      }
    : {
        title: isRegister ? "Start organising your story" : "Lovely to see you again",
        subtitle: isRegister ? "Your personal, private space—yours alone." : "Return to your story whenever you need.",
        name: "What should we call you?", email: "Email", password: "Password", submit: isRegister ? "Create my space" : "Sign in", switch: isRegister ? "Already have an account?" : "New here?", switchAction: isRegister ? "Sign in" : "Create an account", adult: "I confirm I am at least 18 years old.", forgot: "I forgot my password", google: "Continue with Google", sent: "We sent you a link to confirm your email.", resetSent: "If that account exists, you will receive a reset email.",
      };

  function submit(formData: FormData) {
    setError(undefined); setMessage(undefined);
    formData.set("locale", locale);
    startTransition(async () => {
      if (isRegister) {
        const result = await signUpAction(formData);
        if (!result.ok) { setError(result.error); return; }
        setMessage(copy.sent);
      } else {
        const result = await signInAction(formData);
        if (!result.ok) { setError(result.error); return; }
        window.location.assign(result.data.redirectTo);
      }
    });
  }

  function resetPassword() {
    const email = (document.getElementById("auth-email") as HTMLInputElement | null)?.value ?? "";
    const formData = new FormData(); formData.set("email", email); formData.set("locale", locale);
    setError(undefined); setMessage(undefined);
    startTransition(async () => {
      const result = await requestPasswordResetAction(formData);
      if (!result.ok) setError(result.error); else setMessage(copy.resetSent);
    });
  }

  return (
    <main className="page-shell flex min-h-screen items-center py-8">
      <section className="container grid items-center gap-12 lg:grid-cols-[1fr_.9fr]">
        <div className="hidden max-w-xl lg:block">
          <p className="eyebrow">Your Life Story</p>
          <h1 className="display mt-5 text-6xl leading-[.98]">{locale === "es" ? "No olvides de dónde vienes." : "Remember where you come from."}</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-[var(--muted)]">{locale === "es" ? "Un lugar tranquilo para convertir experiencias en perspectiva." : "A quiet place to turn experiences into perspective."}</p>
        </div>
        <div className="card mx-auto w-full max-w-md p-7 sm:p-9">
          <Link href={`/${locale}`} className="mb-8 inline-flex items-center gap-2 font-semibold text-[var(--moss-deep)]">← Your Life Story</Link>
          <h2 className="display text-4xl">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.subtitle}</p>
          <form action={submit} className="mt-7 space-y-4">
            {isRegister && <label><span className="field-label">{copy.name}</span><input className="input" name="displayName" required maxLength={80} /></label>}
            <label><span className="field-label">{copy.email}</span><input id="auth-email" className="input" type="email" name="email" required autoComplete="email" /></label>
            <label><span className="field-label">{copy.password}</span><input className="input" type="password" name="password" required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} /></label>
            {isRegister && <label className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]"><input name="acceptedAdultTerms" type="checkbox" value="true" required className="mt-1" />{copy.adult}</label>}
            {error && <p role="alert" className="field-error">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{message}</p>}
            <button disabled={pending} className="btn btn-primary w-full mt-4" type="submit">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />}{copy.submit}</button>
          </form>
          {!isRegister && <button type="button" onClick={resetPassword} disabled={pending} className="mt-4 text-xs font-bold text-[var(--moss)]">{copy.forgot}</button>}
          <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]" />{locale === "es" ? "o" : "or"}<span className="h-px flex-1 bg-[var(--line)]" /></div>
          <a href={`/api/auth/google?locale=${locale}`} className="btn btn-secondary w-full flex items-center justify-center gap-2">{copy.google} <Globe size={16} /></a>
          <p className="mt-6 text-center text-xs text-[var(--muted)]">{copy.switch} <Link className="font-bold text-[var(--moss)]" href={`/${locale}/${isRegister ? "login" : "register"}`}>{copy.switchAction}</Link></p>
        </div>
      </section>
    </main>
  );
}
