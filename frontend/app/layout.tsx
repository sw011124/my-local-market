import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "목감 로컬마켓",
  description: "동네 중소마트 자체배달 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-[#f6f4ef] text-[#1a2f27]">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
