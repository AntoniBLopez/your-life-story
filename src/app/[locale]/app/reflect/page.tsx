import { ReflectionThread } from "@/modules/reflection/presentation/components/reflection-thread";
import { parseAppLocale } from "@/i18n/routing";

export default async function ReflectPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseAppLocale((await params).locale);
  return <ReflectionThread locale={locale} chatId={null} initialMessages={[]} />;
}
