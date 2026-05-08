import { useState, useEffect } from 'react'
import {
  QUESTIONS, PAIN_FLAGS,
  calcROI, fmt, validateEmail
} from './data.js'
import './styles.css'

const TOTAL_STEPS = QUESTIONS.length

const LEFT_COPY = [
  { headline: 'Is your draw process working for you or against you?', sub: 'A 2-minute diagnostic built for operators who\'ve actually run draws.' },
  { headline: 'Draws look different depending on where you sit — but the cost lands on everyone.', sub: null },
  { headline: 'On a $15M loan at 7%, every day without funding costs $2,877 in interest carry. Portfolio size determines how fast that adds up.', sub: null },
  { headline: 'Relay customers cut draw cycles from 22 days to 9 days. The difference is process, not people.', sub: null },
  { headline: 'One point of failure is one missed lien waiver away from a stalled sale or refi.', sub: null },
  { headline: 'GCs routinely send the same invoice twice — or slightly reword it. Most teams catch it after funding, if at all.', sub: null },
  { headline: 'One Asset Manager can manage 11 active projects instead of 5 — without adding headcount.', sub: null },
  { headline: 'Hundreds of invoices a month creates room for mistakes. A single missed duplicate means paying for the same work twice.', sub: null },
]

export default function App() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [reportVisible, setReportVisible] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [painNoneShown, setPainNoneShown] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [theme, setTheme] = useState('coast')

  const currentQ = QUESTIONS[step]
  const leftCopy = showIntro ? LEFT_COPY[0] : (LEFT_COPY[step + 1] || LEFT_COPY[0])
  const isMulti = currentQ?.type === 'multi'

  const progress = showIntro ? 0 : step / TOTAL_STEPS
  const progressPct = Math.round(progress * 100)

  function selectOption(val) {
    if (isMulti) {
      const current = answers[currentQ.id] || []
      const next = current.includes(val)
        ? current.filter(v => v !== val)
        : [...current, val]
      setAnswers(a => ({ ...a, [currentQ.id]: next }))
    } else {
      setAnswers(a => ({ ...a, [currentQ.id]: val }))
    }
  }

  function isSelected(val) {
    if (isMulti) return (answers[currentQ.id] || []).includes(val)
    return answers[currentQ.id] === val
  }

  function canAdvance() {
    if (currentQ?.id === 'pain') return true
    if (isMulti) return (answers[currentQ.id] || []).length > 0
    return !!answers[currentQ.id]
  }

  function advance() {
    if (currentQ?.id === 'pain' && (answers.pain || []).length === 0) {
      if (!painNoneShown) {
        setPainNoneShown(true)
        return
      }
    }
    setPainNoneShown(false)
    setAnimKey(k => k + 1)
    setStep(s => s + 1)
  }

  function back() {
    if (step === 0) return
    setAnimKey(k => k + 1)
    setStep(s => s - 1)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && step < TOTAL_STEPS && canAdvance()) advance()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, answers])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!validateEmail(email)) {
      setEmailError('Please enter your work email address.')
      return
    }
    setEmailError('')
    setSending(true)
    const roi = calcROI(answers)
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, email, roi }),
      })
    } catch (_) {}
    setSending(false)
    setSubmitted(true)
    setTimeout(() => setReportVisible(true), 100)
  }

  const roi = calcROI(answers)
  const isOwner = answers.role === 'owner'
  const painItems = answers.pain || []

  const showReport = step === TOTAL_STEPS

  return (
    <div className="shell" data-theme={theme}>
      <div className="left-panel">
        <div className="panel-pills" aria-hidden="true">
          <div className="pill pill-1" />
          <div className="pill pill-2" />
        </div>
        <div className="left-inner">
          <div className="logo-block">
            <img src="/relay_primarylogo02.png" alt="Relay" className="logo-img" />
          </div>

          <div className="left-copy-block" key={`copy-${step}`}>
            <p className="left-headline">{leftCopy.headline}</p>
            {leftCopy.sub && <p className="left-sub">{leftCopy.sub}</p>}
          </div>

          <div className="progress-block">
            {(showIntro || step < TOTAL_STEPS) && (
              <>
                <div className="progress-label">
                  <span>{showIntro ? 'Getting started' : `Question ${step + 1} of ${TOTAL_STEPS}`}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </>
            )}
            {!showIntro && step === TOTAL_STEPS && (
              <div className="progress-label"><span>Report ready</span><span>100%</span></div>
            )}
          </div>

          <div className="theme-toggle">
            <button
              className={`theme-swatch theme-swatch-coast${theme === 'coast' ? ' active' : ''}`}
              onClick={() => setTheme('coast')}
              title="Coast theme"
            />
            <button
              className={`theme-swatch theme-swatch-glide${theme === 'glide' ? ' active' : ''}`}
              onClick={() => setTheme('glide')}
              title="Glide theme"
            />
          </div>
        </div>
      </div>

      <div className="right-panel">
        {showIntro && (
          <div className="question-wrap" key="intro">
            <div className="q-number">Draw Readiness Diagnostic</div>
            <h2 className="q-text">Take 2 minutes to see how much your draws are costing you.</h2>
            <p className="q-hint">
              We'll calculate your estimated time cost, delayed funding exposure,
              and show you exactly where your process is leaking money.
            </p>
            <div className="nav-row nav-row-left">
              <button className="next-btn active" onClick={() => { setShowIntro(false); setAnimKey(k => k + 1) }}>
                Get started →
              </button>
            </div>
          </div>
        )}

        {!showIntro && !showReport && (
          <div className="question-wrap" key={`q-${animKey}`}>
            <div className="q-number">Question {step + 1} of {TOTAL_STEPS}</div>
            <h2 className="q-text">{currentQ.question}</h2>
            {currentQ.hint && <p className="q-hint">{currentQ.hint}</p>}

            {painNoneShown && currentQ?.id === 'pain' && (
              <p className="pain-none-msg">
                Sounds like you've got a clean process — let's still show you where most teams have room to improve.
              </p>
            )}

            <div className={`options-list${isMulti ? ' multi' : ''}`}>
              {currentQ.options.map(opt => (
                <button
                  key={opt.value}
                  className={`option-btn${isSelected(opt.value) ? ' selected' : ''}`}
                  onClick={() => selectOption(opt.value)}
                >
                  <span className={`option-indicator${isSelected(opt.value) ? ' selected' : ''}${isMulti ? ' square' : ''}`} />
                  <span className="option-label">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="nav-row">
              {step > 0
                ? <button className="back-btn" onClick={back}>← Back</button>
                : <button className="back-btn" onClick={() => setShowIntro(true)}>← Back</button>
              }
              <button
                className={`next-btn${canAdvance() ? ' active' : ''}`}
                onClick={advance}
                disabled={!canAdvance()}
              >
                {step === TOTAL_STEPS - 1 ? 'See my results →' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {showReport && (
          <div className="report-wrap">
            {!submitted && (
              <div className="email-gate" key="gate">
                <h2 className="gate-headline">Your numbers are in.</h2>
                <p className="gate-sub">
                  Based on your answers, here's your estimated monthly exposure.
                </p>

                <div className="preview-metrics">
                  <div className="preview-metric accent-coast">
                    <div className="metric-label">Monthly draw labor</div>
                    <div className="metric-value">${fmt(roi.monthlyLaborCost)}</div>
                    <div className="metric-sub">{roi.monthlyHours} hrs/mo tied up in draw assembly</div>
                  </div>
                  <div className="preview-metric accent-glide">
                    <div className="metric-label">Delayed funding cost</div>
                    <div className="metric-value">${fmt(roi.monthlyDelayExposure)}</div>
                    <div className="metric-sub">21-day avg across {roi.numProperties} properties</div>
                  </div>
                  <div className="preview-metric accent-surge">
                    <div className="metric-label">Overbilling & duplicate invoice funding requests</div>
                    <div className="metric-value">${fmt(roi.duplicateExposure)}</div>
                    <div className="metric-sub">~{roi.duplicateCount} incidents/mo at $5K avg</div>
                  </div>
                </div>

                <div className="report-preview-blur">
                  <div className="report-preview-inner">
                    <div className="preview-blur-row">
                      <div className="preview-blur-dot" />
                      <div className="preview-blur-line wide" />
                    </div>
                    <div className="preview-blur-row">
                      <div className="preview-blur-dot" />
                      <div className="preview-blur-line medium" />
                    </div>
                    <div className="preview-blur-row">
                      <div className="preview-blur-dot" />
                      <div className="preview-blur-line wide" />
                    </div>
                    <div className="preview-blur-row">
                      <div className="preview-blur-dot" />
                      <div className="preview-blur-line short" />
                    </div>
                    <div className="preview-blur-divider" />
                    <div className="preview-blur-row">
                      <div className="preview-blur-dot accent" />
                      <div className="preview-blur-line medium" />
                    </div>
                  </div>
                  <div className="report-preview-lock">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-label">Unlock your full breakdown</span>
                  </div>
                </div>

                <p className="gate-unlock-copy">
                  Enter your work email to see your process gaps, risk flags, and what to do about them.
                </p>

                <form className="email-form" onSubmit={handleEmailSubmit}>
                  <div className="email-input-wrap">
                    <input
                      type="email"
                      className={`email-input${emailError ? ' error' : ''}`}
                      placeholder="you@yourcompany.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError('') }}
                      autoFocus
                    />
                    <button type="submit" className="email-btn" disabled={sending}>
                      {sending ? 'Sending…' : 'Get My Report →'}
                    </button>
                  </div>
                  {emailError && <p className="email-error">{emailError}</p>}
                  <p className="email-fine">Work email only. We'll send a copy to your inbox.</p>
                </form>
              </div>
            )}

            {submitted && (
              <div className={`full-report${reportVisible ? ' visible' : ''}`}>
                <div className="report-header">
                  <div className="report-badge">Draw Readiness Report</div>
                  <h2 className="report-title">
                    {isOwner
                      ? 'Here\'s the operational exposure in your draw process.'
                      : 'Here\'s what your draw process is actually costing you.'}
                  </h2>
                  <p className="report-subtitle">
                    Based on your answers — {answers.properties} properties,{' '}
                    {isOwner ? 'owner/executive' : 'asset manager'},{' '}
                    {answers.hours?.replace('under2', 'under 2 hrs').replace('2-5', '2–5 hrs').replace('5-10', '5–10 hrs').replace('10+', '10+ hrs').replace('unknown', 'unmeasured')} per draw
                  </p>
                </div>

                <div className="metrics-row">
                  <div className="metric-card accent-coast">
                    <div className="metric-card-label">Monthly draw labor</div>
                    <div className="metric-card-value">${fmt(roi.monthlyLaborCost)}</div>
                    <div className="metric-card-sub">{roi.monthlyHours} hrs/mo tied up in draw assembly</div>
                  </div>
                  <div className="metric-card accent-glide">
                    <div className="metric-card-label">Delayed funding cost</div>
                    <div className="metric-card-value">${fmt(roi.monthlyDelayExposure)}</div>
                    <div className="metric-card-sub">21-day avg delay across {roi.numProperties} properties</div>
                  </div>
                  <div className="metric-card accent-surge">
                    <div className="metric-card-label">Overbilling & duplicate invoice funding requests</div>
                    <div className="metric-card-value">${fmt(roi.duplicateExposure)}</div>
                    <div className="metric-card-sub">~{roi.duplicateCount} incidents/mo at $5K avg</div>
                  </div>
                </div>

                {painItems.length > 0 && (
                  <div className="report-section">
                    <div className="section-label">Process gaps flagged</div>
                    <div className="flags-grid">
                      <div className="flags-grid-header">
                        <span>Today</span>
                        <span>With Relay</span>
                      </div>
                      {painItems.map(p => (
                        <div className="flags-grid-row" key={p}>
                          <div className="flags-col-today">{PAIN_FLAGS[p]?.label}</div>
                          <div className="flags-col-relay">{PAIN_FLAGS[p]?.copy}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="report-cta">
                  <p className="cta-headline">
                    {isOwner
                      ? 'Relay gives your team back hours they\'re spending on manual work.'
                      : 'Relay builds your draw packages for you.'}
                  </p>
                  <p className="cta-sub">
                    {isOwner
                      ? 'One platform. Every draw. No scrambling.'
                      : 'Upload invoices across your portfolio. Relay identifies the property, allocates to budget, flags issues, and tells you when you\'re ready to submit.'}
                  </p>
                  <div className="cta-buttons">
                    <a href="mailto:hello@joinrelay.ai" className="cta-primary">Book a Demo →</a>
                    <a href="https://joinrelay.ai" className="cta-secondary">joinrelay.ai</a>
                  </div>
                </div>

                <div className="report-footnote">
                  * Estimates based on industry averages: $50/hr blended AM cost, 21-day avg draw delay on a $15M loan at 7% annual interest, 3% overbilling/duplicate rate, $5,000 avg invoice value. Actual figures vary by portfolio size and loan terms.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
