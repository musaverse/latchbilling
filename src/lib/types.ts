export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export interface BankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  accountType: string;
  accountName: string;
  swift: string;
  ifsc: string;
}

export interface Company {
  name: string;
  address: string;
  email: string;
  website: string;
  gstin: string;
  /** Two-digit GST state code, e.g. "29" for Karnataka. */
  stateCode: string;
  signatory: string;
  /** Middle part of the invoice number: 2627 + INLI + 00036. */
  numberPrefix: string;
  numberDigits: number;
  defaultTaxRate: number;
  defaultTdsRate: number;
  defaultHsn: string;
  footerNote: string;
  bank: BankDetails;
}

export interface Client {
  id: string;
  /** Short name used in the register, e.g. "KIS". */
  name: string;
  /** Full legal name printed on the invoice. */
  billingName: string;
  address: string;
  /** Empty when the client is not GST-registered. */
  gstin: string;
  stateCode: string;
  email: string;
}

export interface LineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  /** Running number within the financial year. */
  seq: number;
  /** Full invoice number, e.g. 2627INLI00036. */
  number: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  clientId: string;
  /** "Invoice Name" in the register, e.g. "Fridge Magnets B". */
  title: string;
  currency: Currency;
  items: LineItem[];
  taxRate: number;
  tdsRate: number;
  notes: string;
  createdAt: string;
}

export interface AppData {
  company: Company;
  clients: Client[];
  invoices: Invoice[];
}
