import { useState, useMemo, useCallback } from 'react'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const QBO_OPTIONS = ['None', 'QBO Essentials', 'QBO Plus', 'QBO Self Employed', 'QBO Advanced']
const AP_OPTIONS  = ['None', 'Circulus', 'Bill.com', 'Plooto']
const PAYROLL_OPTIONS = ['None', 'Patriot', 'Gusto', 'GetPayroll']
const PAYROLL_FREQ    = ['None', 'Monthly', 'BiWeekly', 'Weekly']
const SALES_TAX_OPTIONS = ['None', 'Taxjar.com']
const SALES_TXN_RANGES  = ['None', '<1,000', '1,000-5,000', '5,000-10,000']

// ─── CALCULATOR LOGIC ─────────────────────────────────────────────────────────
function calculate(s) {
  const hr = Math.max(0, Number(s.hourlyRate) || 0)

  // ── STANDARD PACKAGE ──
  const transactionsFee     = (Number(s.transactions)  * 0.02)  * hr
  const bankFee             = (Number(s.bankAccounts)   * 0.5)   * hr
  const loansFee            = (Number(s.loans)          * 0.2)   * hr
  const contactsFee         = (Number(s.additionalContacts) * 1) * hr
  const phoneVideoFee       = s.phoneVideo      === 'Yes' ? (1 * hr)   : 0
  const financialReportsFee = s.financialReports === 'Yes' ? (1 * hr)  : 0
  const annualReportsFee    = s.annualReports   === 'Yes' ? (0.1 * hr) : 0

  const qboSub = { 'QBO Plus': 40, 'QBO Essentials': 25, 'QBO Self Employed': 10, 'QBO Advanced': 115, 'None': 0 }[s.qbo] ?? 0
  const hubdocSub = s.hubdoc === 'Yes' ? 20 : 0

  const stdService  = transactionsFee + bankFee + loansFee + contactsFee + phoneVideoFee + financialReportsFee + annualReportsFee
  const stdSoftware = qboSub + hubdocSub
  const stdTotal    = stdService + stdSoftware   // J13

  // ── UPSELLS ──
  const consultingFee   = (Number(s.additionalConsulting) * 1) * hr
  const budgetingFee    = s.monthlyBudgeting    === 'Yes' ? (1 * hr) : 0
  const benchmarkingFee = s.monthlyBenchmarking === 'Yes' ? (1 * hr) : 0
  const arFee           = s.arManagement        === 'Yes' ? (1 * hr) : 0
  const invoicesFee     = (Number(s.invoicesPerMonth) * 0.1) * hr

  const apSub = { 'Circulus': 20.5, 'Bill.com': 49, 'Plooto': 0, 'None': 0 }[s.apManagement] ?? 0
  const bills = Number(s.billsPerMonth)
  const billsServiceFee = s.apManagement !== 'None' ? (0.1 * bills * hr) : 0
  const billsSoftFee    = s.apManagement === 'Circulus' ? 2.38 * bills
                         : s.apManagement === 'Bill.com' ? 2.49 * bills
                         : s.apManagement === 'Plooto'   ? 1.75 * bills
                         : 0

  const payrollBaseSub  = { 'Patriot': 20, 'Gusto': 39, 'GetPayroll': 0, 'None': 0 }[s.payrollMgmt] ?? 0
  const emp = Number(s.numEmployees)
  const payrollPerEmpFee = s.payrollMgmt === 'Patriot' ? 2 * emp
                         : s.payrollMgmt === 'Gusto'   ? 6 * emp
                         : 0
  const payrollFreqFee  = s.payrollFrequency === 'Monthly'  ? emp * hr * 0.1
                         : s.payrollFrequency === 'Weekly'  ? emp * (hr * 0.1) * 4
                         : s.payrollFrequency === 'BiWeekly'? emp * (hr * 0.1) * 2
                         : 0

  const salesTaxServiceFee = s.salesTaxReporting === 'Taxjar.com' ? (1 * hr) : 0
  const salesTaxSoftFee    = { '<1,000': 17, '1,000-5,000': 44, '5,000-10,000': 89, 'None': 0 }[s.salesTransactions] ?? 0
  const autofilingFee      = Number(s.numStates) * 19.99

  // 401k: discount of -$1.50 per employee when enabled
  const fourOOneKDiscount  = s.fourOOneK === 'Yes' ? (-1.5 * Number(s.numEmployees401k)) : 0

  const additionalReportsFee = (Number(s.additionalReports) * 0.5) * hr

  const upsellService  = consultingFee + budgetingFee + benchmarkingFee + arFee + invoicesFee + billsServiceFee + payrollFreqFee + salesTaxServiceFee
  const upsellSoftware = apSub + billsSoftFee + payrollBaseSub + payrollPerEmpFee + salesTaxSoftFee + autofilingFee
  const upsellOther    = fourOOneKDiscount + additionalReportsFee
  const upsellTotal    = upsellService + upsellSoftware + upsellOther   // J33

  // ── ONE-TIME FEES ──
  // G35: IF(E35="Yes", 2.5*C1, 0)
  const setupFee     = s.softwareSetup === 'Yes' ? (2.5 * hr) : 0
  // G36: E36 * C1
  const trainingFee  = Number(s.trainingHours) * hr
  // G37 = E37 * J13; J37 = G37 * 0.6  (60% of catch-up months × monthly total)
  const catchUpFee   = (Number(s.catchUpMonths) * stdTotal) * 0.6
  // G38 = J13 * 1.5 * E38; J38 = G38 * 0.5  (50% of 1.5x monthly × historical months)
  const historicalFee = (stdTotal * 1.5 * Number(s.historicalMonths)) * 0.5
  const oneTimeTotal  = setupFee + trainingFee + catchUpFee + historicalFee   // J39

  // ── GRAND TOTALS ──
  const firstMonthTotal    = stdTotal + upsellTotal + oneTimeTotal  // J41
  const ongoingMonthlyTotal = stdTotal + upsellTotal                // J42

  return {
    transactionsFee, bankFee, loansFee, contactsFee, phoneVideoFee,
    financialReportsFee, annualReportsFee, qboSub, hubdocSub,
    stdService, stdSoftware, stdTotal,

    consultingFee, budgetingFee, benchmarkingFee, arFee, invoicesFee,
    apSub, billsServiceFee, billsSoftFee,
    payrollBaseSub, payrollPerEmpFee, payrollFreqFee,
    salesTaxServiceFee, salesTaxSoftFee, autofilingFee,
    fourOOneKDiscount, additionalReportsFee,
    upsellTotal,

    setupFee, trainingFee, catchUpFee, historicalFee, oneTimeTotal,
    firstMonthTotal, ongoingMonthlyTotal,
  }
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmt = (v) => v === 0 ? '—' : `$${Math.round(v).toLocaleString()}`
const fmtRaw = (v) => `$${Math.round(Math.abs(v)).toLocaleString()}`

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function NumInput({ value, onChange, min = 0, className = '' }) {
  return (
    <input
      type="number"
      className={`num-input ${className}`}
      value={value}
      min={min}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function Toggle({ value, onChange }) {
  return (
    <div className="toggle-group">
      <button className={`toggle-btn ${value === 'Yes' ? 'active-yes' : ''}`} onClick={() => onChange('Yes')}>Yes</button>
      <button className={`toggle-btn ${value === 'No'  ? 'active-no'  : ''}`} onClick={() => onChange('No')}>No</button>
    </div>
  )
}

function Sel({ value, onChange, options }) {
  return (
    <select className="sel-input" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function PriceCell({ value, type = 'service' }) {
  const isZero = value === 0
  const className = `row-price ${isZero ? '' : type === 'software' ? 'software' : type === 'discount' ? 'negative' : 'gold'}`
  return <div className={className}>{type === 'discount' ? `-${fmtRaw(value)}` : fmt(value)}</div>
}

function Row({ label, inputEl, price, type }) {
  return (
    <div className="calc-row">
      <div className="row-label">{label}</div>
      <div className="row-input">{inputEl}</div>
      <PriceCell value={price} type={type} />
    </div>
  )
}

function SectionTotalRow({ label, value }) {
  return (
    <div className="section-total-row">
      <span className="total-row-label">{label}</span>
      <span className="total-row-value">{fmt(value)}</span>
    </div>
  )
}

function SubSection({ title, total, children }) {
  const [open, setOpen] = useState(true)
  const isZero = total === 0
  return (
    <div className="sub-section">
      <div className="sub-section-header" onClick={() => setOpen(o => !o)}>
        <span className="sub-section-title">
          {title}
          <span className={`sub-total-badge ${isZero ? 'zero' : ''}`}>{fmt(total)}</span>
        </span>
        <span className={`sub-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && <div className="sub-section-body">{children}</div>}
    </div>
  )
}

// ─── REAL ESTATE TRANSACTION HELPER ───────────────────────────────────────────
function REHelper({ onUse }) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState(
    Array.from({ length: 5 }, (_, i) => ({ name: `Account ${i + 1}`, q: '' }))
  )

  const updateQ = (i, v) => setAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, q: v } : a))
  const updateName = (i, v) => setAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, name: v } : a))

  const total = useMemo(() => {
    const sum = accounts.reduce((acc, a) => {
      const q = Number(a.q)
      return isNaN(q) ? acc : acc + q / 3
    }, 0)
    return Math.round(sum)
  }, [accounts])

  return (
    <div className="re-helper">
      <div className="section-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <div className="section-title-group">
          <span className="section-icon">🏘️</span>
          <span className="section-title">Real Estate Transaction Estimator</span>
        </div>
        <span className={`section-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="section-body">
          <table className="re-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Last Quarter Txns</th>
                <th>Monthly Avg</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => {
                const q = Number(a.q)
                const avg = a.q !== '' && !isNaN(q) ? (q / 3).toFixed(1) : '—'
                return (
                  <tr key={i}>
                    <td>
                      <input
                        type="text"
                        value={a.name}
                        onChange={e => updateName(i, e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', width: '130px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input type="number" min="0" value={a.q} onChange={e => updateQ(i, e.target.value)} placeholder="0" />
                    </td>
                    <td style={{ color: a.q !== '' ? 'var(--text)' : 'var(--text-dim)', fontWeight: a.q !== '' ? 600 : 400 }}>{avg}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="re-result-bar">
            <span className="re-label">Estimated Monthly Transactions Total:</span>
            <span className="re-value">{total}</span>
            {total > 0 && (
              <button className="re-use-btn" onClick={() => { onUse(total); setOpen(false) }}>
                Use this value →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const INITIAL = {
  hourlyRate: 50,
  clientName: '', quoteDate: new Date().toISOString().split('T')[0], effectiveDate: '',

  // Standard
  transactions: 80, bankAccounts: 3, loans: 0, additionalContacts: 0,
  phoneVideo: 'No', financialReports: 'No', annualReports: 'No',
  qbo: 'None', hubdoc: 'No',

  // Upsells
  additionalConsulting: 0, monthlyBudgeting: 'No', monthlyBenchmarking: 'No',
  arManagement: 'No', invoicesPerMonth: 0,
  apManagement: 'None', billsPerMonth: 0,
  payrollMgmt: 'None', numEmployees: 0, payrollFrequency: 'None',
  salesTaxReporting: 'None', salesTransactions: 'None', numStates: 0,
  fourOOneK: 'No', numEmployees401k: 0,
  additionalReports: 0,

  // One-Time
  softwareSetup: 'No', trainingHours: 0, catchUpMonths: 0, historicalMonths: 0,
}

export default function App() {
  const [s, setS] = useState(INITIAL)
  const [openSections, setOpenSections] = useState({ standard: true, upsells: true, onetime: false, summary: true })
  const [copied, setCopied] = useState(false)

  const set = useCallback((key, val) => setS(prev => ({ ...prev, [key]: val })), [])
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const c = useMemo(() => calculate(s), [s])

  // ── COPY QUOTE ──
  const copyQuote = () => {
    const lines = [
      `PROFIT CLARITY ADVANTAGE™ — CLIENT QUOTE`,
      `${'─'.repeat(44)}`,
      s.clientName   ? `Client:         ${s.clientName}`         : null,
      s.quoteDate    ? `Date of Quote:  ${s.quoteDate}`          : null,
      s.effectiveDate? `Effective Date: ${s.effectiveDate}`      : null,
      ``,
      `STANDARD BOOKKEEPING PACKAGE`,
      c.transactionsFee   > 0 ? `  Transactions (${s.transactions}/mo):     ${fmt(c.transactionsFee)}` : null,
      c.bankFee           > 0 ? `  Bank/CC Accounts (${s.bankAccounts}):     ${fmt(c.bankFee)}` : null,
      c.loansFee          > 0 ? `  Loans (${s.loans}):                ${fmt(c.loansFee)}` : null,
      c.contactsFee       > 0 ? `  Add'l Contacts (${s.additionalContacts}):      ${fmt(c.contactsFee)}` : null,
      c.phoneVideoFee     > 0 ? `  Monthly Phone/Video Chat:         ${fmt(c.phoneVideoFee)}` : null,
      c.financialReportsFee>0 ? `  Standard Financial Reports:      ${fmt(c.financialReportsFee)}` : null,
      c.annualReportsFee  > 0 ? `  Annual Reports for Tax Prep:     ${fmt(c.annualReportsFee)}` : null,
      c.qboSub            > 0 ? `  ${s.qbo} Subscription:            ${fmt(c.qboSub)}` : null,
      c.hubdocSub         > 0 ? `  Hubdoc Subscription:             ${fmt(c.hubdocSub)}` : null,
      `  SUBTOTAL:                         ${fmt(c.stdTotal)}`,
      c.upsellTotal !== 0 ? `` : null,
      c.upsellTotal !== 0 ? `ADD-ON SERVICES` : null,
      c.consultingFee     > 0 ? `  Consulting (${s.additionalConsulting} hrs):           ${fmt(c.consultingFee)}` : null,
      c.budgetingFee      > 0 ? `  Monthly Budgeting:               ${fmt(c.budgetingFee)}` : null,
      c.benchmarkingFee   > 0 ? `  Monthly Benchmarking:            ${fmt(c.benchmarkingFee)}` : null,
      c.arFee             > 0 ? `  A/R Management:                  ${fmt(c.arFee)}` : null,
      c.invoicesFee       > 0 ? `  Invoicing (${s.invoicesPerMonth}/mo):              ${fmt(c.invoicesFee)}` : null,
      (c.apSub+c.billsServiceFee+c.billsSoftFee)>0 ? `  A/P Bill-Pay (${s.apManagement}):         ${fmt(c.apSub+c.billsServiceFee+c.billsSoftFee)}` : null,
      (c.payrollBaseSub+c.payrollPerEmpFee+c.payrollFreqFee)>0 ? `  Payroll Mgmt (${s.payrollMgmt}):          ${fmt(c.payrollBaseSub+c.payrollPerEmpFee+c.payrollFreqFee)}` : null,
      (c.salesTaxServiceFee+c.salesTaxSoftFee+c.autofilingFee)>0 ? `  Sales/Use Tax:                   ${fmt(c.salesTaxServiceFee+c.salesTaxSoftFee+c.autofilingFee)}` : null,
      c.fourOOneKDiscount < 0 ? `  401k Management Discount:        -${fmtRaw(c.fourOOneKDiscount)}` : null,
      c.additionalReportsFee>0 ? `  Additional Reports (${s.additionalReports}):       ${fmt(c.additionalReportsFee)}` : null,
      c.upsellTotal !== 0 ? `  SUBTOTAL:                         ${fmt(c.upsellTotal)}` : null,
      c.oneTimeTotal      > 0 ? `` : null,
      c.oneTimeTotal      > 0 ? `ONE-TIME FEES` : null,
      c.setupFee          > 0 ? `  Accounting Software Setup:       ${fmt(c.setupFee)}` : null,
      c.trainingFee       > 0 ? `  Consulting/Training (${s.trainingHours} hrs):    ${fmt(c.trainingFee)}` : null,
      c.catchUpFee        > 0 ? `  Catch-Up (${s.catchUpMonths} months @ 60%):      ${fmt(c.catchUpFee)}` : null,
      c.historicalFee     > 0 ? `  Historical Clean-Up (${s.historicalMonths} months):  ${fmt(c.historicalFee)}` : null,
      c.oneTimeTotal      > 0 ? `  SUBTOTAL:                         ${fmt(c.oneTimeTotal)}` : null,
      ``,
      `${'─'.repeat(44)}`,
      `ONGOING MONTHLY TOTAL:    ${fmt(c.ongoingMonthlyTotal)}`,
      `1ST MONTH TOTAL:          ${fmt(c.firstMonthTotal)}`,
      `${'─'.repeat(44)}`,
    ].filter(l => l !== null).join('\n')

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* STICKY HEADER */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-logo">
            Profit Clarity Advantage™ <span>/ QUOTE TOOL</span>
          </div>
          <div className="header-totals">
            <div className="header-total-chip">
              <span className="chip-label">Monthly</span>
              <span className="chip-value">{fmt(c.ongoingMonthlyTotal)}</span>
            </div>
            <div className="header-total-chip primary">
              <span className="chip-label">1st Month</span>
              <span className="chip-value gold">{fmt(c.firstMonthTotal)}</span>
            </div>
          </div>
          <button className="header-print-btn" onClick={() => window.print()}>
            🖨️ Print Quote
          </button>
        </div>
      </header>

      <div className="app-wrapper">
        <div className="page-content">

          {/* PRINT HEADER — only visible when printing */}
          <div className="print-header" style={{ display: 'none' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#b8860b' }}>Profit Clarity Advantage™</div>
              <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 2 }}>Client Pricing Quote</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#555' }}>
              {s.clientName && <div><strong>Client:</strong> {s.clientName}</div>}
              {s.quoteDate  && <div><strong>Date:</strong> {s.quoteDate}</div>}
            </div>
          </div>

          {/* HOURLY RATE */}
          <div className="rate-bar">
            <span className="rate-bar-label">⚙ Desired Hourly Rate</span>
            <div className="rate-input-group">
              <span className="dollar">$</span>
              <input
                type="number"
                className="rate-input"
                value={s.hourlyRate}
                min={0}
                onChange={e => set('hourlyRate', e.target.value)}
              />
              <span className="rate-suffix">/ hour</span>
            </div>
          </div>

          {/* CLIENT INFO */}
          <div className="client-card">
            <div className="client-field">
              <label>Client Name</label>
              <input type="text" placeholder="e.g. Apex Properties LLC" value={s.clientName} onChange={e => set('clientName', e.target.value)} />
            </div>
            <div className="client-field">
              <label>Date of Quote</label>
              <input type="date" value={s.quoteDate} onChange={e => set('quoteDate', e.target.value)} />
            </div>
            <div className="client-field">
              <label>Effective Date</label>
              <input type="date" value={s.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
            </div>
          </div>

          {/* REAL ESTATE HELPER */}
          <REHelper onUse={v => set('transactions', v)} />

          {/* ── STANDARD BOOKKEEPING PACKAGE ── */}
          <div className="section-card">
            <div className="section-header" onClick={() => toggleSection('standard')}>
              <div className="section-title-group">
                <span className="section-icon">📚</span>
                <span className="section-title">Standard Bookkeeping Package</span>
              </div>
              <span className={`section-total-badge ${c.stdTotal === 0 ? 'zero' : ''}`}>{fmt(c.stdTotal)}/mo</span>
              <span className={`section-chevron ${openSections.standard ? 'open' : ''}`}>▼</span>
            </div>

            {openSections.standard && (
              <div className="section-body">
                <div className="subsection-label">Service Fees</div>
                <Row label={<>Transactions / month <span className="row-note">(min 50) — rate: 2% of count × hrly</span></>}
                     inputEl={<NumInput value={s.transactions} onChange={v => set('transactions', v)} min={0} />}
                     price={c.transactionsFee} />
                <Row label={<>Bank / Credit Card Accounts <span className="row-note">(min 2) — rate: 0.5 × hrly each</span></>}
                     inputEl={<NumInput value={s.bankAccounts} onChange={v => set('bankAccounts', v)} min={0} />}
                     price={c.bankFee} />
                <Row label={<>Number of Loans <span className="row-note">— rate: 0.2 × hrly each</span></>}
                     inputEl={<NumInput value={s.loans} onChange={v => set('loans', v)} />}
                     price={c.loansFee} />
                <Row label={<>Additional Contacts <span className="row-note">(owner/partner/manager)</span></>}
                     inputEl={<NumInput value={s.additionalContacts} onChange={v => set('additionalContacts', v)} />}
                     price={c.contactsFee} />
                <Row label="Monthly Phone/Video Call (60 min)"
                     inputEl={<Toggle value={s.phoneVideo} onChange={v => set('phoneVideo', v)} />}
                     price={c.phoneVideoFee} />
                <Row label="Standard Financial Reports (IS, BS, SOCF)"
                     inputEl={<Toggle value={s.financialReports} onChange={v => set('financialReports', v)} />}
                     price={c.financialReportsFee} />
                <Row label={<>Annual Reports for Tax Prep <span className="row-note">— 0.1 × hrly</span></>}
                     inputEl={<Toggle value={s.annualReports} onChange={v => set('annualReports', v)} />}
                     price={c.annualReportsFee} />

                <div className="subsection-label">Software Subscriptions</div>
                <Row label="QuickBooks Online Subscription"
                     inputEl={<Sel value={s.qbo} onChange={v => set('qbo', v)} options={QBO_OPTIONS} />}
                     price={c.qboSub} type="software" />
                <Row label="Hubdoc Subscription"
                     inputEl={<Toggle value={s.hubdoc} onChange={v => set('hubdoc', v)} />}
                     price={c.hubdocSub} type="software" />

                <SectionTotalRow label="Standard Package Total / month" value={c.stdTotal} />
              </div>
            )}
          </div>

          {/* ── UPSELLS ── */}
          <div className="section-card">
            <div className="section-header" onClick={() => toggleSection('upsells')}>
              <div className="section-title-group">
                <span className="section-icon">⚡</span>
                <span className="section-title">Add-On Services</span>
              </div>
              <span className={`section-total-badge ${c.upsellTotal === 0 ? 'zero' : ''}`}>{fmt(c.upsellTotal)}/mo</span>
              <span className={`section-chevron ${openSections.upsells ? 'open' : ''}`}>▼</span>
            </div>

            {openSections.upsells && (
              <div className="section-body">

                {/* Consulting / Budgeting */}
                <SubSection title="Consulting & Budgeting"
                  total={c.consultingFee + c.budgetingFee + c.benchmarkingFee + c.arFee + c.invoicesFee}>
                  <Row label={<>Additional Consulting Time <span className="row-note">— billed hourly</span></>}
                       inputEl={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><NumInput value={s.additionalConsulting} onChange={v => set('additionalConsulting', v)} className="wide" /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hrs/mo</span></span>}
                       price={c.consultingFee} />
                  <Row label="Monthly Budgeting"
                       inputEl={<Toggle value={s.monthlyBudgeting} onChange={v => set('monthlyBudgeting', v)} />}
                       price={c.budgetingFee} />
                  <Row label="Monthly Benchmarking"
                       inputEl={<Toggle value={s.monthlyBenchmarking} onChange={v => set('monthlyBenchmarking', v)} />}
                       price={c.benchmarkingFee} />
                  <Row label="A/R Management & Invoicing"
                       inputEl={<Toggle value={s.arManagement} onChange={v => set('arManagement', v)} />}
                       price={c.arFee} />
                  <Row label={<>Number of Invoices / month <span className="row-note">— rate: 0.1 × hrly each</span></>}
                       inputEl={<NumInput value={s.invoicesPerMonth} onChange={v => set('invoicesPerMonth', v)} />}
                       price={c.invoicesFee} />
                </SubSection>

                {/* A/P */}
                <SubSection title="A/P Bill-Pay Management"
                  total={c.apSub + c.billsServiceFee + c.billsSoftFee}>
                  <Row label="Software Platform"
                       inputEl={<Sel value={s.apManagement} onChange={v => set('apManagement', v)} options={AP_OPTIONS} />}
                       price={c.apSub} type="software" />
                  <Row label={<>Number of Bills / month{s.apManagement !== 'None' && <span className="row-note"> — service: 0.1×hrly + software per-bill fee</span>}</>}
                       inputEl={<NumInput value={s.billsPerMonth} onChange={v => set('billsPerMonth', v)} />}
                       price={c.billsServiceFee + c.billsSoftFee} />
                </SubSection>

                {/* Payroll */}
                <SubSection title="Payroll Management"
                  total={c.payrollBaseSub + c.payrollPerEmpFee + c.payrollFreqFee}>
                  <Row label="Payroll Software"
                       inputEl={<Sel value={s.payrollMgmt} onChange={v => { set('payrollMgmt', v); if (v === 'None') { set('payrollFrequency', 'None') } }} options={PAYROLL_OPTIONS} />}
                       price={c.payrollBaseSub} type="software" />
                  <Row label={<>Number of Employees <span className="row-note">— per-employee software fee applies</span></>}
                       inputEl={<NumInput value={s.numEmployees} onChange={v => set('numEmployees', v)} />}
                       price={c.payrollPerEmpFee} type="software" />
                  <Row label="Payroll Frequency"
                       inputEl={<Sel value={s.payrollFrequency} onChange={v => set('payrollFrequency', v)} options={PAYROLL_FREQ} />}
                       price={c.payrollFreqFee} />
                </SubSection>

                {/* Sales Tax */}
                <SubSection title="Sales / Use Tax Reporting"
                  total={c.salesTaxServiceFee + c.salesTaxSoftFee + c.autofilingFee}>
                  <Row label="Tax Reporting Platform"
                       inputEl={<Sel value={s.salesTaxReporting} onChange={v => set('salesTaxReporting', v)} options={SALES_TAX_OPTIONS} />}
                       price={c.salesTaxServiceFee} />
                  <Row label="Monthly Sales Transaction Volume"
                       inputEl={<Sel value={s.salesTransactions} onChange={v => set('salesTransactions', v)} options={SALES_TXN_RANGES} />}
                       price={c.salesTaxSoftFee} type="software" />
                  <Row label={<>Number of States for Autofiling <span className="row-note">— $19.99 / state</span></>}
                       inputEl={<NumInput value={s.numStates} onChange={v => set('numStates', v)} />}
                       price={c.autofilingFee} type="software" />
                </SubSection>

                {/* 401k */}
                <SubSection title="401k Management" total={c.fourOOneKDiscount}>
                  <Row label={<>401k Management <span className="row-note">(401Go platform)</span></>}
                       inputEl={<Toggle value={s.fourOOneK} onChange={v => set('fourOOneK', v)} />}
                       price={0} />
                  <Row label={<>Number of Employees <span className="row-note">— discount: -$1.50/employee applied</span></>}
                       inputEl={<NumInput value={s.numEmployees401k} onChange={v => set('numEmployees401k', v)} />}
                       price={Math.abs(c.fourOOneKDiscount)} type={c.fourOOneKDiscount < 0 ? 'discount' : 'service'} />
                </SubSection>

                {/* Other */}
                <SubSection title="Other" total={c.additionalReportsFee}>
                  <Row label={<>Additional Custom Reports <span className="row-note">— 0.5 × hrly each</span></>}
                       inputEl={<NumInput value={s.additionalReports} onChange={v => set('additionalReports', v)} />}
                       price={c.additionalReportsFee} />
                </SubSection>

                <SectionTotalRow label="Add-On Services Total / month" value={c.upsellTotal} />
              </div>
            )}
          </div>

          {/* ── ONE-TIME FEES ── */}
          <div className="section-card">
            <div className="section-header" onClick={() => toggleSection('onetime')}>
              <div className="section-title-group">
                <span className="section-icon">🔧</span>
                <span className="section-title">One-Time Fees</span>
              </div>
              <span className={`section-total-badge ${c.oneTimeTotal === 0 ? 'zero' : ''}`}>{fmt(c.oneTimeTotal)}</span>
              <span className={`section-chevron ${openSections.onetime ? 'open' : ''}`}>▼</span>
            </div>

            {openSections.onetime && (
              <div className="section-body">
                <Row label={<>Accounting Software Set-up <span className="row-note">— 2.5 × hrly</span></>}
                     inputEl={<Toggle value={s.softwareSetup} onChange={v => set('softwareSetup', v)} />}
                     price={c.setupFee} />
                <Row label={<>Consulting / Training Time <span className="row-note">— billed at hourly rate</span></>}
                     inputEl={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><NumInput value={s.trainingHours} onChange={v => set('trainingHours', v)} className="wide" /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hours</span></span>}
                     price={c.trainingFee} />
                <Row label={<>Catch-Up — Months Behind in Current Year <span className="row-note">— 60% of monthly × months</span></>}
                     inputEl={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><NumInput value={s.catchUpMonths} onChange={v => set('catchUpMonths', v)} className="wide" /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>months</span></span>}
                     price={c.catchUpFee} />
                <Row label={<>Historical Clean-Up — Months Needing Fixed <span className="row-note">— 75% of monthly × months</span></>}
                     inputEl={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><NumInput value={s.historicalMonths} onChange={v => set('historicalMonths', v)} className="wide" /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>months</span></span>}
                     price={c.historicalFee} />
                <SectionTotalRow label="One-Time Fees Total" value={c.oneTimeTotal} />
              </div>
            )}
          </div>

          {/* ── SUMMARY ── */}
          <div className="summary-section">
            <div className="section-header">
              <div className="section-title-group">
                <span className="section-icon">💵</span>
                <span className="section-title">Quote Summary</span>
              </div>
            </div>
            <div className="section-body">
              <div className="summary-grid">
                <div className="summary-item highlight">
                  <div className="summary-item-label">Ongoing Monthly Total</div>
                  <div className="summary-item-value">{fmt(c.ongoingMonthlyTotal)}</div>
                </div>
                <div className="summary-item highlight">
                  <div className="summary-item-label">1st Month Total</div>
                  <div className="summary-item-value">{fmt(c.firstMonthTotal)}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-item-label">Standard Package</div>
                  <div className="summary-item-value">{fmt(c.stdTotal)}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span></div>
                </div>
                <div className="summary-item">
                  <div className="summary-item-label">Add-On Services</div>
                  <div className="summary-item-value">{fmt(c.upsellTotal)}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span></div>
                </div>
              </div>
              {c.oneTimeTotal > 0 && (
                <div className="summary-breakdown">
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>One-Time Breakdown</div>
                  {c.setupFee    > 0 && <div className="summary-breakdown-row"><span>Software Setup</span><span className="val">{fmt(c.setupFee)}</span></div>}
                  {c.trainingFee > 0 && <div className="summary-breakdown-row"><span>Consulting / Training</span><span className="val">{fmt(c.trainingFee)}</span></div>}
                  {c.catchUpFee  > 0 && <div className="summary-breakdown-row"><span>Catch-Up ({s.catchUpMonths} months @ 60%)</span><span className="val">{fmt(c.catchUpFee)}</span></div>}
                  {c.historicalFee>0 && <div className="summary-breakdown-row"><span>Historical Clean-Up ({s.historicalMonths} months)</span><span className="val">{fmt(c.historicalFee)}</span></div>}
                </div>
              )}
            </div>
          </div>

          {/* COPY QUOTE */}
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyQuote}>
            {copied ? '✓ Quote Copied to Clipboard!' : '📋 Copy Quote to Clipboard'}
          </button>

          {/* RESET */}
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <button
              onClick={() => setS(INITIAL)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Reset all values
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
