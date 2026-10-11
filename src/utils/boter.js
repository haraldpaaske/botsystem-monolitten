import { push, ref, set } from "firebase/database";
import { db } from "../firebaseConfig";

export async function saveBot(bot) {
  const target = push(ref(db, "boter"));
  await set(target, { ...bot, id: target.key });
}

const isBot = (value) => value && typeof value === "object" && !Array.isArray(value)
  && (Array.isArray(value.brutt) || typeof value.brutt === "string")
  && value.enheter != null && Number.isFinite(Number(value.enheter));

export function readBoter(value) {
  if (!value || typeof value !== "object") return [];
  const entries = Object.entries(value)
    .filter(([, entry]) => isBot(entry))
    .map(([databaseKey, entry]) => ({ ...entry, databaseKey }));

  // Earlier versions accidentally saved the first fine directly at /boter.
  // Read that fine alongside subsequent children without treating its fields as rows.
  if (isBot(value)) {
    const legacy = {};
    ["brutt", "melder", "datoBrudd", "paragraf", "dato", "beskrivelse", "enheter", "id"].forEach((field) => {
      if (value[field] !== undefined) legacy[field] = value[field];
    });
    entries.unshift({ ...legacy, databaseKey: null });
  }
  return entries;
}
