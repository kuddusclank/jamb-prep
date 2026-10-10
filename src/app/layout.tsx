import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAMBPrep — Know What to Study Next",
  description: "Explore JAMBPrep, a UTME preparation platform in development. Discover planned mock exams, topic practice and revision insights. An account is required for all practice and exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col antialiased bg-[#F6F8F5] text-[#092E28]">
        {children}
      </body>
    </html>
  );
}
