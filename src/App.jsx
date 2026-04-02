import { useState, useMemo, useCallback, useEffect } from 'react'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const UNLOCK_CODE   = 'SeizeTheDay'
const STRIPE_URL    = 'https://buy.stripe.com/9B6bJ12377m92r66GH6Zy0j'
const STORAGE_KEY   = 'pca_unlocked'
const TOOL_NAME     = 'Pricing Calculator'
const TOOL_TAGLINE  = 'Professional Pricing Calculator'

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
const QBO_OPTS         = ['None','QBO Essentials','QBO Plus','QBO Self Employed','QBO Advanced']
const AP_OPTS          = ['None','Circulus','Bill.com','Plooto']
const PAYROLL_OPTS     = ['None','Patriot','Gusto','GetPayroll']
const PAYROLL_FREQ     = ['None','Monthly','BiWeekly','Weekly']
const SALES_TAX_OPTS   = ['None','Taxjar.com']
const SALES_TXN_OPTS   = ['None','<1,000','1,000-5,000','5,000-10,000']

// ─── CALCULATOR ──────────────────────────────────────────────────────────────
function calc(s) {
  const hr = Math.max(0, Number(s.hourlyRate) || 0)

  // Standard package
  const txFee    = (Number(s.transactions)       * 0.02) * hr
  const bankFee  = (Number(s.bankAccounts)        * 0.5)  * hr
  const loanFee  = (Number(s.loans)              * 0.2)  * hr
  const cntFee   = (Number(s.contacts)           * 1)    * hr
  const phoneFee = s.phoneVideo      === 'Yes' ? hr   : 0
  const rptFee   = s.financialReports=== 'Yes' ? hr   : 0
  const taxRptFee= s.annualReports   === 'Yes' ? hr*.1 : 0
  const qboSub   = {'QBO Plus':40,'QBO Essentials':25,'QBO Self Employed':10,'QBO Advanced':115,'None':0}[s.qbo]??0
  const hubSub   = s.hubdoc === 'Yes' ? 20 : 0
  const stdSvc   = txFee + bankFee + loanFee + cntFee + phoneFee + rptFee + taxRptFee
  const stdSoft  = qboSub + hubSub
  const stdTotal = stdSvc + stdSoft

  // Upsells
  const consFee  = (Number(s.consulting)   * 1)   * hr
  const budgFee  = s.budgeting    === 'Yes' ? hr   : 0
  const benchFee = s.benchmarking === 'Yes' ? hr   : 0
  const arFee    = s.arMgmt       === 'Yes' ? hr   : 0
  const invFee   = (Number(s.invoices)     * 0.1)  * hr
  const apSub    = {'Circulus':20.5,'Bill.com':49,'Plooto':0,'None':0}[s.apMgmt]??0
  const bills    = Number(s.bills)
  const billsSvc = s.apMgmt !== 'None' ? 0.1*bills*hr : 0
  const billsSoft= s.apMgmt==='Circulus'?2.38*bills : s.apMgmt==='Bill.com'?2.49*bills : s.apMgmt==='Plooto'?1.75*bills : 0
  const prBase   = {'Patriot':20,'Gusto':39,'GetPayroll':0,'None':0}[s.payroll]??0
  const emp      = Number(s.employees)
  const prPerEmp = s.payroll==='Patriot'?2*emp : s.payroll==='Gusto'?6*emp : 0
  const prFreq   = s.payFreq==='Monthly'?emp*hr*0.1 : s.payFreq==='Weekly'?emp*hr*0.1*4 : s.payFreq==='BiWeekly'?emp*hr*0.1*2 : 0
  const stSvc    = s.salesTax==='Taxjar.com' ? hr : 0
  const stSoft   = {'<1,000':17,'1,000-5,000':44,'5,000-10,000':89,'None':0}[s.salesTxn]??0
  const autoFee  = Number(s.states) * 19.99
  const k401disc = s.k401==='Yes' ? -1.5*Number(s.k401emp) : 0
  const addRptFee= (Number(s.addReports)*0.5)*hr
  const upsellTotal = consFee+budgFee+benchFee+arFee+invFee+billsSvc+billsSoft+apSub+prBase+prPerEmp+prFreq+stSvc+stSoft+autoFee+k401disc+addRptFee

  // One-time
  const setupFee   = s.setup==='Yes' ? 2.5*hr : 0
  const trainFee   = Number(s.trainHours)*hr
  const catchFee   = Number(s.catchMonths)*stdTotal*0.6
  const histFee    = stdTotal*1.5*Number(s.histMonths)*0.5
  const oneTimeTotal = setupFee+trainFee+catchFee+histFee

  const firstMonth   = stdTotal+upsellTotal+oneTimeTotal
  const monthly      = stdTotal+upsellTotal

  return {
    txFee,bankFee,loanFee,cntFee,phoneFee,rptFee,taxRptFee,qboSub,hubSub,
    stdSvc,stdSoft,stdTotal,
    consFee,budgFee,benchFee,arFee,invFee,apSub,billsSvc,billsSoft,
    prBase,prPerEmp,prFreq,stSvc,stSoft,autoFee,k401disc,addRptFee,upsellTotal,
    setupFee,trainFee,catchFee,histFee,oneTimeTotal,
    firstMonth,monthly,
  }
}

const fmt   = v => v===0 ? '—' : `$${Math.round(v).toLocaleString()}`
const fmtAbs= v => `$${Math.round(Math.abs(v)).toLocaleString()}`

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const NI = ({ val, set, min=0, wide=false }) => (
  <input type="number" className={`ni${wide?' w':''}`} value={val} min={min}
    onChange={e=>set(e.target.value)} />
)
const Tog = ({ val, set }) => (
  <div className="tog">
    <button className={`tb${val==='Yes'?' y':''}`} onClick={()=>set('Yes')}>Yes</button>
    <button className={`tb${val==='No'?' n':''}`}  onClick={()=>set('No')}>No</button>
  </div>
)
const Sel = ({ val, set, opts }) => (
  <select className="sel" value={val} onChange={e=>set(e.target.value)}>
    {opts.map(o=><option key={o}>{o}</option>)}
  </select>
)
const Price = ({ v, type='svc' }) => {
  const cls = v===0 ? 'rp' : type==='sw'?'rp sw':type==='disc'?'rp disc':'rp svc on'
  return <div className={cls} data-val={v}>{type==='disc'&&v!==0?`-${fmtAbs(v)}`:fmt(v)}</div>
}
const Row = ({ label, note, inp, price, type, showAlways=false }) => (
  <div className={`calc-row${price===0&&!showAlways?' zero-row':''}`}>
    <div className="rl">{label}{note&&<> <span className="rn">{note}</span></>}</div>
    <div className="ri">{inp}</div>
    <Price v={price} type={type} />
  </div>
)
const STotal = ({ label, val }) => (
  <div className="stot"><span className="stot-lbl">{label}</span><span className="stot-val">{fmt(val)}</span></div>
)

// SubSection
function SubSec({ title, total, children }) {
  const [open,setOpen] = useState(true)
  return (
    <div className="sub-sec">
      <div className="sub-sec-hdr" onClick={()=>setOpen(o=>!o)}>
        <span className="sub-sec-title">
          {title}
          <span className={`sub-badge${total===0?' z':''}`}>{fmt(total)}</span>
        </span>
        <span className={`sub-chev${open?' open':''}`}>▼</span>
      </div>
      {open && <div className="sub-sec-body">{children}</div>}
    </div>
  )
}

// ─── LOCK MODAL ──────────────────────────────────────────────────────────────
function LockModal({ onUnlock, onDemo }) {
  const [code,setCode]   = useState('')
  const [err,setErr]     = useState(false)
  const [tab,setTab]     = useState('buy') // 'buy' | 'code'

  const tryCode = () => {
    if (code.trim() === UNLOCK_CODE) { onUnlock() }
    else { setErr(true); setTimeout(()=>setErr(false),1500) }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-emblem">📊</div>
        <div className="modal-title">{TOOL_NAME}</div>
        <div className="modal-sub">
          The professional quoting tool for bookkeepers, CFOs, and accountants.<br/>
          Get instant client estimates — built for real calls.
        </div>

        <div className="modal-perks">
          {[
            ['✓','All service & software fee formulas — pre-loaded'],
            ['✓','Smart print: shows only items quoted, nothing else'],
            ['✓','One-click quote copy for emails & messages'],
            ['✓','Transaction estimator built in'],
            ['✓','Catch-up, historical clean-up, and one-time pricing'],
          ].map(([dot,text])=>(
            <div key={text} className="perk-item">
              <div className="perk-dot">{dot}</div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <a className="modal-cta" href={STRIPE_URL} target="_blank" rel="noopener noreferrer">
          Get Full Access →
        </a>

        <div className="modal-divider"><span>already purchased?</span></div>

        <div className="unlock-row">
          <input
            className={`unlock-input${err?' err':''}`}
            type="text" placeholder="Enter access code"
            value={code} onChange={e=>setCode(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&tryCode()}
          />
          <button className="unlock-btn" onClick={tryCode}>Unlock</button>
        </div>
        {err && <div className="unlock-err">Invalid code — check your purchase confirmation.</div>}

        <button className="modal-demo-link" onClick={onDemo}>
          Try the demo first (limited features)
        </button>
      </div>
    </div>
  )
}

// ─── RE ESTIMATOR ────────────────────────────────────────────────────────────
function REHelper({ onUse }) {
  const [open,setOpen] = useState(false)
  const [rows,setRows] = useState(
    Array.from({length:5},(_,i)=>({name:`Account ${i+1}`,q:''}))
  )
  const updateQ = (i,v) => setRows(p=>p.map((r,x)=>x===i?{...r,q:v}:r))
  const updateN = (i,v) => setRows(p=>p.map((r,x)=>x===i?{...r,name:v}:r))

  const total = useMemo(()=>Math.round(
    rows.reduce((a,r)=>{const q=Number(r.q);return isNaN(q)?a:a+q/3},0)
  ),[rows])

  return (
    <div className="re-card">
      <div className="scard-hdr" style={{cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>
        <div className="scard-icon">🏘️</div>
        <div className="scard-title">Transaction Estimator</div>
        <span className={`scard-chev${open?' open':''}`}>▼</span>
      </div>
      {open && (
        <div className="scard-body">
          <table className="re-table">
            <thead>
              <tr><th>Account</th><th>Last Quarter Txns</th><th>Monthly Avg</th></tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>{
                const q=Number(r.q); const avg=r.q!==''&&!isNaN(q)?(q/3).toFixed(1):'—'
                return (
                  <tr key={i}>
                    <td><input type="text" value={r.name} onChange={e=>updateN(i,e.target.value)} /></td>
                    <td><input type="number" min="0" value={r.q} onChange={e=>updateQ(i,e.target.value)} placeholder="0" /></td>
                    <td style={{fontWeight:r.q!==''?600:400,color:r.q!==''?'var(--text)':'var(--text-faint)'}}>{avg}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="re-foot">
            <div>
              <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:2}}>Estimated Monthly Total</div>
              <div style={{fontFamily:'var(--font-body)',fontSize:'1rem',fontWeight:800,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{total || '—'}</div>
            </div>
            {total>0&&(
              <button className="re-use" onClick={()=>{onUse(total);setOpen(false)}}>
                Use {total} in calculator →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const INIT = {
  hourlyRate:50,
  clientName:'', quoteDate:new Date().toISOString().split('T')[0], effectiveDate:'',
  // Standard
  transactions:80, bankAccounts:3, loans:0, contacts:0,
  phoneVideo:'No', financialReports:'No', annualReports:'No',
  qbo:'None', hubdoc:'No',
  // Upsells
  consulting:0, budgeting:'No', benchmarking:'No',
  arMgmt:'No', invoices:0,
  apMgmt:'None', bills:0,
  payroll:'None', employees:0, payFreq:'None',
  salesTax:'None', salesTxn:'None', states:0,
  k401:'No', k401emp:0,
  addReports:0,
  // One-time
  setup:'No', trainHours:0, catchMonths:0, histMonths:0,
}

export default function App() {
  const [s,setS]              = useState(INIT)
  const [unlocked,setUnlocked]= useState(()=>!!localStorage.getItem(STORAGE_KEY))
  const [showModal,setShowModal]= useState(()=>!localStorage.getItem(STORAGE_KEY))
  const [open,setOpen]        = useState({std:true,ups:true,one:false})
  const [copied,setCopied]    = useState(false)

  const upd = useCallback((k,v)=>setS(p=>({...p,[k]:v})),[])
  const toggleSec = k => setOpen(p=>({...p,[k]:!p[k]}))

  const doUnlock = () => {
    localStorage.setItem(STORAGE_KEY,'1')
    setUnlocked(true); setShowModal(false)
  }
  const doDemo = () => setShowModal(false)
  const showUnlockFromDemo = () => setShowModal(true)

  const c = useMemo(()=>calc(s),[s])

  // Build copy text
  const copyQuote = () => {
    const lines = [
      `${TOOL_NAME} — Client Estimate`,
      '─'.repeat(42),
      s.clientName && `Client:         ${s.clientName}`,
      s.quoteDate  && `Date:           ${s.quoteDate}`,
      s.effectiveDate && `Effective:      ${s.effectiveDate}`,
      '',
      'STANDARD BOOKKEEPING',
      c.txFee>0    && `  Transactions (${s.transactions}/mo):   ${fmt(c.txFee)}`,
      c.bankFee>0  && `  Bank/CC Accounts (${s.bankAccounts}):  ${fmt(c.bankFee)}`,
      c.loanFee>0  && `  Loans (${s.loans}):              ${fmt(c.loanFee)}`,
      c.cntFee>0   && `  Additional Contacts:          ${fmt(c.cntFee)}`,
      c.phoneFee>0 && `  Monthly Call:                 ${fmt(c.phoneFee)}`,
      c.rptFee>0   && `  Financial Reports:            ${fmt(c.rptFee)}`,
      c.taxRptFee>0&& `  Annual Tax Reports:           ${fmt(c.taxRptFee)}`,
      c.qboSub>0   && `  ${s.qbo}:                     ${fmt(c.qboSub)}`,
      c.hubSub>0   && `  Hubdoc:                       ${fmt(c.hubSub)}`,
      `  Subtotal:                     ${fmt(c.stdTotal)}`,
      c.upsellTotal!==0 && '',
      c.upsellTotal!==0 && 'ADD-ON SERVICES',
      c.consFee>0  && `  Consulting (${s.consulting} hrs):       ${fmt(c.consFee)}`,
      c.budgFee>0  && `  Monthly Budgeting:            ${fmt(c.budgFee)}`,
      c.benchFee>0 && `  Monthly Benchmarking:         ${fmt(c.benchFee)}`,
      c.arFee>0    && `  A/R Management:               ${fmt(c.arFee)}`,
      c.invFee>0   && `  Invoicing (${s.invoices}):             ${fmt(c.invFee)}`,
      (c.apSub+c.billsSvc+c.billsSoft)>0 && `  A/P Bill-Pay:                 ${fmt(c.apSub+c.billsSvc+c.billsSoft)}`,
      (c.prBase+c.prPerEmp+c.prFreq)>0 && `  Payroll Mgmt:                 ${fmt(c.prBase+c.prPerEmp+c.prFreq)}`,
      (c.stSvc+c.stSoft+c.autoFee)>0 && `  Sales Tax:                    ${fmt(c.stSvc+c.stSoft+c.autoFee)}`,
      c.k401disc<0 && `  401k Discount:                -${fmtAbs(c.k401disc)}`,
      c.addRptFee>0 && `  Additional Reports:          ${fmt(c.addRptFee)}`,
      c.upsellTotal!==0 && `  Subtotal:                     ${fmt(c.upsellTotal)}`,
      c.oneTimeTotal>0 && '',
      c.oneTimeTotal>0 && 'ONE-TIME FEES',
      c.setupFee>0  && `  Software Setup:               ${fmt(c.setupFee)}`,
      c.trainFee>0  && `  Consulting/Training:          ${fmt(c.trainFee)}`,
      c.catchFee>0  && `  Catch-Up (${s.catchMonths} mo @ 60%):    ${fmt(c.catchFee)}`,
      c.histFee>0   && `  Historical (${s.histMonths} mo):          ${fmt(c.histFee)}`,
      '',
      '─'.repeat(42),
      `ONGOING MONTHLY:          ${fmt(c.monthly)}`,
      `1ST MONTH TOTAL:          ${fmt(c.firstMonth)}`,
      '─'.repeat(42),
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(lines).then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false),2000)
    })
  }

  return (
    <>
      {/* FONT IMPORT */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* UNLOCK MODAL */}
      {showModal && <LockModal onUnlock={doUnlock} onDemo={doDemo} />}

      {/* STICKY HEADER */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">{TOOL_NAME} <em>/ {TOOL_TAGLINE}</em></div>
          <div className="hnums">
            <div className="hnum"><div className="hnl">Monthly</div><div className="hnv">{fmt(c.monthly)}</div></div>
            <div className="hnum p"><div className="hnl">1st Month</div><div className="hnv">{fmt(c.firstMonth)}</div></div>
          </div>
          <div className="hacts">
            {!unlocked
              ? <><a className="hbtn buy" href={STRIPE_URL} target="_blank" rel="noopener noreferrer">Get Full Access</a>
                  <button className="hbtn" onClick={showUnlockFromDemo}>Enter Code</button></>
              : <div className="hbtn unlocked">✓ Full Access</div>
            }
            <button className="hbtn" onClick={()=>window.print()}>🖨️ Print</button>
          </div>
        </div>
      </header>

      {/* DEMO BANNER */}
      {!unlocked && (
        <div className="demo-banner">
          <div className="demo-banner-text">
            <span className="demo-pill">Demo Mode</span>
            Add-on services &amp; one-time fees are locked. Upgrade for full access.
          </div>
          <div className="demo-actions">
            <button className="demo-unlock" onClick={showUnlockFromDemo}>Enter Code</button>
            <a className="demo-buy" href={STRIPE_URL} target="_blank" rel="noopener noreferrer">Purchase →</a>
          </div>
        </div>
      )}

      {/* PRINT HEADER — visible only when printing */}
      <div className="print-header" aria-hidden="true">
        <div>
          <div className="ph-title">{TOOL_NAME} <span>/ Estimate</span></div>
          {s.quoteDate && <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>Prepared {s.quoteDate}</div>}
        </div>
        <div className="ph-meta">
          {s.clientName && <div><strong>Client:</strong> {s.clientName}</div>}
          {s.effectiveDate && <div><strong>Effective:</strong> {s.effectiveDate}</div>}
          <div><strong>Ongoing Monthly:</strong> {fmt(c.monthly)}</div>
          <div><strong>1st Month Total:</strong> {fmt(c.firstMonth)}</div>
        </div>
      </div>

      <div className="app-wrap">

        {/* PAGE TITLE + HOURLY RATE */}
        <div className="top-meta">
          <div className="tml">
            <h1>{TOOL_NAME} <em>Pro</em></h1>
            <p>Fill in the fields below to build an instant client estimate. Changes update live.</p>
          </div>
          <div className="rate-block">
            <div className="rate-lbl">Desired Hourly Rate</div>
            <div className="rate-grp">
              <span className="rate-sym">$</span>
              <input className="rate-inp" type="number" min="0" value={s.hourlyRate}
                onChange={e=>upd('hourlyRate',e.target.value)} />
              <span className="rate-suf">/ hr</span>
            </div>
          </div>
        </div>

        {/* CLIENT INFO */}
        <div className="clt-row">
          <div className="cf"><label>Client Name</label><input type="text" placeholder="e.g. Apex Properties LLC" value={s.clientName} onChange={e=>upd('clientName',e.target.value)} /></div>
          <div className="cf"><label>Date of Quote</label><input type="date" value={s.quoteDate} onChange={e=>upd('quoteDate',e.target.value)} /></div>
          <div className="cf"><label>Effective Date</label><input type="date" value={s.effectiveDate} onChange={e=>upd('effectiveDate',e.target.value)} /></div>
        </div>

        {/* RE ESTIMATOR */}
        <REHelper onUse={v=>upd('transactions',v)} />

        {/* ── STANDARD PACKAGE ── */}
        <div className={`scard${c.stdTotal===0?' sec-zero':''}`}>
          <div className={`scard-hdr${open.std?' open':''}`} onClick={()=>toggleSec('std')}>
            <div className="scard-icon">📒</div>
            <div className="scard-title">Standard Bookkeeping Package</div>
            <span className={`scard-badge${c.stdTotal===0?' z':''}`}>{fmt(c.stdTotal)}/mo</span>
            <span className={`scard-chev${open.std?' open':''}`}>▼</span>
          </div>
          {open.std && (
            <div className="scard-body">
              <div className="sub-lbl">Service Fees</div>
              <Row label="Transactions / month" note="(min 50) — rate: 2% of count × hrly"
                   inp={<NI val={s.transactions} set={v=>upd('transactions',v)} />}
                   price={c.txFee} showAlways />
              <Row label="Bank / Credit Card Accounts" note="(min 2) — 0.5 × hrly each"
                   inp={<NI val={s.bankAccounts} set={v=>upd('bankAccounts',v)} />}
                   price={c.bankFee} showAlways />
              <Row label="Number of Loans" note="— 0.2 × hrly each"
                   inp={<NI val={s.loans} set={v=>upd('loans',v)} />}
                   price={c.loanFee} showAlways />
              <Row label="Additional Contacts" note="(owner / partner / manager)"
                   inp={<NI val={s.contacts} set={v=>upd('contacts',v)} />}
                   price={c.cntFee} />
              <Row label="Monthly Phone / Video Call (60 min)"
                   inp={<Tog val={s.phoneVideo} set={v=>upd('phoneVideo',v)} />}
                   price={c.phoneFee} showAlways />
              <Row label="Standard Financial Reports" note="(IS, BS, SOCF)"
                   inp={<Tog val={s.financialReports} set={v=>upd('financialReports',v)} />}
                   price={c.rptFee} />
              <Row label="Annual Reports for Tax Prep" note="— 0.1 × hrly"
                   inp={<Tog val={s.annualReports} set={v=>upd('annualReports',v)} />}
                   price={c.taxRptFee} />
              <div className="sub-lbl">Software Subscriptions</div>
              <Row label="QuickBooks Online Subscription"
                   inp={<Sel val={s.qbo} set={v=>upd('qbo',v)} opts={QBO_OPTS} />}
                   price={c.qboSub} type="sw" showAlways />
              <Row label="Hubdoc Subscription"
                   inp={<Tog val={s.hubdoc} set={v=>upd('hubdoc',v)} />}
                   price={c.hubSub} type="sw" />
              <STotal label="Standard Package Total / month" val={c.stdTotal} />
            </div>
          )}
        </div>

        {/* ── UPSELLS ── */}
        <div className={`scard${c.upsellTotal===0?' sec-zero':''}`}>
          <div className={`scard-hdr${open.ups?' open':''}`} onClick={()=>toggleSec('ups')}>
            <div className="scard-icon">⚡</div>
            <div className="scard-title">Add-On Services</div>
            <span className={`scard-badge${c.upsellTotal===0?' z':''}`}>{fmt(c.upsellTotal)}/mo</span>
            <span className={`scard-chev${open.ups?' open':''}`}>▼</span>
          </div>
          {open.ups && (
            <div className="scard-body lockable">
              {/* CONTENT */}
              <SubSec title="Consulting & Budgeting" total={c.consFee+c.budgFee+c.benchFee+c.arFee+c.invFee}>
                <Row label="Additional Consulting Time" note="— billed hourly"
                     inp={<span style={{display:'flex',alignItems:'center',gap:6}}><NI val={s.consulting} set={v=>upd('consulting',v)} wide /><span className="u">hrs/mo</span></span>}
                     price={c.consFee} showAlways />
                <Row label="Monthly Budgeting" inp={<Tog val={s.budgeting} set={v=>upd('budgeting',v)} />} price={c.budgFee} showAlways />
                <Row label="Monthly Benchmarking" inp={<Tog val={s.benchmarking} set={v=>upd('benchmarking',v)} />} price={c.benchFee} showAlways />
                <Row label="A/R Management & Invoicing" inp={<Tog val={s.arMgmt} set={v=>upd('arMgmt',v)} />} price={c.arFee} showAlways />
                <Row label="Number of Invoices / month" note="— 0.1 × hrly each"
                     inp={<NI val={s.invoices} set={v=>upd('invoices',v)} />}
                     price={c.invFee} showAlways />
              </SubSec>
              <SubSec title="A/P Bill-Pay Management" total={c.apSub+c.billsSvc+c.billsSoft} className="ssec-zero">
                <Row label="Software Platform" inp={<Sel val={s.apMgmt} set={v=>upd('apMgmt',v)} opts={AP_OPTS} />} price={c.apSub} type="sw" showAlways />
                <Row label="Number of Bills / month" note={s.apMgmt!=='None'?"— 0.1×hrly + software per-bill fee":undefined}
                     inp={<NI val={s.bills} set={v=>upd('bills',v)} />}
                     price={c.billsSvc+c.billsSoft} showAlways />
              </SubSec>
              <SubSec title="Payroll Management" total={c.prBase+c.prPerEmp+c.prFreq}>
                <Row label="Payroll Software" inp={<Sel val={s.payroll} set={v=>upd('payroll',v)} opts={PAYROLL_OPTS} />} price={c.prBase} type="sw" showAlways />
                <Row label="Number of Employees" note="— per-employee software fee"
                     inp={<NI val={s.employees} set={v=>upd('employees',v)} />}
                     price={c.prPerEmp} type="sw" showAlways />
                <Row label="Payroll Frequency" inp={<Sel val={s.payFreq} set={v=>upd('payFreq',v)} opts={PAYROLL_FREQ} />} price={c.prFreq} showAlways />
              </SubSec>
              <SubSec title="Sales / Use Tax Reporting" total={c.stSvc+c.stSoft+c.autoFee}>
                <Row label="Tax Platform" inp={<Sel val={s.salesTax} set={v=>upd('salesTax',v)} opts={SALES_TAX_OPTS} />} price={c.stSvc} showAlways />
                <Row label="Monthly Sales Transaction Volume" inp={<Sel val={s.salesTxn} set={v=>upd('salesTxn',v)} opts={SALES_TXN_OPTS} />} price={c.stSoft} type="sw" showAlways />
                <Row label="Number of States for Autofiling" note="— $19.99 / state"
                     inp={<NI val={s.states} set={v=>upd('states',v)} />}
                     price={c.autoFee} type="sw" showAlways />
              </SubSec>
              <SubSec title="401k Management" total={c.k401disc}>
                <Row label="401k Management (401Go)" inp={<Tog val={s.k401} set={v=>upd('k401',v)} />} price={0} showAlways />
                <Row label="Employees for Discount" note="— -$1.50/employee"
                     inp={<NI val={s.k401emp} set={v=>upd('k401emp',v)} />}
                     price={Math.abs(c.k401disc)} type={c.k401disc<0?'disc':'svc'} showAlways />
              </SubSec>
              <SubSec title="Other" total={c.addRptFee}>
                <Row label="Additional Custom Reports" note="— 0.5 × hrly each"
                     inp={<NI val={s.addReports} set={v=>upd('addReports',v)} />}
                     price={c.addRptFee} showAlways />
              </SubSec>
              <STotal label="Add-On Services Total / month" val={c.upsellTotal} />

              {/* LOCK OVERLAY */}
              {!unlocked && (
                <div className="lock-overlay">
                  <div className="lock-icon-lg">🔒</div>
                  <div className="lock-msg">
                    <strong>Add-On Services — Full Access Required</strong>
                    Unlock to quote consulting, payroll, A/P, tax, and more.
                  </div>
                  <div className="lock-btns">
                    <button className="lb-unlock" onClick={showUnlockFromDemo}>Enter Code</button>
                    <a className="lb-buy" href={STRIPE_URL} target="_blank" rel="noopener noreferrer">Purchase Access</a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ONE-TIME FEES ── */}
        <div className={`scard${c.oneTimeTotal===0?' sec-zero':''}`}>
          <div className={`scard-hdr${open.one?' open':''}`} onClick={()=>toggleSec('one')}>
            <div className="scard-icon">🔧</div>
            <div className="scard-title">One-Time Fees</div>
            <span className={`scard-badge${c.oneTimeTotal===0?' z':''}`}>{fmt(c.oneTimeTotal)}</span>
            <span className={`scard-chev${open.one?' open':''}`}>▼</span>
          </div>
          {open.one && (
            <div className="scard-body lockable">
              <Row label="Accounting Software Set-up" note="— 2.5 × hrly"
                   inp={<Tog val={s.setup} set={v=>upd('setup',v)} />}
                   price={c.setupFee} showAlways />
              <Row label="Consulting / Training Time" note="— billed at hourly rate"
                   inp={<span style={{display:'flex',alignItems:'center',gap:6}}><NI val={s.trainHours} set={v=>upd('trainHours',v)} wide /><span className="u">hours</span></span>}
                   price={c.trainFee} showAlways />
              <Row label="Catch-Up — Months Behind in Current Year" note="— 60% of monthly × months"
                   inp={<span style={{display:'flex',alignItems:'center',gap:6}}><NI val={s.catchMonths} set={v=>upd('catchMonths',v)} wide /><span className="u">months</span></span>}
                   price={c.catchFee} showAlways />
              <Row label="Historical Clean-Up — Months to Fix" note="— 75% of monthly × months (1.5×0.5)"
                   inp={<span style={{display:'flex',alignItems:'center',gap:6}}><NI val={s.histMonths} set={v=>upd('histMonths',v)} wide /><span className="u">months</span></span>}
                   price={c.histFee} showAlways />
              <STotal label="One-Time Fees Total" val={c.oneTimeTotal} />

              {!unlocked && (
                <div className="lock-overlay">
                  <div className="lock-icon-lg">🔒</div>
                  <div className="lock-msg">
                    <strong>One-Time Fees — Full Access Required</strong>
                    Unlock catch-up, clean-up, setup, and training pricing.
                  </div>
                  <div className="lock-btns">
                    <button className="lb-unlock" onClick={showUnlockFromDemo}>Enter Code</button>
                    <a className="lb-buy" href={STRIPE_URL} target="_blank" rel="noopener noreferrer">Purchase Access</a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SUMMARY ── */}
        <div className="sum-wrap">
          <div className="sum-grid">
            <div className="sc big">
              <div className="sl">Ongoing Monthly</div>
              <div className="sv hi">{fmt(c.monthly)}</div>
              <div className="sm">Recurring charges</div>
            </div>
            <div className="sc big">
              <div className="sl">1st Month Total</div>
              <div className="sv hi">{fmt(c.firstMonth)}</div>
              <div className="sm">Includes one-time fees</div>
            </div>
            <div className="sc">
              <div className="sl">Standard Package</div>
              <div className="sv">{fmt(c.stdTotal)}</div>
              <div className="sm">per month</div>
            </div>
            <div className="sc">
              <div className="sl">Add-Ons</div>
              <div className="sv">{fmt(c.upsellTotal)}</div>
              <div className="sm">per month</div>
            </div>
          </div>
          {c.oneTimeTotal>0 && (
            <div className="sbr">
              <div style={{fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:6}}>One-Time Breakdown</div>
              {c.setupFee>0   && <div className="sbr-row"><span>Software Setup</span><span className="sbr-v">{fmt(c.setupFee)}</span></div>}
              {c.trainFee>0   && <div className="sbr-row"><span>Consulting / Training</span><span className="sbr-v">{fmt(c.trainFee)}</span></div>}
              {c.catchFee>0   && <div className="sbr-row"><span>Catch-Up ({s.catchMonths} months @ 60%)</span><span className="sbr-v">{fmt(c.catchFee)}</span></div>}
              {c.histFee>0    && <div className="sbr-row"><span>Historical Clean-Up ({s.histMonths} months)</span><span className="sbr-v">{fmt(c.histFee)}</span></div>}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="act-row">
          <button
            className={`act-btn${copied?' copied':''}`}
            onClick={unlocked ? copyQuote : showUnlockFromDemo}
            title={unlocked ? 'Copy quote to clipboard' : 'Full access required'}
          >
            {copied ? '✓ Copied!' : unlocked ? '📋 Copy Quote' : '📋 Copy Quote 🔒'}
          </button>
          <button className="act-btn" onClick={()=>window.print()}>
            🖨️ Print Quote
          </button>
          {!unlocked && (
            <a className="act-btn" style={{color:'var(--green-text)',borderColor:'var(--green-mid)',background:'var(--green-light)',textDecoration:'none'}}
               href={STRIPE_URL} target="_blank" rel="noopener noreferrer">
              🔓 Get Full Access
            </a>
          )}
        </div>
        <div className="reset-link">
          <button onClick={()=>setS(INIT)}>Reset all fields</button>
        </div>

      </div>
    </>
  )
}
