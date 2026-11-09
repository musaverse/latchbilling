import type { Currency } from './types';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push((h ? 'and ' : '') + twoDigits(r));
  return parts.join(' ');
}

/** Indian numbering: crore, lakh, thousand. */
function indianWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push((parts.length && n < 100 ? 'and ' : '') + threeDigits(n));
  return parts.join(' ');
}

/** International numbering: billion, million, thousand. */
function westernWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales: [number, string][] = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
  const parts: string[] = [];
  for (const [value, name] of scales) {
    if (n >= value) {
      parts.push(`${threeDigits(Math.floor(n / value))} ${name}`);
      n %= value;
    }
  }
  if (n) parts.push((parts.length && n < 100 ? 'and ' : '') + threeDigits(n));
  return parts.join(' ');
}

const UNITS: Record<Currency, [string, string]> = {
  INR: ['Rupees', 'Paise'],
  USD: ['US Dollars', 'Cents'],
  EUR: ['Euros', 'Cents'],
  GBP: ['Pounds Sterling', 'Pence'],
  AED: ['UAE Dirhams', 'Fils'],
  SGD: ['Singapore Dollars', 'Cents'],
};

/** 27140 → "Rupees Twenty-Seven Thousand One Hundred and Forty Only." */
export function amountInWords(amount: number, currency: Currency = 'INR'): string {
  const value = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  const words = currency === 'INR' ? indianWords : westernWords;
  const [major, minor] = UNITS[currency];
  let text = `${major} ${words(whole)}`;
  if (fraction) text += ` and ${twoDigits(fraction)} ${minor}`;
  return `${text} Only.`;
}
