import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/shared/lib/auth";
import { getSharedTimelineForViewer } from "@/modules/family-tree/application/timeline-share-service";
import { toGedcom } from "@/modules/family-tree/domain/gedcom";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; ownerId: string }> }) {
  const { locale, ownerId } = await params;
  const user = await requireCurrentUser();
  const shared = await getSharedTimelineForViewer(ownerId, user, locale === "en" ? "en" : "es");
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slug = shared.ownerDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family";
  return new NextResponse(toGedcom(shared.people, shared.relationships), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-family.ged"`,
    },
  });
}
