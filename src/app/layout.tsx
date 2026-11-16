import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const rounded = localFont({
  src: "../../public/fonts/fredoka.ttf",
  variable: "--font-rounded",
  display: "swap",
});
const body = localFont({
  src: "../../public/fonts/nunito.ttf",
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "BIXINS · Seu pequeno mundo",
  description:
    "Um terreninho, muitos ovinhos e um mundão de Bixins para cuidar.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${rounded.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
