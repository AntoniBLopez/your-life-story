import { ObjectId } from "mongodb";

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error("Invalid document id.");
  return new ObjectId(id);
}

export function tryToObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function idFromDocument(doc: { _id: ObjectId | string }): string {
  return doc._id.toString();
}
