import { get, push, ref, runTransaction } from "firebase/database";
import { avsluttSesong, buildNextSeason, RESTBOT_TEKST } from "./avsluttSesong";
jest.mock("../firebaseConfig", () => ({ db: {} }));
jest.mock("firebase/database", () => ({
  ref: jest.fn((db, path) => path || "root"), get: jest.fn(),
  push: jest.fn(), runTransaction: jest.fn(), set: jest.fn(),
}));
const now = "2026-10-11T12:00:00.000Z";
const fine = (person, amount) => ({ brutt: [person], enheter: amount, paragraf: "Test" });

beforeEach(() => {
  jest.clearAllMocks();
  ref.mockImplementation((db, path) => path || "root");
});

test("archives all fines, preserves previous archive and transfers unpaid balances once", () => {
  const root = {
    roster: { a: "Anna", b: "Bjørn", c: "Carl" },
    boter: { a: fine("Anna", 200), b: fine("Bjørn", 150) },
    innbetalinger: { a: { person: "Anna", belop: 75 }, b: { person: "Bjørn", belop: 150 } },
    arkiv: { old: fine("Anna", 25) }, regler: { text: "Behold" },
  };
  const next = buildNextSeason(root, "season-1", now);
  expect(Object.keys(next.arkiv)).toHaveLength(3);
  expect(next.arkiv.old).toEqual(root.arkiv.old);
  const carried = Object.values(next.boter);
  expect(carried.map(b => [b.brutt[0], b.enheter])).toEqual([["Anna", 125], ["Carl", 100]]);
  expect(carried.every(b => b.paragraf === RESTBOT_TEKST && b.beskrivelse === RESTBOT_TEKST)).toBe(true);
  expect(next.innbetalinger).toEqual({});
  expect(next.sesongarkiv['season-1'].innbetalinger).toEqual(root.innbetalinger);
  expect(next.regler).toEqual(root.regler);
  expect(Object.keys(root.boter)).toHaveLength(2);
});

test("legacy root fine and overpayments are preserved", () => {
  const next = buildNextSeason({ boter: fine("Anna", 200), roster: { a: "Anna" },
    innbetalinger: { a: { person: "Anna", belop: 250 } } }, "season-1", now);
  expect(Object.values(next.arkiv)[0].enheter).toBe(200);
  expect(next.boter).toEqual({});
  expect(Object.values(next.innbetalinger)[0].belop).toBe(50);
});

test("transaction recomputes balances from concurrent payments and rejects a second closure", async () => {
  const original = { boter: { a: fine("Anna", 200) }, roster: { a: "Anna" } };
  get.mockResolvedValue({ val: () => original });
  push.mockReturnValue({ key: "season-1" });
  runTransaction.mockImplementation(async (target, callback, options) => {
    expect(target).toBe("root");
    expect(options.applyLocally).toBe(false);
    const newer = { ...original, innbetalinger: { p: { person: "Anna", belop: 100 } } };
    expect(Object.values(callback(newer).boter)[0].enheter).toBe(100);
    expect(callback({ ...newer, sesong: { id: "already-closed" } })).toBeUndefined();
    return { committed: true };
  });
  await avsluttSesong();
});

test("aborted transactions surface an error rather than reporting success", async () => {
  get.mockResolvedValue({ val: () => ({ roster: { a: "Anna" } }) });
  push.mockReturnValue({ key: "season-1" });
  runTransaction.mockResolvedValue({ committed: false });
  await expect(avsluttSesong()).rejects.toThrow("Sesongen er allerede endret");
});
