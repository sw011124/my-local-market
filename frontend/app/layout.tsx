import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "우리동네 마트",
  description: "가장 빠른 동네 배달",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-100`}>
        {/* 모바일 뷰 컨테이너: PC에서는 중앙 정렬, 모바일에서는 꽉 차게 */}
        <div className="max-w-[430px] mx-auto min-h-screen bg-white shadow-2xl relative">
          {children}
        </div>
      </body>
    </html>
  );
}
