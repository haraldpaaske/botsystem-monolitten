import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { onValue, push, ref, set, update } from "firebase/database";
import Oversikt from "./Oversikt";

jest.mock("../../hooks/usePlayers", () => () => ["Anna", "Bjørn"]);
jest.mock("../../hooks/fetchRules", () => () => []);
jest.mock("./RedigerSpillere", () => () => null);
jest.mock("./StyringsBot", () => () => null);
jest.mock("../../firebaseConfig", () => ({ db: {} }));
jest.mock("firebase/database", () => ({
  ref: jest.fn(), onValue: jest.fn(), set: jest.fn(), push: jest.fn(),
  update: jest.fn(), getDatabase: jest.fn(), query: jest.fn(),
  orderByChild: jest.fn(), equalTo: jest.fn(), get: jest.fn(),
}));

let database, subscriptions, nextId;
const snapshot = (path) => ({ val: () => database[path] });
const row = (name) => screen.getByText(name, { selector: ".bold" }).closest("li");
const pay = (name, amount) => {
  fireEvent.change(screen.getByLabelText(`Ny innbetaling for ${name}`), { target: { value: amount } });
  fireEvent.submit(screen.getByRole("form", { name: `Registrer innbetaling for ${name}` }));
};

beforeEach(() => {
  jest.clearAllMocks();
  database = { boter: null, innbetalinger: {} };
  subscriptions = {};
  nextId = 0;
  ref.mockImplementation((db, path) => path);
  push.mockImplementation((path) => `${path}/payment-${++nextId}`);
  onValue.mockImplementation((path, callback, error) => {
    subscriptions[path] = { callback, error };
    callback(snapshot(path));
    return () => delete subscriptions[path];
  });
  set.mockImplementation(async (path, payment) => {
    const [collection, key] = path.split("/");
    database[collection][key] = payment;
    subscriptions[collection]?.callback(snapshot(collection));
  });
});

test("players with no fines have 100 kr minimum and no reported-fine penalty", () => {
  render(<Oversikt botsjef />);
  expect(within(row("Anna")).getByText("Bøter: 100 kr")).toBeInTheDocument();
  expect(within(row("Bjørn")).getByText("Bøter: 100 kr")).toBeInTheDocument();
  expect(screen.queryByText(/Meldt/)).not.toBeInTheDocument();
});

test("partial payments affect only their recipient and persist after reopening", async () => {
  const { unmount } = render(<Oversikt botsjef />);
  fireEvent.click(screen.getByRole("button", { name: "Registrere innbetalte bøter" }));
  pay("Anna", "40");
  await within(row("Anna")).findByText("Innbetaling registrert.");
  expect(within(row("Anna")).getByText("Innbetalt: 40 kr")).toBeInTheDocument();
  expect(within(row("Anna")).getByText("Gjenstår: 60 kr")).toBeInTheDocument();
  expect(within(row("Bjørn")).getByText("Innbetalt: 0 kr")).toBeInTheDocument();
  expect(within(row("Bjørn")).getByText("Gjenstår: 100 kr")).toBeInTheDocument();
  expect(set).toHaveBeenCalledTimes(1);
  expect(set.mock.calls[0][0]).toBe("innbetalinger/payment-1");
  expect(database.boter).toBeNull();
  pay("Anna", "60");
  await waitFor(() => expect(within(row("Anna")).getByText("Innbetalt: 100 kr")).toBeInTheDocument());
  expect(within(row("Anna")).getByText("Gjenstår: 0 kr")).toBeInTheDocument();
  unmount();
  render(<Oversikt botsjef={false} />);
  expect(within(row("Anna")).getByText("Innbetalt: 100 kr")).toBeInTheDocument();
  expect(within(row("Bjørn")).getByText("Innbetalt: 0 kr")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Registrere innbetalte bøter" })).not.toBeInTheDocument();
});

test("failed payment retains input and retries the same payment ID", async () => {
  set.mockRejectedValueOnce(new Error("permission denied"));
  render(<Oversikt botsjef />);
  fireEvent.click(screen.getByRole("button", { name: "Registrere innbetalte bøter" }));
  pay("Anna", "40");
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Ny innbetaling for Anna")).toHaveValue(40);
  expect(within(row("Anna")).getByText("Innbetalt: 0 kr")).toBeInTheDocument();
  fireEvent.submit(screen.getByRole("form", { name: "Registrer innbetaling for Anna" }));
  await within(row("Anna")).findByText("Innbetaling registrert.");
  expect(set.mock.calls[0][0]).toBe(set.mock.calls[1][0]);
  expect(push).toHaveBeenCalledTimes(1);
});

test("double submission is blocked while saving", async () => {
  let finish;
  set.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<Oversikt botsjef />);
  fireEvent.click(screen.getByRole("button", { name: "Registrere innbetalte bøter" }));
  pay("Anna", "40");
  fireEvent.submit(screen.getByRole("form", { name: "Registrer innbetaling for Anna" }));
  expect(set).toHaveBeenCalledTimes(1);
  await act(async () => finish());
});

test("new fines count immediately and payments are never subtracted from someone else's balance", () => {
  database.boter = { sparseKey: { id: 2000, brutt: ["Anna"], enheter: "200" } };
  database.innbetalinger = { previous: { person: "Anna", belop: 100 } };
  render(<Oversikt botsjef />);
  expect(within(row("Anna")).getByText("Bøter: 200 kr")).toBeInTheDocument();
  expect(within(row("Anna")).getByText("Gjenstår: 100 kr")).toBeInTheDocument();
  act(() => {
    database.boter.extra = { id: 2001, brutt: ["Anna"], enheter: 50 };
    subscriptions.boter.callback(snapshot("boter"));
  });
  expect(within(row("Anna")).getByText("Gjenstår: 150 kr")).toBeInTheDocument();
  expect(within(row("Bjørn")).getByText("Gjenstår: 100 kr")).toBeInTheDocument();
  expect(subscriptions.antall_boter).toBeUndefined();
});

test("a payment-read error never shows an incorrect zero paid total", () => {
  render(<Oversikt botsjef />);
  act(() => subscriptions.innbetalinger.error(new Error("permission denied")));
  expect(screen.getByRole("alert")).toHaveTextContent("Kunne ikke hente");
  expect(screen.queryByText("Innbetalt: 0 kr")).not.toBeInTheDocument();
});


test("legacy court costs are not loaded, shown or included in balances", () => {
  database.boter = { fine: { id: 1, brutt: ["Anna"], melder: "Bjørn", enheter: 200 } };
  database.saks = { old: { person: "Anna", bot_id: 1 } };
  render(<Oversikt botsjef />);
  fireEvent.click(screen.getByRole("button", { name: "Rettsak", exact: true }));
  expect(within(row("Anna")).getByText("Bøter: 200 kr")).toBeInTheDocument();
  expect(within(row("Anna")).getByText("Gjenstår: 200 kr")).toBeInTheDocument();
  expect(subscriptions.saks).toBeUndefined();
  expect(screen.queryByText(/saksomkostning/i)).not.toBeInTheDocument();
});

test("first fine accidentally stored at root is displayed once and included in the balance", () => {
  database.boter = { brutt: ["Anna"], melder: "Bjørn", paragraf: "§ 18 Spy på fest (200)",
    enheter: 200, beskrivelse: "Første bot", dato: "Sun Oct 11 2026", datoBrudd: "2026-10-11" };
  render(<Oversikt botsjef />);
  expect(screen.getByText("Første bot")).toBeInTheDocument();
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  expect(within(row("Anna")).getByText("Bøter: 200 kr")).toBeInTheDocument();
});


test.each([null, "stored-key"])("amount editing updates the actual database path (%s)", async (key) => {
  const fine = { id: [], brutt: ["Anna"], enheter: 200 };
  database.boter = key === null ? fine : { [key]: fine };
  update.mockResolvedValue();
  render(<Oversikt botsjef />);
  fireEvent.click(screen.getByRole("button", { name: "Rettsak", exact: true }));
  fireEvent.change(within(screen.getByRole("table")).getByRole("spinbutton"), { target: { value: "250" } });
  await waitFor(() => expect(update).toHaveBeenCalledWith(key === null ? "boter" : "boter/stored-key", { enheter: 250 }));
});
