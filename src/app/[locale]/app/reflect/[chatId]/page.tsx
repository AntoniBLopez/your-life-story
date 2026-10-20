import { notFound } from "next/navigation";
import { ReflectionThread } from "@/modules/reflection/presentation/components/reflection-thread";
import { getReflectionConversation } from "@/modules/reflection/application/reflection-service";
import { parseAppLocale } from "@/i18n/routing";
import { requirePageUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReflectChatPage({ params }: { params: Promise<{ locale: string; chatId: string }> }) {
  const { locale: localeParam, chatId } = await params;
  const locale = parseAppLocale(localeParam);
  const user = await requirePageUser(locale);
  const conversation = await getReflectionConversation(user.id, chatId);
  if (!conversation) notFound();
  return <ReflectionThread locale={locale} chatId={conversation.id} initialMessages={conversation.messages} />;
}
