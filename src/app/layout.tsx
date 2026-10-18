import type { Metadata, Viewport } from "next";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import "./globals.css";
import PwaProvider from "@/components/pwa-provider";

export const viewport: Viewport = { themeColor: "#116149", viewportFit: "cover" };

export const metadata: Metadata = {
 ...pageMetadata('UTME practice, mock exams & progress insights', 'Prepare for JAMB UTME with focused topic practice, timed four-subject mock exams and insights from your answers. Build your study routine with JAMBPrep.', '/', true),
 metadataBase: new URL(SITE_URL),
 title: {default:'JAMBPrep — UTME practice & mock exams',template:'%s | JAMBPrep'},
 applicationName:'JAMBPrep',creator:'LecternIQ',
 icons:{icon:[{url:'/favicon.ico'},{url:'/lecterniq-mark.svg',type:'image/svg+xml'}],apple:'/apple-touch-icon.png'},
 manifest:'/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col antialiased bg-[#F6F8F5] text-[#092E28]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'JAMBPrep',url:SITE_URL,publisher:{'@type':'Organization',name:'LecternIQ',logo:`${SITE_URL}/icon-512.png`},description:'Independent UTME topic practice, timed mock exams and progress insights.'})}} />
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
