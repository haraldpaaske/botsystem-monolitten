import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Melding from "./Melding";

jest.mock("../../hooks/usePlayers", () => () => ["Spiller", "Harald", "Håvard", "Tor"]);
jest.mock("../../hooks/fetchRules", () => () => [
  "§ 1 Forfall (50)",
  "§ 15b Frukt (350)",
  "§ 3 Utstyr (25 kr)",
  "§ 19 Falske anmeldelser (avgjøres i rettssak)",
  "§ 21 Miste fotball (25 per trening uten ball + kjøpe ny fotball)",
]);
jest.mock("../../firebaseConfig", () => ({ db: {} }));
jest.mock("firebase/database", () => ({
  ref: jest.fn(), onValue: jest.fn(), off: jest.fn(), set: jest.fn(),
}));

function Form() {
  const [formData, setFormData] = useState({
    brutt: [], melder: "", datoBrudd: "2026-10-11", paragraf: "",
    beskrivelse: "", enheter: 1, id: 0,
  });
  return <Melding formData={formData} updateFormData={(field, value) =>
    setFormData((previous) => ({ ...previous, [field]: value }))} />;
}

const selectRule = (value) => fireEvent.change(screen.getByLabelText("Hvilken paragraf er brudt?"), { target: { value } });

test("selecting a paragraph fills its rate and allows amounts above 30 kr", () => {
  render(<Form />);
  const amount = screen.getByLabelText("Beløp (kr):");
  selectRule("§ 1 Forfall (50)");
  expect(amount).toHaveValue(50);
  expect(amount).toBeValid();
  selectRule("§ 15b Frukt (350)");
  expect(amount).toHaveValue(350);
  expect(amount).toBeValid();
  selectRule("§ 3 Utstyr (25 kr)");
  expect(amount).toHaveValue(25);
});

test("amounts can be adjusted manually and are refreshed when the paragraph changes", () => {
  render(<Form />);
  const amount = screen.getByLabelText("Beløp (kr):");
  selectRule("§ 1 Forfall (50)");
  fireEvent.change(amount, { target: { value: "75" } });
  expect(amount).toHaveValue(75);
  fireEvent.change(screen.getByLabelText("Beskrivelse av situasjonen:"), { target: { value: "Beskrivelse" } });
  expect(amount).toHaveValue(75);
  selectRule("§ 15b Frukt (350)");
  expect(amount).toHaveValue(350);
});

test.each([
  "§ 19 Falske anmeldelser (avgjøres i rettssak)",
  "§ 21 Miste fotball (25 per trening uten ball + kjøpe ny fotball)",
])("variable rate requires manual input: %s", (rule) => {
  render(<Form />);
  selectRule("§ 1 Forfall (50)");
  selectRule(rule);
  const amount = screen.getByLabelText("Beløp (kr):");
  expect(amount).toHaveValue(null);
  expect(amount).toBeInvalid();
  fireEvent.change(amount, { target: { value: "100" } });
  expect(amount).toBeValid();
});


test("search filters names and allows multiple distinct offenders", () => {
  render(<Form />);
  const input = screen.getByRole("combobox", { name: "Hvem har brutt loven?" });
  fireEvent.change(input, { target: { value: "har" } });
  expect(screen.getByRole("option", { name: "Harald", exact: true })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Tor", exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "Harald", exact: true }));
  expect(input).toHaveValue("");
  expect(input).toBeValid();
  fireEvent.click(input);
  expect(screen.queryByRole("option", { name: "Harald", exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "Tor", exact: true }));
  expect(screen.getAllByRole("button", { name: "fjern" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "fjern" })[0]);
  fireEvent.click(input);
  expect(screen.getByRole("option", { name: "Harald", exact: true })).toBeInTheDocument();
});

test("reporter can be chosen with keyboard and unknown names are invalid", () => {
  render(<Form />);
  const input = screen.getByRole("combobox", { name: "Hvem er du?" });
  fireEvent.change(input, { target: { value: "HÅ" } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input).toHaveAttribute("aria-activedescendant");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input).toHaveValue("Håvard");
  expect(input).toBeValid();
  expect(input).toHaveAttribute("aria-expanded", "false");
  fireEvent.change(input, { target: { value: "Ukjent navn" } });
  expect(screen.getByRole("status")).toHaveTextContent("Ingen navn funnet");
  expect(input).toBeInvalid();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).toHaveAttribute("aria-expanded", "false");
});
