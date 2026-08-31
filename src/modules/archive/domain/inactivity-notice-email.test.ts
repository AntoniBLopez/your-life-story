import { describe, expect, it } from "vitest";
import { inactivityNoticeEmail } from "./inactivity-notice-email";

describe("inactivity notice email", () => {
  it("tells the person to sign in, reset the timer, and how to turn the option off", () => {
    const email = inactivityNoticeEmail({
      locale: "es",
      displayName: "Antoni",
      stage: "months_3",
      releaseAt: new Date("2026-04-15T00:00:00.000Z"),
      loginUrl: "https://example.com/es/login",
      settingsUrl: "https://example.com/es/app/settings",
    });
    expect(email.subject).toMatch(/3 meses/i);
    expect(email.html).toContain("reinicia el contador");
    expect(email.html).toContain("https://example.com/es/login");
    expect(email.html).toContain("desactivar la publicación automática");
    expect(email.html).toContain("al final de Ajustes");
    expect(email.text).toContain("2 semanas");
  });
});
