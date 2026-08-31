import { describe, expect, it } from "vitest";
import { resolveAttachmentContentType } from "./attachment-content-type";

describe("resolveAttachmentContentType", () => {
  it("detects pdf by extension when mime type is empty", () => {
    expect(resolveAttachmentContentType("documento.pdf", "")).toBe("application/pdf");
  });

  it("accepts application/x-pdf", () => {
    expect(resolveAttachmentContentType("file.pdf", "application/x-pdf")).toBe("application/pdf");
  });
});
