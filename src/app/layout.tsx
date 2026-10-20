import type { Metadata } from "next";
import { ThemeSync } from "@/shared/presentation/theme/theme-sync";
import { themeInitScript } from "@/shared/presentation/theme/theme";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
