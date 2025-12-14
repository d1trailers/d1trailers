import { Inter, Sarina, Syne } from "next/font/google";
import "./globals.css";
import Header from "@/components/structure/Header";
import Footer from "@/components/structure/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const sarina = Sarina({
  weight: "400",
  variable: "--font-sarina",

  subsets: ["latin"],
});

export const metadata = {
  title: "D1Trailers",
  description: "The Home of D1Trailers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${syne.variable} ${sarina.variable} light:text-neutral-950 dark:text-neutral-50 font-inter antialiased text-sm md:text-md lg:text-lg`}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
