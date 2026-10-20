import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://results.triple-e.org"),
  title: "Triple E Organization | 2nd Quiz Competition Official Results",
  description:
    "Official verification and results portal for the Triple E Organization 2nd Quiz Competition (District Ghanche, Gilgit-Baltistan). Lower Class, Middle Class, and Overall Academic Categories.",
  keywords: [
    "Triple E Organization",
    "District Ghanche",
    "Gilgit-Baltistan",
    "Quiz Competition Results",
    "Education Empowerment Environment",
    "Student Results Portal",
    "Scorecard Verification",
  ],
  authors: [{ name: "Triple E Organization", url: "https://triple-e.org" }],
  icons: {
    icon: "/images/logos/triple-e-logo.jpg",
    apple: "/images/logos/triple-e-logo.jpg",
  },
  openGraph: {
    title: "Triple E Organization - 2nd Quiz Competition Results",
    description: "Official student scorecard and merit verification portal across District Ghanche, Gilgit-Baltistan.",
    images: [{ url: "/images/logos/triple-e-logo.jpg", width: 400, height: 400, alt: "Triple E Organization" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-white text-[#20252B] flex flex-col selection:bg-navy-100 selection:text-navy-900">
        {children}
      </body>
    </html>
  );
}
