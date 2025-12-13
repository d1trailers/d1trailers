import { Inter, Syne } from "next/font/google";
import "./globals.css";

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
        className={`${inter.variable} ${syne.variable} font-inter antialiased text-sm md:text-md lg:text-lg`}>
        {children}
      </body>
    </html>
  );
}
