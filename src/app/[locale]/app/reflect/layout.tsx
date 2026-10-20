import { ReflectionWorkspace } from "@/modules/reflection/presentation/components/reflection-workspace";
import { getReflectionWorkspace } from "@/modules/reflection/application/reflection-service";
import { parseAppLocale } from "@/i18n/routing";
import { requirePageUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReflectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = parseAppLocale((await params).locale);
  const user = await requirePageUser(locale);
  const workspace = await getReflectionWorkspace(user.id);
  return (
    <ReflectionWorkspace locale={locale} consented={workspace.consented} initialConversations={workspace.conversations}>
      {children}
    </ReflectionWorkspace>
  );
}
