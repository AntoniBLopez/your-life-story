import { requirePageUser } from "@/shared/lib/auth";
import { searchUserStory } from "@/modules/search/application/search-service";
import { SearchPage } from "@/modules/search/presentation/components/search-page";

export default async function SearchRoute({ params, searchParams }: { params: Promise<{ locale: "es" | "en" }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params; const user = await requirePageUser(locale); const { q = "" } = await searchParams;
  const results = await searchUserStory(user.id, q);
  return <SearchPage locale={locale} query={q} entries={results.entries} people={results.people} />;
}