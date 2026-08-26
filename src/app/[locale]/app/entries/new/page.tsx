import { LifeEntryForm } from "@/modules/life-story/presentation/components/life-entry-form";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function NewEntryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params; const user = await requirePageUser(locale);
  return <LifeEntryForm locale={locale} entries={await listLifeEntriesForUser(user.id)} />;
}
