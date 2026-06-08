'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Card helpers ─────────────────────────────────────────────────────────────

function detectBrand(num: string): string {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]\d{2}/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  return '';
}

function fmtCardNumber(raw: string, brand: string): string {
  const d = raw.replace(/\D/g, '');
  if (brand === 'Amex') {
    const p1 = d.substring(0, 4);
    const p2 = d.substring(4, 10);
    const p3 = d.substring(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
  return d.replace(/(.{4})/g, '$1 ').trim().substring(0, 19);
}

function fmtExpiry(raw: string): string {
  const d = raw.replace(/\D/g, '').substring(0, 4);
  if (d.length > 2) return d.substring(0, 2) + '/' + d.substring(2);
  return d;
}

const BRAND_PILL: Record<string, string> = {
  Visa:       'bg-blue-700 text-white',
  Mastercard: 'bg-red-700 text-white',
  Amex:       'bg-green-700 text-white',
  Discover:   'bg-orange-600 text-white',
};

// ── Component ─────────────────────────────────────────────────────────────────

type DepositStep = 'amount' | 'card' | 'processing' | 'success' | 'error';

export default function CorporateDashboard({ userId }: { userId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal visibility + step
  const [depositModal, setDepositModal] = useState(false);
  const [step, setStep] = useState<DepositStep>('amount');
  const [processingLabel, setProcessingLabel] = useState('Authorising card…');

  // Amount step
  const [depositAmount, setDepositAmount] = useState('');

  // Card step
  const [cardNumber, setCardNumber]     = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry]             = useState('');
  const [cvv, setCvv]                   = useState('');
  const [saveCard, setSaveCard]         = useState(false);
  const [showBilling, setShowBilling]   = useState(false);
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity]   = useState('');
  const [billingCountry, setBillingCountry] = useState('');

  // Feedback
  const [cardError, setCardError]     = useState('');
  const [txnId, setTxnId]             = useState('');
  const [depositError, setDepositError] = useState('');

  const cardBrand = detectBrand(cardNumber);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/dashboard/corporate?id=${userId}&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.headers.get('content-type')?.includes('application/json'))
        throw new Error('Database response error. Check Corporate tables.');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch dashboard metrics');
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const closeModal = () => {
    setDepositModal(false);
    setStep('amount');
    setDepositAmount('');
    setCardNumber('');
    setCardholderName('');
    setExpiry('');
    setCvv('');
    setSaveCard(false);
    setShowBilling(false);
    setBillingAddress('');
    setBillingCity('');
    setBillingCountry('');
    setCardError('');
    setTxnId('');
    setDepositError('');
    setProcessingLabel('Authorising card…');
  };

  const validateCard = (): string | null => {
    if (!cardholderName.trim()) return 'Cardholder name is required.';
    const digits = cardNumber.replace(/\s/g, '');
    const expected = cardBrand === 'Amex' ? 15 : 16;
    if (digits.length < expected) return `Card number must be ${expected} digits.`;
    if (!expiry.match(/^\d{2}\/\d{2}$/)) return 'Enter expiry as MM/YY.';
    const [mm, yy] = expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) return 'Invalid expiry month.';
    const expDate = new Date(2000 + yy, mm - 1, 1);
    const now = new Date(); now.setDate(1); now.setHours(0,0,0,0);
    if (expDate < now) return 'This card has expired.';
    const cvvLen = cardBrand === 'Amex' ? 4 : 3;
    if (cvv.length < cvvLen) return `CVV must be ${cvvLen} digits.`;
    return null;
  };

  const handleCardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateCard();
    if (err) { setCardError(err); return; }
    setCardError('');
    runDeposit();
  };

  const runDeposit = async () => {
    setStep('processing');
    setProcessingLabel('Authorising card…');
    await new Promise(r => setTimeout(r, 900));
    setProcessingLabel('Processing payment…');
    await new Promise(r => setTimeout(r, 900));
    setProcessingLabel('Crediting your wallet…');
    await new Promise(r => setTimeout(r, 600));

    try {
      const digits = cardNumber.replace(/\s/g, '');
      const [mm, yy] = expiry.split('/');

      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: depositAmount,
          cardholderName: cardholderName.trim(),
          cardLastFour: digits.slice(-4),
          cardBrand: cardBrand || 'Card',
          expiryMonth: parseInt(mm),
          expiryYear: 2000 + parseInt(yy),
          billingAddress: showBilling ? billingAddress : undefined,
          billingCity: showBilling ? billingCity : undefined,
          billingCountry: showBilling ? billingCountry : undefined,
          saveCard,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTxnId(json.transactionId || `TXN-${Date.now().toString().slice(-6)}`);
        setStep('success');
        await fetchData();
      } else {
        setDepositError(json.error || 'Payment failed. Please try again.');
        setStep('error');
      }
    } catch {
      setDepositError('Network error. Please try again.');
      setStep('error');
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-10 text-center text-slate-400 animate-pulse text-sm">Loading corporate hub…</div>
  );
  if (error) return (
    <div className="p-10 text-center text-red-400 font-semibold text-sm">Error: {error}</div>
  );

  const needsSignoff = (data.bounties || []).filter((b: any) => b.Status === 'Under_Review');
  const inProgress   = (data.bounties || []).filter((b: any) => b.Status === 'Assigned');
  const isVerified   = data.Verification_Status === 'Verified';

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-white">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-5">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">Corporate Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {data.Full_Name}!</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-slate-400 text-sm">{data.Company_Name}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
              isVerified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
            }`}>
              {isVerified ? '✓ Verified' : data.Verification_Status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/dashboard/manage-bounties"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post Bounty
          </Link>
          <Link
            href="/dashboard/submissions"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
          >
            Review Studio
            {needsSignoff.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {needsSignoff.length}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/bounty-history"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Bounty History
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Available Credits */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Available Credits</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              ${parseFloat(data.Fiat_Balance || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">Ready to deploy</p>
          </div>
          <button
            onClick={() => setDepositModal(true)}
            className="mt-4 w-full py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors"
          >
            + Add Funds
          </button>
        </div>

        {/* Funds on hold */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Funds on Hold</span>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-400">
              ${parseFloat(data.Escrow_Balance || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">Reserved for active bounties</p>
          </div>
          <Link
            href="/dashboard/bounty-history"
            className="mt-4 block w-full text-center py-1.5 text-xs font-semibold rounded-lg border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
          >
            View History →
          </Link>
        </div>

        {/* Pending reviews */}
        <div className={`backdrop-blur-sm rounded-2xl p-5 flex flex-col justify-between ${
          needsSignoff.length > 0
            ? 'bg-orange-500/5 border border-orange-500/30'
            : 'bg-slate-800/80 border border-slate-700'
        }`}>
          <div>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pending Review</span>
              {needsSignoff.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse mt-1" />}
            </div>
            <p className={`text-2xl font-bold ${needsSignoff.length > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
              {needsSignoff.length}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">Awaiting your approval</p>
          </div>
          <Link
            href="/dashboard/submissions"
            className={`mt-4 block w-full text-center py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              needsSignoff.length > 0
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Open Review Studio →
          </Link>
        </div>

        {/* Satisfaction */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Satisfaction</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 text-sm">★</span>
            </div>
          </div>
          {data.Avg_Client_Rating ? (
            <>
              <div className="flex items-end gap-1.5">
                <p className="text-2xl font-bold text-yellow-400">{data.Avg_Client_Rating}</p>
                <p className="text-slate-500 text-sm mb-0.5">/ 5</p>
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-xs ${s <= Math.round(data.Avg_Client_Rating) ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                {data.Total_Client_Reviews} talent {data.Total_Client_Reviews === 1 ? 'review' : 'reviews'}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-600">—</p>
              <p className="text-[10px] text-slate-600 mt-1">No talent reviews yet</p>
            </>
          )}
        </div>
      </div>

      {/* Needs sign-off */}
      {needsSignoff.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              Needs Your Sign-off
              <span className="text-sm font-normal text-slate-400">({needsSignoff.length})</span>
            </h2>
            <Link href="/dashboard/submissions" className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors">
              Open Review Studio →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needsSignoff.map((b: any) => (
              <div key={b.Bounty_ID} className="bg-slate-900/80 border border-orange-500/25 rounded-xl p-4 flex flex-col gap-3 hover:border-orange-500/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      Talent: <span className="text-slate-400">{b.Student_Name || 'Candidate'}</span>
                    </p>
                    <h3 className="font-semibold text-white leading-snug">{b.Title}</h3>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                    Under Review
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="font-bold text-emerald-400">${parseFloat(b.Reward_Amount).toFixed(2)} reward</span>
                  <Link href="/dashboard/submissions" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                    Review & Release →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active commitments */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Active Commitments
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
            {inProgress.length} in progress
          </span>
          <span className="text-xs font-medium text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
            {data.Total_Bounties_Posted || 0} total posted
          </span>
        </div>

        {inProgress.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center space-y-2">
            <p className="text-slate-400 font-semibold">No tasks currently in progress.</p>
            <p className="text-slate-500 text-sm">Post a bounty to attract skilled talent.</p>
            <Link href="/dashboard/manage-bounties" className="text-blue-400 text-sm hover:underline block pt-1">
              Post New Bounty →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inProgress.map((b: any) => (
              <div key={b.Bounty_ID} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors flex flex-col gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">
                    Talent: <span className="text-slate-400">{b.Student_Name || 'Assigned'}</span>
                  </p>
                  <h3 className="font-semibold text-white leading-snug">{b.Title}</h3>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">${parseFloat(b.Reward_Amount).toFixed(2)}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-blue-400">{b.Required_RP} RP</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-500">{b.Required_Skill}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    In Progress
                  </span>
                </div>
                <Link
                  href={`/dashboard/messages/${b.Bounty_ID}`}
                  className="flex w-full items-center justify-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold py-2 rounded-lg text-xs transition-colors border border-blue-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message Talent
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Deposit modal ──────────────────────────────────────────────────── */}
      {depositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* ── Step: Amount ── */}
            {step === 'amount' && (
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">Add Funds</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Funds are added to your wallet instantly</p>
                  </div>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">✕</button>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">Deposit amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01" min="5" max="10000"
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-slate-600"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex flex-wrap gap-2">
                    {['50', '100', '250', '500', '1000'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDepositAmount(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          depositAmount === v
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>

                  {/* Balance preview */}
                  {data && (
                    <div className="p-3 bg-slate-800/60 rounded-lg text-xs text-slate-400 flex justify-between">
                      <span>Current balance</span>
                      <span className="text-white font-semibold">${parseFloat(data.Fiat_Balance || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {depositAmount && parseFloat(depositAmount) >= 5 && data && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs flex justify-between">
                      <span className="text-slate-400">Balance after deposit</span>
                      <span className="text-emerald-400 font-bold">
                        ${(parseFloat(data.Fiat_Balance || 0) + parseFloat(depositAmount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button" onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!depositAmount || parseFloat(depositAmount) < 5 || parseFloat(depositAmount) > 10000}
                    onClick={() => setStep('card')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Card ── */}
            {step === 'card' && (
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('amount')}
                      className="text-slate-500 hover:text-white transition-colors text-sm"
                    >
                      ←
                    </button>
                    <div>
                      <h3 className="text-lg font-bold text-white">Payment Details</h3>
                      <p className="text-xs text-slate-500">Depositing <span className="text-emerald-400 font-semibold">${parseFloat(depositAmount).toFixed(2)}</span></p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">✕</button>
                </div>

                {/* Simulated card visual */}
                <div className="relative h-28 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 p-4 overflow-hidden select-none">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border-2 border-white" />
                    <div className="absolute -right-4 -top-4 w-40 h-40 rounded-full border-2 border-white" />
                  </div>
                  <div className="relative flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-5 bg-yellow-400/80 rounded-sm" />
                      {cardBrand && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded tracking-wider ${BRAND_PILL[cardBrand] || 'bg-slate-600 text-white'}`}>
                          {cardBrand === 'Mastercard' ? 'MC' : cardBrand.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-mono text-sm tracking-widest">
                        {cardNumber
                          ? cardNumber.padEnd(cardBrand === 'Amex' ? 17 : 19, '·').replace(/\d(?=.{5})/g, '·')
                          : '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex gap-6 mt-1 text-[10px] text-slate-400">
                        <span>{cardholderName || 'CARDHOLDER NAME'}</span>
                        <span>{expiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCardSubmit} className="space-y-4">
                  {/* Card number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0000 0000 0000 0000"
                        maxLength={cardBrand === 'Amex' ? 17 : 19}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600 pr-16"
                        value={cardNumber}
                        onChange={e => {
                          const brand = detectBrand(e.target.value);
                          const maxD = brand === 'Amex' ? 15 : 16;
                          const d = e.target.value.replace(/\D/g, '').substring(0, maxD);
                          setCardNumber(fmtCardNumber(d, brand));
                        }}
                      />
                      {cardBrand && (
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold rounded tracking-wider ${BRAND_PILL[cardBrand]}`}>
                          {cardBrand === 'Mastercard' ? 'MC' : cardBrand.toUpperCase().substring(0, 4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cardholder name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="Name as it appears on card"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                      value={cardholderName}
                      onChange={e => setCardholderName(e.target.value.toUpperCase())}
                    />
                  </div>

                  {/* Expiry + CVV row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Expiry Date</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                        value={expiry}
                        onChange={e => setExpiry(fmtExpiry(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        CVV {cardBrand === 'Amex' ? '(4 digits)' : '(3 digits)'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder={cardBrand === 'Amex' ? '••••' : '•••'}
                        maxLength={cardBrand === 'Amex' ? 4 : 3}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                        value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').substring(0, cardBrand === 'Amex' ? 4 : 3))}
                      />
                    </div>
                  </div>

                  {/* Billing address accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowBilling(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <span className={`transition-transform ${showBilling ? 'rotate-90' : ''}`}>›</span>
                      {showBilling ? 'Hide billing address' : '+ Add billing address (optional)'}
                    </button>
                    {showBilling && (
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          placeholder="Street address"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                          value={billingAddress}
                          onChange={e => setBillingAddress(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="City"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                            value={billingCity}
                            onChange={e => setBillingCity(e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Country"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-600"
                            value={billingCountry}
                            onChange={e => setBillingCountry(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save card */}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={e => setSaveCard(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      Save card for future payments
                    </span>
                  </label>

                  {/* Validation error */}
                  {cardError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                      {cardError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { setCardError(''); setStep('amount'); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      Pay ${parseFloat(depositAmount).toFixed(2)}
                    </button>
                  </div>
                </form>

                <p className="text-center text-[10px] text-slate-600">
                  🔒 Simulated payment — no real charges are made
                </p>
              </div>
            )}

            {/* ── Step: Processing ── */}
            {step === 'processing' && (
              <div className="p-10 flex flex-col items-center justify-center gap-5 min-h-[260px]">
                <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin" />
                <div className="text-center">
                  <p className="text-white font-semibold text-base">{processingLabel}</p>
                  <p className="text-slate-500 text-xs mt-1">Please don't close this window</p>
                </div>
              </div>
            )}

            {/* ── Step: Success ── */}
            {step === 'success' && (
              <div className="p-10 flex flex-col items-center justify-center gap-5 min-h-[280px]">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-bold text-white">Payment Successful!</p>
                  <p className="text-emerald-400 font-semibold text-lg">
                    +${parseFloat(depositAmount).toFixed(2)} added to your wallet
                  </p>
                  {txnId && (
                    <p className="text-xs text-slate-500 font-mono mt-2">Ref: {txnId}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Back to Dashboard
                </button>
              </div>
            )}

            {/* ── Step: Error ── */}
            {step === 'error' && (
              <div className="p-10 flex flex-col items-center justify-center gap-5 min-h-[260px]">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-bold text-white">Payment Failed</p>
                  <p className="text-sm text-slate-400">{depositError}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button" onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('card'); setDepositError(''); }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
