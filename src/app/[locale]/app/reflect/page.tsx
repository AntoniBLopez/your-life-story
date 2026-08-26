import { ReflectionChat } from "@/modules/reflection/presentation/components/reflection-chat";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function ReflectPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params; const user = await requirePageUser(locale);
  const reflection = await getReflectionState(user.id);
  return <ReflectionChat locale={locale} consented={reflection.consented} initialMessages={reflection.messages} />;
}
