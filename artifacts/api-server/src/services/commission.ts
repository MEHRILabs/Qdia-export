export const COMMISSION_RATE = Number(process.env.COMMISSION_RATE ?? "0.03");

export function calcCommission(amount: number, rate = COMMISSION_RATE) {
  const commissionAmount = Math.round(amount * rate * 100) / 100;
  const netAmount = Math.round((amount - commissionAmount) * 100) / 100;
  return { commissionRate: rate, commissionAmount, netAmount };
}
