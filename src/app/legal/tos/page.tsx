import type { Metadata } from "next";
import { LegalDocumentPage } from "@/modules/marketing/presentation/legal-document-page";

export const metadata: Metadata = {
  title: "Terms of Service | Your Life Story",
  description: "Terms and conditions for using Your Life Story.",
};

const APP_URL = "https://your-life-story-jade.vercel.app";
const CONTACT_EMAIL = "antonilopezdev@gmail.com";

export default function TermsOfServicePage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      updated="September 9, 2026"
      intro={`These Terms of Service ("Terms") govern your access to and use of Your Life Story at ${APP_URL}. By creating an account or using the Service, you agree to these Terms.`}
      sections={[
        {
          title: "The Service",
          paragraphs: [
            "Your Life Story is a private application for recording personal experiences, organizing a family tree, reflecting with optional AI assistance, searching your memories, and optionally syncing birthday reminders to Google Calendar.",
            "We may update, improve, or discontinue features at any time.",
          ],
        },
        {
          title: "Eligibility",
          paragraphs: [
            "You must be at least 18 years old to use the Service.",
            "You are responsible for ensuring that information you enter about other people, including family members, is accurate and that you are entitled to store and process it.",
          ],
        },
        {
          title: "Your account",
          paragraphs: [
            "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
            "You must provide accurate account information and keep it up to date.",
            "Notify us promptly at " + CONTACT_EMAIL + " if you believe your account has been compromised.",
          ],
        },
        {
          title: "Your content",
          paragraphs: [
            "You retain ownership of the content you create in the Service.",
            "You grant us a limited license to host, store, process, back up, and display your content solely to operate and improve the Service, including optional features you enable such as AI assistance, exports, shared read-only timeline access, and Google Calendar reminders.",
            "You must not upload content that is illegal, infringes others' rights, or violates these Terms.",
          ],
        },
        {
          title: "Optional features",
          paragraphs: ["Some features require additional permissions or consent:"],
          bullets: [
            "Google Sign-In and Google Calendar connection are optional and subject to Google's terms.",
            "AI features require explicit in-app consent before use.",
            "Sharing your timeline with another person is optional and limited to the access you configure.",
            "Public archive features, if enabled, publish only the content and permissions you explicitly choose.",
          ],
        },
        {
          title: "Acceptable use",
          paragraphs: ["You agree not to:"],
          bullets: [
            "Use the Service for unlawful, harmful, or abusive purposes.",
            "Attempt to access another user's account or data without authorization.",
            "Interfere with or disrupt the Service, including by automated scraping or excessive requests.",
            "Reverse engineer or misuse the Service except as permitted by law.",
          ],
        },
        {
          title: "Third-party services",
          paragraphs: [
            "The Service integrates with third-party providers such as Google, hosting infrastructure, email delivery, and AI providers.",
            "Your use of those services is subject to their own terms and policies. We are not responsible for third-party services outside our reasonable control.",
          ],
        },
        {
          title: "Disclaimer",
          paragraphs: [
            "The Service is provided on an \"as is\" and \"as available\" basis.",
            "Your Life Story is a personal memory and organization tool. It does not provide medical, psychological, legal, or emergency services. AI responses are informational only and may be incomplete or inaccurate.",
            "To the fullest extent permitted by law, we disclaim all warranties, express or implied, including fitness for a particular purpose and non-infringement.",
          ],
        },
        {
          title: "Limitation of liability",
          paragraphs: [
            "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or goodwill arising from your use of the Service.",
            "Our total liability for any claim relating to the Service is limited to the amount you paid us for the Service in the twelve months before the claim, or zero if the Service is free.",
          ],
        },
        {
          title: "Termination",
          paragraphs: [
            "You may stop using the Service and delete your account at any time from Settings.",
            "We may suspend or terminate access if you violate these Terms or if necessary to protect the Service or other users.",
            "Upon termination, your right to use the Service ends, but sections that by nature should survive will remain in effect.",
          ],
        },
        {
          title: "Changes",
          paragraphs: [
            "We may update these Terms from time to time. The updated version will be posted on this page with a revised \"Last updated\" date.",
            "Continued use after changes become effective constitutes acceptance of the updated Terms.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            `Questions about these Terms: ${CONTACT_EMAIL}.`,
          ],
        },
      ]}
    />
  );
}
