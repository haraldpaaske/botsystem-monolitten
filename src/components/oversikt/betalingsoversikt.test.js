import { getPlayerBalance } from "./betalingsoversikt";

const fine = (amount, brutt = ["Anna"]) => ({ brutt, enheter: amount });

test.each([[0, 100], [50, 100], [100, 100], [200, 200]])("%i kr in fines produces %i kr due before payments", (amount, total) => {
  expect(getPlayerBalance("Anna", [fine(amount)], [])).toEqual({ total, paid: 0, remaining: total, credit: 0 });
});

test("minimum applies before payments, including full and partial payments", () => {
  const partial = [{ person: "Anna", belop: 40 }];
  expect(getPlayerBalance("Anna", [fine(50)], partial)).toEqual({ total: 100, paid: 40, remaining: 60, credit: 0 });
  expect(getPlayerBalance("Anna", [fine(50)], [...partial, { person: "Anna", belop: 60 }]).remaining).toBe(0);
});

test("new fines after payment count without reapplying the minimum as a new fine", () => {
  const paid = [{ person: "Anna", belop: 100 }];
  expect(getPlayerBalance("Anna", [fine(50), fine(25)], paid).remaining).toBe(0);
  expect(getPlayerBalance("Anna", [fine(50), fine(100)], paid).remaining).toBe(50);
});

test("matches names exactly, accepts numeric strings and retains credits", () => {
  const fines = [fine("200", "Anna"), fine(500, "Annabelle"), fine(-50)];
  const payments = [{ person: "Anna", belop: 160 }, { person: "Annabelle", belop: 500 }];
  expect(getPlayerBalance("Anna", fines, payments)).toEqual({ total: 150, paid: 160, remaining: 0, credit: 10 });
});

test("decimal payments are summed in whole øre", () => {
  expect(getPlayerBalance("Anna", [], [{ person: "Anna", belop: 0.1 }, { person: "Anna", belop: 0.2 }]).paid).toBe(0.3);
});
