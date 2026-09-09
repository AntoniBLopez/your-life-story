import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { LandingPage } from "@/modules/marketing/presentation/landing-page";
import { redirectAuthenticatedUser } from "@/shared/lib/auth";

export default async function IndexPage() {
  await redirectAuthenticatedUser("es");
  setRequestLocale("es");
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <LandingPage locale="es" />
    </NextIntlClientProvider>
  );
}
