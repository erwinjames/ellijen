"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth(), String(f.get("email")), String(f.get("password")));
      router.replace("/admin");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code ?? "")
          ? "Invalid email or password."
          : code === "auth/too-many-requests"
            ? "Too many attempts. Please wait a few minutes and try again."
            : code === "auth/network-request-failed"
              ? "Can't reach the server. Check your connection."
              : "Sign-in failed. Please try again.",
      );
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-cream/70">
        Firebase is not configured. Copy .env.local.example to .env.local and fill in your project keys.
      </main>
    );
  }
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-3xl border border-cream/10 bg-ink-2 p-8">
        <h1 className="font-serif text-3xl">Admin sign in</h1>
        <input name="email" type="email" required placeholder="Email" autoComplete="username" className="w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold" />
        <div className="relative">
          <input name="password" type={show ? "text" : "password"} required placeholder="Password" autoComplete="current-password" className="w-full rounded-xl border border-cream/15 bg-ink py-3 pl-4 pr-12 outline-none focus:border-gold" />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-xl text-cream/50 transition-colors hover:text-gold focus-visible:outline focus-visible:outline-gold"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="size-5" aria-hidden>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-gold py-3 text-sm uppercase tracking-[0.3em] text-ink disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
