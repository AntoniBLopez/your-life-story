import { FamilyTreePage } from "@/modules/family-tree/presentation/components/family-tree-page";
import { getFamilyGraph } from "@/modules/family-tree/application/family-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function FamilyPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params; const user = await requirePageUser(locale);
  const { people, relationships } = await getFamilyGraph(user.id);
  return <FamilyTreePage locale={locale} people={people} relationships={relationships} />;
}
