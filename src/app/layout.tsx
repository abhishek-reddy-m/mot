import type { Metadata } from "next";
import { Inter, Dancing_Script, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_DESCRIPTION } from "@/config/product";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
  weight: ["400", "700"]
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800"]
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    description: PRODUCT_DESCRIPTION,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dancingScript.variable} ${montserrat.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
