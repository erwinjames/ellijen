// Pure helpers (no Firebase import) so they can be unit-tested with plain node.
export type Rsvp = {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  guests: number; // additional guests, not counting the respondent
  message: string;
  createdAt: Date | null;
};

export function summarize(rows: Rsvp[]) {
  const yes = rows.filter((r) => r.attending);
  return {
    responses: rows.length,
    attending: yes.length,
    declined: rows.length - yes.length,
    headcount: yes.reduce((n, r) => n + 1 + r.guests, 0),
  };
}

// Leading = + - @ TAB CR would run as a formula in Excel/Sheets; a leading ' defuses it.
const csvCell = (v: unknown) => `"${String(typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? "'" + v : (v ?? "")).replace(/"/g, '""')}"`;

export function toCsv(rows: Rsvp[]) {
  const head = ["name", "email", "attending", "extra_guests", "message", "submitted"];
  const body = rows.map((r) =>
    [r.name, r.email, r.attending ? "yes" : "no", r.guests, r.message, r.createdAt?.toISOString() ?? ""]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...body].join("\n");
}
