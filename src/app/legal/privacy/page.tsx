import type { Metadata } from "next";
import { LegalDocumentPage } from "@/modules/marketing/presentation/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Your Life Story",
  description: "How Your Life Story collects, uses, and protects your personal data.",
};

const APP_URL = "https://your-life-story-jade.vercel.app";
const CONTACT_EMAIL = "antonilopezdev@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      updated="September 9, 2026"
      intro={`This Privacy Policy explains how Your Life Story ("we", "us", "the Service") handles personal information when you use ${APP_URL}. By creating an account or using the Service, you agree to this policy.`}
      sections={[
        {
          title: "Who we are",
          paragraphs: [
            "Your Life Story is a personal life-story application that lets you record experiences, build a family tree, reflect with AI, and optionally sync birthday reminders to Google Calendar.",
            `For privacy questions, contact us at ${CONTACT_EMAIL}.`,
          ],
        },
        {
          title: "Information we collect",
          paragraphs: ["We collect only the information needed to provide the Service:"],
          bullets: [
            "Account data: email address, display name, password hash (if you register with email), and session identifiers.",
            "Profile and content you create: life timeline entries, notes, dates, family tree people and relationships, reflection chat messages, and optional profile or family photos you upload.",
            "Google account data (optional): if you sign in with Google, we receive your Google account ID, email address, and basic profile information. If you connect Google Calendar, we store OAuth tokens and your Google email to create yearly birthday reminder events you explicitly enable.",
            "Technical data: basic server logs and security-related metadata required to operate the Service.",
          ],
        },
        {
          title: "How we use your information",
          paragraphs: ["We use your information to:"],
          bullets: [
            "Authenticate you and keep your account secure.",
            "Store and display your timeline, family tree, and settings.",
            "Provide optional AI features only after you give explicit in-app consent.",
            "Create, update, or remove Google Calendar events for birthday reminders you turn on per person.",
            "Send optional account-related emails such as inactivity notices when configured.",
            "Export or delete your data when you request it from Settings.",
          ],
        },
        {
          title: "Google services",
          paragraphs: [
            "If you use Google Sign-In, Google processes your authentication according to Google's Privacy Policy.",
            "If you connect Google Calendar, we request access to create and manage calendar events related to birthday reminders you enable. We do not read your entire calendar for unrelated purposes. You can disconnect Google Calendar at any time in Settings.",
            "Your use of Google services is also subject to Google's Terms of Service and Privacy Policy.",
          ],
        },
        {
          title: "AI features",
          paragraphs: [
            "AI features are optional and require separate in-app consent before use.",
            "When enabled, text from your life entries may be sent to third-party AI providers to generate responses. Photos and PDF attachments are not included in that context.",
            "We configure AI requests so provider-side response storage is disabled where supported.",
          ],
        },
        {
          title: "How we share information",
          paragraphs: [
            "We do not sell your personal information.",
            "We share data only with service providers needed to run the Service (for example hosting, database, email delivery, Google APIs, and AI providers when you use those features), and only to the extent required for those features to work.",
            "If you explicitly share your timeline with another person by granting read access through the family tree, that invited person can view the content you authorized.",
            "We may disclose information if required by law or to protect the rights, safety, and security of users and the Service.",
          ],
        },
        {
          title: "Data retention and deletion",
          paragraphs: [
            "We retain your data while your account is active.",
            "You can export your structured data and delete your account from Settings. Deletion removes your account content and associated files from our systems, subject to limited backup retention required for security and legal compliance.",
            "Disconnecting Google Calendar stops future sync; events already created in your Google Calendar remain under your Google account unless you remove them there.",
          ],
        },
        {
          title: "Security",
          paragraphs: [
            "We use industry-standard measures such as server-side access controls, authenticated sessions, and encrypted transport (HTTPS).",
            "No online service can guarantee absolute security. Please use a strong password and keep your account credentials confidential.",
          ],
        },
        {
          title: "Your rights",
          paragraphs: [
            "Depending on your location, you may have rights to access, correct, export, restrict, or delete your personal data.",
            `To exercise these rights, contact ${CONTACT_EMAIL} or use the export and account deletion tools in Settings.`,
          ],
        },
        {
          title: "Children",
          paragraphs: [
            "The Service is intended for adults. You must confirm that you are at least 18 years old when registering.",
            "We do not knowingly collect personal information from children.",
          ],
        },
        {
          title: "Changes to this policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the \"Last updated\" date.",
            "Continued use of the Service after changes become effective means you accept the updated policy.",
          ],
        },
      ]}
    />
  );
}
