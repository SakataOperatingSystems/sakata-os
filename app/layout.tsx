import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeRuntime from "@/app/components/theme-runtime";
import { themeInitializationScript } from "@/app/lib/theme-preference";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAKATA OPERATING SYSTEMS | SAKATA TECHNOLOGIES",
  description: "The multi-tenant operating systems platform from SAKATA TECHNOLOGIES.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      data-theme="light"
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitializationScript,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeRuntime />
        {children}
      </body>
    </html>
  );
}
