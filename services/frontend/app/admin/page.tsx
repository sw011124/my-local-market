"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { readAdminToken } from "@/lib/admin-session-client";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = readAdminToken();
    if (token) {
      router.replace("/admin/orders");
      return;
    }
    router.replace("/admin/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
      <section className="mx-auto max-w-md rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
        <p className="text-sm text-[#60756c]">관리자 페이지로 이동 중입니다...</p>
      </section>
    </main>
  );
}
