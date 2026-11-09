import type { AppData, Company } from './types';

export const DEFAULT_COMPANY: Company = {
  name: 'Latch Infinity Private Limited',
  address:
    '4th Floor, UNIT 1, B BLOCK, Uma Sree Dream World Apt, Garvebhavipalya, Kudlu Gate, Bengaluru Urban, Karnataka, 560068',
  email: 'info@latchinfinity.com',
  website: 'www.latchinfinity.com',
  gstin: '29AAFCL7230F1ZI',
  stateCode: '29',
  signatory: 'Authorised Signatory',
  numberPrefix: 'INLI',
  numberDigits: 5,
  defaultTaxRate: 18,
  defaultTdsRate: 10,
  defaultHsn: '998361',
  footerNote: 'Thank you for your business!',
  // Placeholder bank details for the shared demo. Enter the real ones in Settings.
  bank: {
    bankName: 'Sample Bank (demo)',
    branch: 'Demo branch, Bengaluru - 560001',
    accountNumber: '000000000000',
    accountType: 'Current',
    accountName: 'Latch Infinity Private Limited',
    swift: 'DEMOINBB000',
    ifsc: 'DEMO0000000',
  },
};

/**
 * Demo data shaped like the Nov 2026 register, with fictional clients
 * so the app can be shared publicly. Real clients are added in Clients.
 */
export function seedData(): AppData {
  return {
    company: DEFAULT_COMPANY,
    clients: [
      {
        id: 'c-sherwood',
        name: 'Riverside High',
        billingName: 'Riverside High School (demo client)',
        address: '12 Lake View Road, Bengaluru, Karnataka, 560001',
        gstin: '',
        stateCode: '29',
        email: '',
      },
      {
        id: 'c-kis',
        name: 'Hillcrest',
        billingName: 'Hillcrest International School (demo client)',
        address: '7 Hill Road, Ooty, The Nilgiris, Tamil Nadu, 643001, India',
        gstin: '33AAACH1234A1Z5',
        stateCode: '33',
        email: '',
      },
      {
        id: 'c-zari',
        name: 'Monsoon',
        billingName: 'Monsoon Retail Pvt Ltd (demo client)',
        address: '45 Brigade Road, Bengaluru, Karnataka, 560025',
        gstin: '29AAACM5678B1Z2',
        stateCode: '29',
        email: '',
      },
    ],
    invoices: [
      {
        id: 'i-35',
        seq: 35,
        number: '2627INLI00035',
        date: '2026-11-01',
        clientId: 'c-sherwood',
        title: 'Digital Marketing Service - Oct 2026',
        currency: 'INR',
        items: [{ id: 'l-35-1', description: 'Digital Marketing Service - Oct 2026', hsn: '998361', quantity: 1, rate: 50000 }],
        taxRate: 18,
        tdsRate: 10,
        notes: '',
        createdAt: '2026-11-01T10:00:00.000Z',
      },
      {
        id: 'i-36',
        seq: 36,
        number: '2627INLI00036',
        date: '2026-11-07',
        clientId: 'c-kis',
        title: 'Fridge Magnets B',
        currency: 'INR',
        items: [{ id: 'l-36-1', description: 'Fridge Magnets', hsn: '998361', quantity: 100, rate: 230 }],
        taxRate: 18,
        tdsRate: 10,
        notes: '',
        createdAt: '2026-11-07T10:00:00.000Z',
      },
      {
        id: 'i-37',
        seq: 37,
        number: '2627INLI00037',
        date: '2026-11-05',
        clientId: 'c-zari',
        title: 'Ad Operations - Nov 2026',
        currency: 'INR',
        items: [{ id: 'l-37-1', description: 'Ad Operations - Nov 2026', hsn: '998361', quantity: 1, rate: 100000 }],
        taxRate: 18,
        tdsRate: 10,
        notes: '',
        createdAt: '2026-11-05T10:00:00.000Z',
      },
    ],
  };
}
