# Profit Clarity Advantage™ — Client Pricing Calculator

A real-time client quoting tool for bookkeeping services, built with React + Vite.

## Features

- ✅ All pricing formulas from the original Excel calculator
- ✅ Real-time calculations as you type — no submit button needed
- ✅ Sticky header showing live Monthly & 1st Month totals
- ✅ Transaction estimator for real estate clients
- ✅ Copy-to-clipboard quote summary
- ✅ Print-friendly output
- ✅ Mobile-responsive for quoting on calls

## Pricing Logic (mirrors Excel "All accounts" sheet)

| Row | Formula |
|---|---|
| Transactions | `count × 0.02 × hourlyRate` |
| Bank/CC Accounts | `count × 0.5 × hourlyRate` |
| Loans | `count × 0.2 × hourlyRate` |
| Additional Contacts | `count × 1 × hourlyRate` |
| Phone/Video Chat | `1 × hourlyRate` if Yes |
| Financial Reports | `1 × hourlyRate` if Yes |
| Annual Tax Reports | `0.1 × hourlyRate` if Yes |
| QBO Plus | $40/mo software |
| QBO Essentials | $25/mo software |
| QBO Self Employed | $10/mo software |
| QBO Advanced | $115/mo software |
| Hubdoc | $20/mo software |
| Consulting (hourly) | `hours × hourlyRate` |
| Invoices | `count × 0.1 × hourlyRate` |
| A/P Circulus | $20.50 base + $2.38/bill + service |
| A/P Bill.com | $49 base + $2.49/bill + service |
| A/P Plooto | $1.75/bill + service |
| Payroll Patriot | $20 + $2/employee |
| Payroll Gusto | $39 + $6/employee |
| Payroll Frequency | Monthly/BiWeekly/Weekly multiplier |
| Sales Tax (Taxjar) | `1 × hourlyRate` |
| Sales TXN Volume | $17/$44/$89 software tier |
| State Autofiling | `states × $19.99` |
| 401k Discount | `-$1.50 × employees` |
| Additional Reports | `count × 0.5 × hourlyRate` |
| Software Setup | `2.5 × hourlyRate` (one-time) |
| Catch-Up | `months × monthlyTotal × 0.60` |
| Historical Clean-Up | `months × monthlyTotal × 1.5 × 0.50` |

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## Deploy to Vercel

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pricing-calculator.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Vercel auto-detects Vite — click **Deploy**
5. Done! You'll get a URL like `your-app.vercel.app`

No `vercel.json` needed — Vite is auto-detected.

## Stack

- **React 18** — UI
- **Vite 5** — Build tool
- **Custom CSS** — No external UI libraries, fully self-contained
