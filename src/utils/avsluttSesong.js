import { get, push, ref, runTransaction } from "firebase/database";
import { db } from "../firebaseConfig";
import { readBoter } from "./boter";
import { getPlayerBalance } from "../components/oversikt/betalingsoversikt";

export const RESTBOT_TEKST = "Ubetalte bøter fra forrige sesong";

export function buildNextSeason(root, seasonId, timestamp) {
  const fines = readBoter(root.boter);
  const payments = Object.values(root.innbetalinger || {}).filter(Boolean);
  const people = new Set(Object.values(root.roster || {}).filter(Boolean));
  fines.forEach((fine) => (Array.isArray(fine.brutt) ? fine.brutt : [fine.brutt]).filter(Boolean).forEach((person) => people.add(person)));
  payments.forEach((payment) => { if (payment.person) people.add(payment.person); });
  const archive = { ...root.arkiv };
  fines.forEach(({ databaseKey, ...fine }, index) => {
    archive[`${seasonId}_${index}`] = { ...fine, arkivert: timestamp, sesong: seasonId };
  });
  const nextFines = {};
  const nextPayments = {};
  const balances = [];
  [...people].forEach((person, index) => {
    const balance = getPlayerBalance(person, fines, payments);
    balances.push({ person, ...balance });
    if (balance.remaining > 0) {
      const id = `${seasonId}_${index}`;
      nextFines[id] = {
        id, brutt: [person], melder: "Systemet", paragraf: RESTBOT_TEKST,
        beskrivelse: RESTBOT_TEKST, enheter: balance.remaining,
        dato: timestamp.slice(0, 10), datoBrudd: timestamp.slice(0, 10),
      };
    }
    if (balance.credit > 0) {
      nextPayments[`${seasonId}_${index}`] = {
        person, belop: balance.credit, dato: timestamp,
        beskrivelse: "Til gode fra forrige sesong",
      };
    }
  });
  return {
    ...root,
    boter: nextFines,
    innbetalinger: nextPayments,
    arkiv: archive,
    sesong: { id: seasonId, startet: timestamp },
    sesongarkiv: {
      ...root.sesongarkiv,
      [seasonId]: { avsluttet: timestamp, innbetalinger: root.innbetalinger || {}, saldoer: balances },
    },
  };
}

export async function avsluttSesong() {
  const rootRef = ref(db);
  const snapshot = await get(rootRef);
  const initial = snapshot.val();
  if (!initial) throw new Error("Ingen sesongdata funnet.");
  const previousSeason = initial.sesong?.id || null;
  const seasonId = push(ref(db, "sesongarkiv")).key;
  const timestamp = new Date().toISOString();
  const result = await runTransaction(rootRef, (current) => {
    if (!current || (current.sesong?.id || null) !== previousSeason) return;
    // Recompute using the latest data if a fine or payment arrived concurrently.
    return buildNextSeason(current, seasonId, timestamp);
  }, { applyLocally: false });
  if (!result.committed) throw new Error("Sesongen er allerede endret. Last siden på nytt.");
}
