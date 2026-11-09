import { useState } from 'react';
import { Field, PageHeader } from '../components/ui';
import { STATES, formatInvoiceNumber, isValidGstin, stateFromGstin } from '../lib/gst';
import { todayIso } from '../lib/format';
import { useStore } from '../lib/store';
import type { BankDetails, Company } from '../lib/types';

export function Settings() {
  const { company, saveCompany, resetSampleData } = useStore();
  const [c, setC] = useState<Company>(company);
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<Company>) => {
    setSaved(false);
    setC((prev) => ({ ...prev, ...patch }));
  };
  const setBank = (patch: Partial<BankDetails>) => set({ bank: { ...c.bank, ...patch } });
  const gstinBad = !isValidGstin(c.gstin);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Company, bank and numbering details printed on every invoice."
        actions={
          <>
            {saved && <span className="saved">Saved</span>}
            <button
              className="btn btn-primary"
              disabled={gstinBad}
              onClick={() => {
                saveCompany(c);
                setSaved(true);
              }}
            >
              Save settings
            </button>
          </>
        }
      />

      <div className="settings">
        <section className="card">
          <h2 className="card-title">Company</h2>
          <div className="grid-2">
            <Field label="Company name" wide>
              <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Address" wide>
              <textarea className="input" rows={2} value={c.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="input" value={c.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Website">
              <input className="input" value={c.website} onChange={(e) => set({ website: e.target.value })} />
            </Field>
            <Field label="GSTIN" hint={gstinBad ? <span className="error">Enter a valid 15-character GSTIN</span> : undefined}>
              <input
                className={`input mono${gstinBad ? ' invalid' : ''}`}
                value={c.gstin}
                maxLength={15}
                onChange={(e) => {
                  const gstin = e.target.value.toUpperCase();
                  const s = stateFromGstin(gstin);
                  set({ gstin, ...(s ? { stateCode: s } : {}) });
                }}
              />
            </Field>
            <Field label="Registered state">
              <select className="input" value={c.stateCode} onChange={(e) => set({ stateCode: e.target.value })}>
                {Object.entries(STATES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Signatory line">
              <input className="input" value={c.signatory} onChange={(e) => set({ signatory: e.target.value })} />
            </Field>
            <Field label="Footer note">
              <input className="input" value={c.footerNote} onChange={(e) => set({ footerNote: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Bank details</h2>
          <div className="grid-2">
            <Field label="Name of the bank">
              <input className="input" value={c.bank.bankName} onChange={(e) => setBank({ bankName: e.target.value })} />
            </Field>
            <Field label="Name of the account">
              <input className="input" value={c.bank.accountName} onChange={(e) => setBank({ accountName: e.target.value })} />
            </Field>
            <Field label="Branch address" wide>
              <input className="input" value={c.bank.branch} onChange={(e) => setBank({ branch: e.target.value })} />
            </Field>
            <Field label="Account number">
              <input className="input mono" value={c.bank.accountNumber} onChange={(e) => setBank({ accountNumber: e.target.value })} />
            </Field>
            <Field label="Account type">
              <input className="input" value={c.bank.accountType} onChange={(e) => setBank({ accountType: e.target.value })} />
            </Field>
            <Field label="IFSC code">
              <input className="input mono" value={c.bank.ifsc} onChange={(e) => setBank({ ifsc: e.target.value })} />
            </Field>
            <Field label="Swift code">
              <input className="input mono" value={c.bank.swift} onChange={(e) => setBank({ swift: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Numbering &amp; defaults</h2>
          <div className="grid-2">
            <Field label="Number prefix" hint={`Next number looks like ${formatInvoiceNumber(c, todayIso(), 38)}`}>
              <input className="input mono" value={c.numberPrefix} onChange={(e) => set({ numberPrefix: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Digits in running number">
              <input
                className="input"
                type="number"
                min={3}
                max={8}
                value={c.numberDigits}
                onChange={(e) => set({ numberDigits: Number(e.target.value) })}
              />
            </Field>
            <Field label="Default GST rate (%)">
              <input className="input" type="number" value={c.defaultTaxRate} onChange={(e) => set({ defaultTaxRate: Number(e.target.value) })} />
            </Field>
            <Field label="Default TDS rate (%)">
              <input className="input" type="number" value={c.defaultTdsRate} onChange={(e) => set({ defaultTdsRate: Number(e.target.value) })} />
            </Field>
            <Field label="Default HSN / SAC">
              <input className="input mono" value={c.defaultHsn} onChange={(e) => set({ defaultHsn: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="card card-muted">
          <h2 className="card-title">Prototype data</h2>
          <p className="muted">
            This prototype saves everything in this browser only. Resetting brings back the Nov 2026 sample invoices and
            removes anything you've added.
          </p>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Reset to the sample data? Everything you added will be removed.')) {
                resetSampleData();
                location.hash = '/';
                location.reload();
              }
            }}
          >
            Reset sample data
          </button>
        </section>
      </div>
    </>
  );
}
