import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "美人舟 BEAUTY BOAT | 福安 FOOK ON",
  description:
    "美人舟 BEAUTY BOAT by 福安 / FOOK ON. Traditional spice powders, five-spice powder, pepper powder, and custom blends in Singapore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
