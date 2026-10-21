"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { deleteRsvp, subscribeRsvps, summarize, toCsv, type Rsvp } from "@/lib/rsvp";

type Filter = "all" | "yes" | "no";

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [rows, setRows] = useState<Rsvp[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => (u ? setUser(u) : router.replace("/admin/login")));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    return subscribeRsvps(setRows, (e) => setError(e.message));
  }, [user]);

  const stats = useMemo(() => summarize(rows), [rows]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.attending === (filter === "yes")) &&
        (!needle || `${r.name} ${r.email} ${r.message}`.toLowerCase().includes(needle)),
    );
  }, [rows, filter, q]);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(visible)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "rsvps.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(r: Rsvp) {
    if (!confirm(`Delete RSVP from ${r.name}?`)) return;
    await deleteRsvp(r.id).catch((e) => setError(e.message));
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-cream/70">
        Firebase is not configured. Copy .env.local.example to .env.local and fill in your project keys.
      </main>
    );
  }
  if (!user) return <main className="flex flex-1 items-center justify-center text-cream/50">Loading…</main>;

  const tab = (f: Filter, label: string) => (
    <button onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? "bg-gold text-ink" : "text-cream/70 hover:text-cream"}`}>
      {label}
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">RSVPs</h1>
        <div className="flex items-center gap-4 text-sm text-cream/60">
          <Link href="/admin/settings" className="rounded-full border border-gold/60 px-4 py-1.5 text-gold hover:bg-gold hover:text-ink">
            Site settings
          </Link>
          <span>{user.email}</span>
          <button onClick={() => signOut(auth())} className="rounded-full border border-cream/20 px-4 py-1.5 hover:border-gold">
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Responses", stats.responses],
          ["Attending", stats.attending],
          ["Declined", stats.declined],
          ["Total headcount", stats.headcount],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-cream/10 bg-ink-2 p-5">
            <div className="font-serif text-4xl text-gold">{n}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cream/60">{label}</div>
          </div>
        ))}
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-cream/10 p-1">
          {tab("all", "All")}
          {tab("yes", "Yes")}
          {tab("no", "No")}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="min-w-48 flex-1 rounded-full border border-cream/15 bg-ink px-4 py-2 text-sm outline-none focus:border-gold" />
        <button onClick={exportCsv} disabled={!visible.length} className="rounded-full border border-gold/60 px-4 py-2 text-sm text-gold hover:bg-gold hover:text-ink disabled:opacity-40">
          Export CSV ({visible.length})
        </button>
      </section>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-rose/40 bg-rose/10 p-4 text-sm text-rose">
          {error} — if this says permission denied, deploy firestore.rules and make sure you are signed in.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-cream/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-[0.2em] text-cream/60">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Attending</th>
              <th className="p-4">+Guests</th>
              <th className="p-4">Message</th>
              <th className="p-4">Submitted</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-cream/10 align-top">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-cream/70">{r.email || "—"}</td>
                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs ${r.attending ? "bg-emerald-500/20 text-emerald-300" : "bg-rose/20 text-rose"}`}>
                    {r.attending ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-4 tabular-nums">{r.attending ? r.guests : "—"}</td>
                <td className="max-w-xs whitespace-pre-wrap p-4 text-cream/70">{r.message || "—"}</td>
                <td className="p-4 text-cream/50">{r.createdAt?.toLocaleString() ?? "…"}</td>
                <td className="p-4">
                  <button onClick={() => remove(r)} className="text-xs text-cream/40 hover:text-rose">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-cream/40">
                  No RSVPs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
