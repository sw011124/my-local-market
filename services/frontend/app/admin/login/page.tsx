"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminLogin } from "@/lib/market-api";
import { readAdminToken, saveAdminToken } from "@/lib/admin-session-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = readAdminToken();
    if (token) {
      router.replace("/admin/orders");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await adminLogin(username.trim(), password);
      saveAdminToken(result.access_token);
      router.push("/admin/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그인에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1a2f27] px-4 py-8">
      <section className="mx-auto max-w-md rounded-3xl border border-[#d8ddd3] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">관리자 로그인</h1>
        <p className="mt-2 text-sm text-[#60756c]">주문/콘텐츠 관리를 위해 로그인하세요.</p>

        {errorMessage && <p className="mt-3 rounded-xl bg-[#ffeceb] px-3 py-2 text-sm font-semibold text-[#8e3a30]">{errorMessage}</p>}

        <form className="mt-4 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="아이디"
            className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
            className="rounded-xl border border-[#d8ddd3] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#166847] px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#8cb5a4]"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
