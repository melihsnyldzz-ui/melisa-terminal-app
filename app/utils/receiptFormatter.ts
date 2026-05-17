import type { CurrencyCode, ExchangeRateSnapshot, SaleLine } from '../../types';
import { DEFAULT_EXCHANGE_RATES } from './currencyUtils';
import { formatMoney, normalizeSaleLineCurrency } from './currencyUtils';

export function formatSaleReceipt(params: {
  documentNo: string;
  customerName: string;
  saleCurrency: CurrencyCode;
  lines: SaleLine[];
  exchangeRateSnapshot?: ExchangeRateSnapshot;
  operatorName?: string;
  showOperator?: boolean;
  deviceName?: string;
  showDevice?: boolean;
  showSourcePrices?: boolean;
}) {
  const rates = params.exchangeRateSnapshot || DEFAULT_EXCHANGE_RATES;
  const normalizedLines = params.lines.map((line) => normalizeSaleLineCurrency(line, params.saleCurrency, rates));
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
    ...(params.showOperator && params.operatorName ? [`Operator: ${params.operatorName}`] : []),
    ...(params.showDevice && params.deviceName ? [`Device: ${params.deviceName}`] : []),
  ].join('\n');
}
