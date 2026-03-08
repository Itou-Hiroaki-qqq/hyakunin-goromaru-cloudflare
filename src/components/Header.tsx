"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push("/login");
  }

  return (
    <header className="navbar bg-base-100 shadow-sm border-b border-base-300">
      <div className="navbar-start">
        <Link
          href="/"
          className="btn btn-ghost text-lg font-bold px-2"
          onClick={() => setOpen(false)}
        >
          百人一首 -ゴロでマル覚え-
        </Link>
      </div>
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            className="btn btn-ghost btn-square"
            aria-label="メニュー"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 rounded-box z-50 mt-2 w-52 border border-base-300 shadow-lg"
          >
            <li>
              <Link href="/" onClick={() => setOpen(false)}>
                TOP
              </Link>
            </li>
            <li>
              <Link href="/learn" onClick={() => setOpen(false)}>
                学習リスト
              </Link>
            </li>
            <li>
              <Link href="/learn/tricky" onClick={() => setOpen(false)}>
                間違えやすい問題
              </Link>
            </li>
            <li>
              <Link href="/review" onClick={() => setOpen(false)}>
                復習ページ
              </Link>
            </li>
            <li>
              <button type="button" onClick={handleLogout}>
                ログアウト
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
