import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const sans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strategy Financial",
  description: "Controle financeiro com dashboard e alertas inteligentes.",
  icons: {
    icon: "/brand/favicon.ico",
    shortcut: "/brand/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${mono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={0}>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
