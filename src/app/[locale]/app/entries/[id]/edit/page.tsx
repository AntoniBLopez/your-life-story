import { notFound } from "next/navigation";
import { LifeEntryForm } from "@/modules/life-story/presentation/components/life-entry-form";
import { getLifeEntryForUser, listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function EditEntryPage({ params }: { params: Promise<{ locale: "es" | "en"; id: string }> }) {
  const { locale, id } = await params; const user = await requirePageUser(locale);
  const [entry, entries] = await Promise.all([getLifeEntryForUser(user.id, id), listLifeEntriesForUser(user.id)]);
  if (!entry) notFound();
  return <LifeEntryForm locale={locale} entry={entry} entries={entries} />;
}
