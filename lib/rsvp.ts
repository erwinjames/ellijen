import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Rsvp } from "./rsvp-utils";

export type { Rsvp } from "./rsvp-utils";
export { summarize, toCsv } from "./rsvp-utils";

const col = () => collection(db(), "rsvps");

export async function submitRsvp(input: Omit<Rsvp, "id" | "createdAt">) {
  await addDoc(col(), { ...input, createdAt: serverTimestamp() });
}

export function subscribeRsvps(cb: (rows: Rsvp[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(col(), orderBy("createdAt", "desc")),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            name: x.name ?? "",
            email: x.email ?? "",
            attending: !!x.attending,
            guests: Number(x.guests ?? 0),
            message: x.message ?? "",
            createdAt: x.createdAt instanceof Timestamp ? x.createdAt.toDate() : null,
          };
        }),
      ),
    onError,
  );
}

export const deleteRsvp = (id: string) => deleteDoc(doc(db(), "rsvps", id));
