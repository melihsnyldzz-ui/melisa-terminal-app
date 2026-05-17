import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurrencyCode, ExchangeRateSnapshot, SaleLine } from '../../types';
import type { CurrencySettings } from '../../types';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['TRY', 'USD', 'EUR'];

export const DEFAULT_EXCHANGE_RATES: ExchangeRateSnapshot = {
  USD_TO_TRY: 44.7,
  EUR_TO_TRY: 48.6,
  EUR_TO_USD: 1.087,
  USD_TO_EUR: 0.92,
};

const CURRENCY_SETTINGS_KEY = 'melisa-terminal:currency-settings';

export function normalizeCurrencyCode(value?: string | null): CurrencyCode {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'TL' || normalized === 'TRY') return 'TRY';
  if (normalized === 'USD') return 'USD';
  if (normalized === 'EUR') return 'EUR';
  return 'TRY';
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  return '₺';
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${safeAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function getExchangeRate(sourceCurrency: CurrencyCode, saleCurrency: CurrencyCode, rates: ExchangeRateSnapshot = DEFAULT_EXCHANGE_RATES): number {
  if (sourceCurrency === saleCurrency) return 1;
  if (sourceCurrency === 'USD' && saleCurrency === 'TRY') return rates.USD_TO_TRY;
  if (sourceCurrency === 'TRY' && saleCurrency === 'USD') return 1 / rates.USD_TO_TRY;
  if (sourceCurrency === 'EUR' && saleCurrency === 'TRY') return rates.EUR_TO_TRY;
  if (sourceCurrency === 'TRY' && saleCurrency === 'EUR') return 1 / rates.EUR_TO_TRY;
  if (sourceCurrency === 'EUR' && saleCurrency === 'USD') return rates.EUR_TO_USD;
  if (sourceCurrency === 'USD' && saleCurrency === 'EUR') return rates.USD_TO_EUR;
  return 1;
}

export function convertMoney(amount: number, sourceCurrency: CurrencyCode, saleCurrency: CurrencyCode, rates: ExchangeRateSnapshot = DEFAULT_EXCHANGE_RATES) {
  const exchangeRate = getExchangeRate(sourceCurrency, saleCurrency, rates);
  const convertedAmount = Number((amount * exchangeRate).toFixed(2));
  return { amount: convertedAmount, exchangeRate };
}

export async function loadCurrencySettings(): Promise<CurrencySettings | null> {
  try {
    const value = await AsyncStorage.getItem(CURRENCY_SETTINGS_KEY);
    if (!value) return null;
    const settings = JSON.parse(value) as CurrencySettings;
    return {
      ...DEFAULT_EXCHANGE_RATES,
      ...settings,
    };
  } catch {
    await AsyncStorage.removeItem(CURRENCY_SETTINGS_KEY);
    return null;
  }
}

export async function saveCurrencySettings(settings: CurrencySettings): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(settings));
}

export async function getEffectiveExchangeRates(): Promise<ExchangeRateSnapshot> {
  const settings = await loadCurrencySettings();
  if (!settings) return DEFAULT_EXCHANGE_RATES;
  return {
    USD_TO_TRY: settings.USD_TO_TRY,
    EUR_TO_TRY: settings.EUR_TO_TRY,
    EUR_TO_USD: settings.EUR_TO_USD,
    USD_TO_EUR: settings.USD_TO_EUR,
  };
}

export function calculateLineTotal(unitPrice: number, quantity: number, currency: CurrencyCode, saleCurrency: CurrencyCode = currency, rates: ExchangeRateSnapshot = DEFAULT_EXCHANGE_RATES) {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const originalUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const converted = convertMoney(originalUnitPrice, currency, saleCurrency, rates);
  return {
    sourceCurrency: currency,
    saleCurrency,
    exchangeRate: converted.exchangeRate,
    originalUnitPrice,
    convertedUnitPrice: converted.amount,
    originalLineTotal: Number((originalUnitPrice * safeQuantity).toFixed(2)),
    convertedLineTotal: Number((converted.amount * safeQuantity).toFixed(2)),
  };
}

export function normalizeSaleLineCurrency(line: SaleLine, saleCurrency?: CurrencyCode, rates: ExchangeRateSnapshot = DEFAULT_EXCHANGE_RATES): SaleLine {
  const sourceCurrency = normalizeCurrencyCode(line.sourceCurrency || line.currency);
  const targetCurrency = saleCurrency || normalizeCurrencyCode(line.saleCurrency || sourceCurrency);
  const originalUnitPrice = Number.isFinite(line.originalUnitPrice) ? line.originalUnitPrice || 0 : line.price;
  const totals = calculateLineTotal(originalUnitPrice, line.quantity, sourceCurrency, targetCurrency, rates);
  return {
    ...line,
    currency: sourceCurrency,
    price: totals.convertedUnitPrice,
    sourceCurrency,
    saleCurrency: targetCurrency,
    exchangeRate: totals.exchangeRate,
    originalUnitPrice: totals.originalUnitPrice,
    convertedUnitPrice: totals.convertedUnitPrice,
    originalLineTotal: totals.originalLineTotal,
    convertedLineTotal: totals.convertedLineTotal,
  };
}
