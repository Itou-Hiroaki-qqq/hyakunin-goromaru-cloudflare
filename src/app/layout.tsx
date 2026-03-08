import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "百人ゴロ丸",
  description: "百人一首をゴロで覚える学習アプリ",
  manifest: "/manifest.json",
  themeColor: "#f5a623",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "百人一首C-ゴロでマル覚え-",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
