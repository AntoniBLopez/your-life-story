"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signInAction, signUpAction, requestPasswordResetAction } from "@/modules/identity/application/auth-actions";

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

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
        window.location.assign(result.data.redirectTo);
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
          <a href={`/api/auth/google?locale=${locale}`} className="btn btn-secondary w-full flex items-center justify-center gap-2"><GoogleIcon />{copy.google}</a>
          <p className="mt-6 text-center text-xs text-[var(--muted)]">{copy.switch} <Link className="font-bold text-[var(--moss)]" href={`/${locale}/${isRegister ? "login" : "register"}`}>{copy.switchAction}</Link></p>
        </div>
      </section>
    </main>
  );
}
