import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { wedding } from "@/lib/wedding";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${wedding.couple.a} & ${wedding.couple.b}`,
  description: `You're invited to the wedding of ${wedding.couple.a} and ${wedding.couple.b}. RSVP here.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
