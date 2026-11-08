import type { Metadata } from "next";
import { SITE } from "../src/content/site";
import "./globals.css";

export const dynamic = "force-dynamic";

const origin = process.env.ADVERITY_ORIGIN || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: SITE.title,
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: { title: SITE.title, description: SITE.description, url: origin, type: "website" },
  twitter: { card: "summary", title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <header className="banner">
          <img className="logo" src="/brand/adverity-lockup.svg" alt="AdVerity" width={290} height={71} />
          <p>{SITE.tagline}</p>
        </header>
        <main id="content">{children}</main>
        <footer>HealthCrew.ai is the worked example, not a customer. An export is not a tested Google Ads Editor import, and it is not permission to spend.</footer>
      </body>
    </html>
  );
}
