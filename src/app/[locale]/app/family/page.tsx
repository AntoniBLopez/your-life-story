import { FamilyTreePage } from "@/modules/family-tree/presentation/components/family-tree-page";
import { getFamilyGraph } from "@/modules/family-tree/application/family-service";
import { googleCalendarConnection, listBirthdayReminderPresets } from "@/modules/family-tree/application/birthday-reminder-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function FamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "es" | "en" }>;
  searchParams: Promise<{ calendar?: string }>;
}) {
  const { locale } = await params;
  const { calendar: calendarNotice } = await searchParams;
  const user = await requirePageUser(locale);
  const [{ people, relationships }, presets, calendar] = await Promise.all([
    getFamilyGraph(user.id),
    listBirthdayReminderPresets(user.id),
    googleCalendarConnection(user.id),
  ]);
  return (
    <FamilyTreePage
      locale={locale}
      people={people}
      relationships={relationships}
      presets={presets}
      calendar={calendar}
      calendarNotice={calendarNotice === "ok" || calendarNotice === "error" ? calendarNotice : undefined}
    />
  );
}
