import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCSA LMS Monitoring",
  description: "Sistem Monitoring dan Control LMS Kabupaten Sumedang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
