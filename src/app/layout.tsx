import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Life Story",
  description: "Tu historia, con perspectiva.",
  verification: {
    google: "en14B8T4ksTr7A8DRLQktq9UzEYfyOalus4HuynRreI",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
