import { useState } from 'react';
import { Field } from './ui';
import { STATES, isValidGstin, stateFromGstin } from '../lib/gst';
import { uid } from '../lib/format';
import type { Client } from '../lib/types';

const blank = (): Client => ({ id: uid(), name: '', billingName: '', address: '', gstin: '', stateCode: '', email: '' });

interface Props {
  initial?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

export function ClientForm({ initial, onSave, onCancel }: Props) {
  const [c, setC] = useState<Client>(initial ?? blank());
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Client>) => setC((prev) => ({ ...prev, ...patch }));

  const gstinBad = c.gstin.trim() !== '' && !isValidGstin(c.gstin);
  const errors = {
    name: !c.name.trim(),
    billingName: !c.billingName.trim(),
    stateCode: !c.stateCode,
    gstin: gstinBad,
  };
  const valid = !Object.values(errors).some(Boolean);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid) onSave({ ...c, gstin: c.gstin.trim().toUpperCase() });
      }}
    >
      <div className="grid-2">
        <Field label="Short name" hint="Used in the register, e.g. Hillcrest">
          <input
            className={`input${tried && errors.name ? ' invalid' : ''}`}
            value={c.name}
            onChange={(e) => set({ name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Billing name" hint="Full legal name printed on the invoice">
          <input
            className={`input${tried && errors.billingName ? ' invalid' : ''}`}
            value={c.billingName}
            onChange={(e) => set({ billingName: e.target.value })}
          />
        </Field>
        <Field label="Billing address" wide>
          <textarea className="input" rows={3} value={c.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field
          label="GSTIN"
          hint={gstinBad ? <span className="error">GSTIN should be 15 characters, like 33AABCK4259M1ZC</span> : 'Leave blank if the client is not GST-registered'}
        >
          <input
            className={`input mono${tried && errors.gstin ? ' invalid' : ''}`}
            value={c.gstin}
            maxLength={15}
            onChange={(e) => {
              const gstin = e.target.value.toUpperCase();
              const state = stateFromGstin(gstin);
              set({ gstin, ...(state ? { stateCode: state } : {}) });
            }}
          />
        </Field>
        <Field label="State (place of supply)" hint="Filled in from the GSTIN. Decides CGST+SGST vs IGST.">
          <select
            className={`input${tried && errors.stateCode ? ' invalid' : ''}`}
            value={c.stateCode}
            onChange={(e) => set({ stateCode: e.target.value })}
          >
            <option value="">Select state…</option>
            {Object.entries(STATES)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
          </select>
        </Field>
        <Field label="Email" hint="Optional, for sending invoices later">
          <input className="input" type="email" value={c.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save client
        </button>
      </div>
    </form>
  );
}
