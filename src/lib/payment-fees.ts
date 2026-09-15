/**
 * PSP fee math. Amounts are PKR, rounded half-up to 2 decimal places (paisa).
 * Total = baseFare + flatFee + (baseFare * percentageFee / 100)
 */

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePayable(
  baseFare: number,
  flatFee: number,
  percentageFee: number,
): {
  baseFare: number;
  flatFee: number;
  percentageFee: number;
  percentageAmount: number;
  totalPayable: number;
} {
  const fare = roundMoney(baseFare);
  const flat = roundMoney(flatFee);
  const pct = roundMoney(percentageFee);
  const percentageAmount = roundMoney((fare * pct) / 100);
  const totalPayable = roundMoney(fare + flat + percentageAmount);

  return {
    baseFare: fare,
    flatFee: flat,
    percentageFee: pct,
    percentageAmount,
    totalPayable,
  };
}
