export interface InvoiceLine {
  description: string;
  hs_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface InvoiceDraft {
  number: string;
  productName: string;
  productId?: number;
  supplierName: string;
  buyerName: string;
  supplierAddress: string;
  buyerAddress: string;
  portDepart: string;
  portArrival: string;
  incoterm: string;
  currency: string;
  lines: InvoiceLine[];
  amount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
}

export function calcTotals(lines: InvoiceLine[], commissionRate = 0.03) {
  const amount = lines.reduce((s, l) => s + l.total, 0);
  const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
  const netAmount = Math.round((amount - commissionAmount) * 100) / 100;
  return { amount, commissionAmount, netAmount };
}

export function newInvoiceNumber() {
  return `QDIA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}
