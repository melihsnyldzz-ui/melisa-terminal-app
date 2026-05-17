import type { CurrencyCode, SaleLine } from '../../types';
import { formatMoney, normalizeSaleLineCurrency } from './currencyUtils';

export function formatSaleReceipt(params: {
  documentNo: string;
  customerName: string;
  saleCurrency: CurrencyCode;
  lines: SaleLine[];
  showSourcePrices?: boolean;
}) {
  const normalizedLines = params.lines.map((line) => normalizeSaleLineCurrency(line, params.saleCurrency));
  const totalAmount = normalizedLines.reduce((sum, line) => sum + (line.convertedLineTotal || 0), 0);
  const lineTexts = normalizedLines.map((line) => {
    const base = `${line.code} x${line.quantity} ${formatMoney(line.convertedLineTotal || 0, params.saleCurrency)}`;
    if (!params.showSourcePrices || line.sourceCurrency === params.saleCurrency) return base;
    return `${base} (Kaynak: ${formatMoney(line.originalLineTotal || 0, line.sourceCurrency || 'TRY')})`;
  });

  return [
    'MELISA TERMINAL',
    `FIS: ${params.documentNo}`,
    `MUSTERI: ${params.customerName}`,
    ...lineTexts,
    `GENEL TOPLAM: ${formatMoney(totalAmount, params.saleCurrency)}`,
  ].join('\n');
}
