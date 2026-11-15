import Decimal from "decimal.js";
Decimal.set({ precision: 60, rounding: Decimal.ROUND_DOWN });
export const amount = (value: Decimal.Value) =>
  new Decimal(value).toDecimalPlaces(18).toFixed();
export const eth = (value: string) => {
  const n = new Decimal(value || "0");
  return `${n.toFixed(Math.max(2, n.decimalPlaces())).replace(".", ",")} ETH`;
};
export { Decimal };
