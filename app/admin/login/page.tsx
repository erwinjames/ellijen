"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth(), String(f.get("email")), String(f.get("password")));
      router.replace("/admin");
    } catch {
      setError("Invalid email or password.");
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
        <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className="w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold" />
        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-gold py-3 text-sm uppercase tracking-[0.3em] text-ink disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
