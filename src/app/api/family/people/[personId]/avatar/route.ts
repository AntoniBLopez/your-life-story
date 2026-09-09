import { NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/lib/auth";
import { openFamilyAvatarStream } from "@/shared/lib/mongodb/family-avatars";
import { findSharedInvite } from "@/modules/family-tree/application/timeline-share-service";
import { MongoFamilyRepository } from "@/modules/family-tree/infrastructure/mongo-family-repository";

const repository = new MongoFamilyRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const person = await repository.findPersonByPersonId(personId);
  if (!person?.avatarGridFsId || !person.avatarMimeType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isOwner = Boolean(user && person.userId === user.id);
  const sharedInvite = user && !isOwner
    ? await findSharedInvite(person.userId, user)
    : null;
  if (!isOwner && !sharedInvite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = await openFamilyAvatarStream(person.avatarGridFsId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    headers: {
      "Content-Type": person.avatarMimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
