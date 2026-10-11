import { push, ref, set } from "firebase/database";
import { readBoter, saveBot } from "./boter";

jest.mock("../firebaseConfig", () => ({ db: {} }));
jest.mock("firebase/database", () => ({ push: jest.fn(), ref: jest.fn(), set: jest.fn() }));
const bot = { brutt: ["Anna"], melder: "William", paragraf: "§ 18 Spy på fest (200)", enheter: 200, beskrivelse: "test" };

beforeEach(() => {
  jest.clearAllMocks();
  ref.mockImplementation((db, path) => path);
  let next = 0;
  push.mockImplementation((path) => ({ key: `unique-${++next}`, path }));
  set.mockResolvedValue();
});

test("first fine gets a child key even with an empty legacy ID", async () => {
  await saveBot({ ...bot, id: [] });
  expect(push).toHaveBeenCalledWith("boter");
  expect(set).toHaveBeenCalledWith({ key: "unique-1", path: "boter" }, { ...bot, id: "unique-1" });
});

test("simultaneous submissions use different keys", async () => {
  await Promise.all([saveBot(bot), saveBot(bot)]);
  expect(set.mock.calls[0][0].key).not.toBe(set.mock.calls[1][0].key);
});

test("failed writes are reported to the caller", async () => {
  set.mockRejectedValueOnce(new Error("permission denied"));
  await expect(saveBot(bot)).rejects.toThrow("permission denied");
});

test("the malformed root is read as one fine, not seven empty rows", () => {
  expect(readBoter(bot)).toEqual([{ ...bot, databaseKey: null }]);
});

test("root fine and newer children are both kept without treating nested children as fields", () => {
  expect(readBoter({ ...bot, newer: { ...bot, enheter: 50 } })).toEqual([
    { ...bot, databaseKey: null },
    { ...bot, enheter: 50, databaseKey: "newer" },
  ]);
});

test("empty, sparse and keyed collections work and invalid entries are ignored", () => {
  expect(readBoter(null)).toEqual([]);
  expect(readBoter([null, bot])).toEqual([{ ...bot, databaseKey: "1" }]);
  expect(readBoter({ a: bot, bad: "test", empty: null })).toEqual([{ ...bot, databaseKey: "a" }]);
});
