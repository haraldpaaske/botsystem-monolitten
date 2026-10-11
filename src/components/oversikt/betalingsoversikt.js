export const MINSTEBELOP = 100;

const ore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};

export function getPlayerBalance(player, fines, payments) {
  const fineTotal = fines
    .filter((fine) => Array.isArray(fine.brutt)
      ? fine.brutt.includes(player)
      : fine.brutt === player)
    .reduce((total, fine) => total + ore(fine.enheter), 0);
  const total = Math.max(MINSTEBELOP * 100, fineTotal);
  const paid = payments
    .filter((payment) => payment.person === player)
    .reduce((sum, payment) => sum + Math.max(0, ore(payment.belop)), 0);

  return {
    total: total / 100,
    paid: paid / 100,
    remaining: Math.max(0, total - paid) / 100,
    credit: Math.max(0, paid - total) / 100,
  };
}

export function formatKroner(value) {
  return `${new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 }).format(value)} kr`;
}
