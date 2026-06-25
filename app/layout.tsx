import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "TaskVault | Student Freelance & Bounty Platform",
  description: "Complete verified learning modules, build an immutable reputation, and execute real-world corporate bounties.",
  openGraph: {
    title: "TaskVault | Student Freelance & Bounty Platform",
    description: "Complete verified learning modules, build an immutable reputation, and execute real-world corporate bounties.",
    url: "https://taskvault-learn.vercel.app",
    siteName: "TaskVault",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskVault | Student Freelance & Bounty Platform",
    description: "Complete verified learning modules, build an immutable reputation, and execute real-world corporate bounties.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}