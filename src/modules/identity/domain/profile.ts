export type SupportedLocale = "es" | "en";

export type Profile = {
  id: string;
  displayName: string | null;
  locale: SupportedLocale;
  aiConsentAt: string | null;
  onboardedAt: string | null;
  publicArchiveConsent: boolean;
  archiveSlug: string | null;
  publishedAt: string | null;
  deceasedAt: string | null;
};
