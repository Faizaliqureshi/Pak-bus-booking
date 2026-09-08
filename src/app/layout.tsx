import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TicketPass — One App for Every Journey",
  description:
    "Pakistan’s next-generation travel and booking platform. Start with real-time bus tickets, then expand to flights, trains, packages, and visa assistance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Navbar />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
