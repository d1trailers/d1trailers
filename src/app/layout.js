import { Inter, Syne } from "next/font/google";
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

export const metadata = {
  title: "D1Trailers",
  description: "The Home of D1Trailers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${syne.variable} light:text-neutral-950 dark:text-neutral-50 font-inter antialiased text-sm md:text-md lg:text-lg`}>
        <Header />
        <div className="min-h-screen">{children}</div>

        <Footer />
      </body>
    </html>
  );
}
