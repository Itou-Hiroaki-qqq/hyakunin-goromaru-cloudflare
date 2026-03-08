"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "ログインに失敗しました");
        return;
      }
      await refreshUser();
      router.push("/");
    } catch {
      setError("ログイン中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-base-200">
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">ログインページ</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="email">
              <span className="label-text">Email</span>
            </label>
            <input
              id="email"
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="password">
              <span className="label-text">Password</span>
            </label>
            <input
              id="password"
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-error text-sm" role="alert">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </div>
          <p className="text-sm text-center text-base-content/80 pt-2">
            初めての方の
            <Link href="/register" className="link link-primary ml-1">
              新規登録はこちら
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
