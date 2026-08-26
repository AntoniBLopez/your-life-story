import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/shared/lib/auth";
import { getFamilyGraph } from "@/modules/family-tree/application/family-service";
import { toGedcom } from "@/modules/family-tree/domain/gedcom";

export async function GET() {
  const user = await requireCurrentUser();
  const { people, relationships } = await getFamilyGraph(user.id);
  return new NextResponse(toGedcom(people, relationships), { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": 'attachment; filename="your-life-story-family.ged"' } });
}