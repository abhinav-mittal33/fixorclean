'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AuroraBackground } from '@/components/ui/aurora-background';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.55, ease: 'easeOut' },
});

const PIPELINE_STEPS = [
  { icon: '📥', step: '01', title: 'Upload', desc: 'CSV, Excel, Google Sheets or paste a Google Form URL. Done in seconds.' },
  { icon: '🔍', step: '02', title: 'Detect', desc: 'AI reads every column — emails, phones, ratings, dates, open text — automatically.' },
  { icon: '🧹', step: '03', title: 'Clean', desc: 'AI flags every issue with a confidence score. You approve, reject, or set custom rules.' },
  { icon: '📊', step: '04', title: 'Analyse', desc: 'Charts, theme clusters, and anomaly detection — generated in one click.' },
  { icon: '📑', step: '05', title: 'Report', desc: 'AI writes the executive report. You export a PDF. Your work is done.' },
];

const FEATURES = [
  { icon: '🎯', title: 'Smart Column Detection', desc: 'Detects 10+ column types automatically — emails, phones, dates, ratings, categories, open text. No setup needed.' },
  { icon: '🤖', title: 'AI-Powered Cleaning', desc: 'Fixes typos, normalises formats, flags trolls and duplicates — all with confidence scores you can override.' },
  { icon: '📋', title: 'Custom Format Rules', desc: 'Tell the AI your ideal format once. It applies your rules across every row, every column, instantly.' },
  { icon: '💬', title: 'Open Text Clustering', desc: '300 raw comments become 5 clear themes with sentiment scores — in under 10 seconds.' },
  { icon: '📈', title: 'Automatic Visualisation', desc: 'Charts chosen by data type. Bar, donut, distribution — no Excel knowledge, no manual work.' },
  { icon: '🛡️', title: 'Survey Design Checker', desc: 'Paste a Google Form URL before you launch. AI scores it for bias, clarity, and scale balance.' },
];


const BEFORE = [
  { name: 'john SMITH',   email: 'john@gmal.com',     phone: '9876543210',      gender: 'M' },
  { name: 'PRIYA sharma', email: 'priya@gmail.com',   phone: '+91-98765-43210', gender: 'Female' },
  { name: 'rahul K',      email: 'rahul@hotnail.com', phone: '9876543210',      gender: 'male' },
  { name: 'test user',    email: 'asdf@',             phone: '1234567890',      gender: 'N/A' },
];

const AFTER = [
  { name: 'John Smith',   email: 'john@gmail.com',    phone: '+91 98765 43210', gender: 'Male',   flags: [0,1,2,3] },
  { name: 'Priya Sharma', email: 'priya@gmail.com',   phone: '+91 98765 43210', gender: 'Female', flags: [0,2,3] },
  { name: 'Rahul K',      email: 'rahul@hotmail.com', phone: '+91 98765 43210', gender: 'Male',   flags: [1,2,3] },
  { name: '⚠ Flagged',   email: '❌ Invalid',         phone: '❌ Fake',          gender: '—',      flags: [0,1,2] },
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep(p => (p + 1) % PIPELINE_STEPS.length), 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 0',
        background: 'rgba(247,244,239,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', textDecoration: 'none', color: 'var(--ink)' }}>
            Fix<span style={{ color: 'var(--teal)' }}>Or</span>Clean
          </Link>
          <div style={{ display: 'flex', gap: '32px' }}>
            {['How It Works|#how-it-works','Features|#features'].map(l => {
              const [label, href] = l.split('|');
              return <a key={href} href={href} style={{ color: 'var(--muted)', fontWeight: 500, fontSize: '13px', textDecoration: 'none' }}>{label}</a>;
            })}
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-sm">Launch App →</Link>
        </div>
      </nav>

      {/* ── Aurora Hero ── */}
      <AuroraBackground showRadialGradient style={{ minHeight: '100vh', height: 'auto', paddingTop: '80px' } as React.CSSProperties}>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: 'easeOut' }}
          style={{ maxWidth: '820px', zIndex: 10, textAlign: 'center', padding: '60px 24px 80px', position: 'relative' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(26,140,104,0.12)', border: '0.5px solid var(--teal)', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '32px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
            AI-First · Zero Data Skills Required
          </div>

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-2.5px', color: 'var(--ink)', marginBottom: '28px' }}>
            From messy CSV<br />to board-ready report<br />
            <em style={{ color: 'var(--teal)' }}>in under 60 seconds.</em>
          </h1>

          <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '560px', lineHeight: 1.75, fontWeight: 300, marginBottom: '40px', margin: '0 auto 40px' }}>
            FixOrClean cleans, analyses, and writes executive reports from your raw survey exports — with zero data skills required.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '56px', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">Start Cleaning — Free</Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">See How It Works</a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', maxWidth: '580px', margin: '0 auto' }}>
            {[
              { value: '< 60s', label: 'CSV to PDF report' },
              { value: '10+', label: 'column types detected' },
              { value: '0', label: 'data skills needed' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px 24px', background: 'rgba(247,244,239,0.85)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 700, color: 'var(--teal)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginTop: '6px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </AuroraBackground>

      {/* ── Before / After ── */}
      <section style={{ borderBottom: '0.5px solid var(--border)', padding: '80px 0' }}>
        <div className="container">
          <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: '16px' }}>
              See the <em style={{ color: 'var(--teal)' }}>transformation</em>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.75, fontWeight: 300 }}>Real data. Real AI cleaning. Real results.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px', alignItems: 'center' }}>
            <motion.div {...fadeUp(0)}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span className="badge badge-error">Before</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Raw Export</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th></tr></thead>
                    <tbody>{BEFORE.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.gender}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'var(--shadow-md)' }}>→</div>
            </motion.div>

            <motion.div {...fadeUp(0.2)}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span className="badge badge-success">After</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>AI Cleaned</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th></tr></thead>
                    <tbody>
                      {AFTER.map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: r.flags.includes(0) ? (i === 3 ? 'var(--warning)' : 'var(--teal)') : 'inherit' }}>{r.name}</td>
                          <td style={{ color: r.flags.includes(1) ? (i === 3 ? 'var(--error)' : 'var(--teal)') : 'inherit' }}>{r.email}</td>
                          <td style={{ color: r.flags.includes(2) ? (i === 3 ? 'var(--error)' : 'var(--teal)') : 'inherit' }}>{r.phone}</td>
                          <td style={{ color: r.flags.includes(3) ? (i === 3 ? 'var(--muted)' : 'var(--teal)') : 'inherit' }}>{r.gender}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ borderBottom: '0.5px solid var(--border)', padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: '16px' }}>
              Five steps. <em style={{ color: 'var(--teal)' }}>Under a minute.</em>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.75, fontWeight: 300, maxWidth: '540px', margin: '0 auto' }}>
              The only end-to-end survey intelligence platform built for non-technical users.
            </p>
          </motion.div>

          <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.08)}
                onClick={() => setActiveStep(i)}
                style={{
                  flex: 1, padding: '28px 20px', cursor: 'pointer', textAlign: 'center',
                  background: activeStep === i ? 'var(--teal-light)' : 'var(--white)',
                  borderTop: `2px solid ${activeStep === i ? 'var(--teal)' : 'transparent'}`,
                  borderRight: i < PIPELINE_STEPS.length - 1 ? '0.5px solid var(--border)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{step.icon}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', marginBottom: '6px' }}>{step.step}</div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{step.title}</h4>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ borderBottom: '0.5px solid var(--border)', padding: '80px 0' }}>
        <div className="container">
          <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: '16px' }}>
              Every feature solves<br /><em style={{ color: 'var(--teal)' }}>a real problem.</em>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.75, fontWeight: 300, maxWidth: '540px', margin: '0 auto' }}>
              Built by people who&apos;ve cleaned too many spreadsheets by hand.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fadeUp(i * 0.07)} className="glass-card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{f.icon}</div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h4>
                <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.65, fontWeight: 300 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Final CTA (Aurora) ── */}
      <AuroraBackground showRadialGradient={false} style={{ minHeight: 'auto', height: 'auto', padding: '100px 0' } as React.CSSProperties} className="h-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ textAlign: 'center', zIndex: 10, position: 'relative', padding: '0 24px' }}
        >
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,4vw,56px)', fontWeight: 700, letterSpacing: '-1.5px', marginBottom: '20px', color: 'var(--ink)' }}>
            Your next survey report<br />takes <em style={{ color: 'var(--teal)' }}>60 seconds.</em>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '17px', lineHeight: 1.7, fontWeight: 300, maxWidth: '480px', margin: '0 auto 36px' }}>
            No sign-up friction. No credit card. Just upload your CSV and watch the AI work.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-lg">Start Cleaning — Free →</Link>
        </motion.div>
      </AuroraBackground>

      {/* ── Footer ── */}
      <footer style={{ padding: '40px 0', borderTop: '0.5px solid var(--border)', background: 'var(--white)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>Fix<span style={{ color: 'var(--teal)' }}>Or</span>Clean</span>
            <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '12px' }}>Survey Intelligence Platform · India</p>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {['How It Works|#how-it-works','Features|#features'].map(l => {
              const [label, href] = l.split('|');
              return <a key={href} href={href} style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>{label}</a>;
            })}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '0.5px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>© 2025 FixOrClean. Built with ❤️ for Indian institutions and researchers.</p>
        </div>
      </footer>
    </div>
  );
}
