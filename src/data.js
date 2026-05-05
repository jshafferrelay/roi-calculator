export const QUESTIONS = [
  {
    id: 'role',
    question: 'What best describes your role?',
    hint: 'This shapes how we frame your results.',
    type: 'single',
    options: [
      { value: 'am', label: 'Asset Manager / Property Manager' },
      { value: 'owner', label: 'Owner / Principal / Executive' },
    ],
  },
  {
    id: 'properties',
    question: 'How many properties are you actively running draws or reserves on right now?',
    hint: 'Include both construction draws and replacement reserves.',
    type: 'single',
    options: [
      { value: '1-5', label: '1–5 properties', mid: 3 },
      { value: '6-15', label: '6–15 properties', mid: 10 },
      { value: '16-30', label: '16–30 properties', mid: 23 },
      { value: '30+', label: 'More than 30 properties', mid: 40 },
    ],
  },
  {
    id: 'process',
    question: 'When a draw deadline hits, which best describes what actually happens?',
    hint: 'Pick the most honest answer.',
    type: 'single',
    options: [
      { value: 'ready', label: "We're reviewing a package that's mostly built and ready" },
      { value: 'scramble', label: "We're pulling everything together from email, Dropbox, and spreadsheets" },
      { value: 'one-person', label: "One person owns the whole process — everyone hopes they're available" },
      { value: 'chaos', label: "It's different every cycle, honestly" },
    ],
  },
  {
    id: 'dedicated',
    question: 'Does your team have a dedicated person who owns draw packages?',
    hint: null,
    type: 'single',
    options: [
      { value: 'one', label: 'Yes — one person owns it' },
      { value: 'shared', label: "It's shared across a few people" },
      { value: 'adhoc', label: 'It falls to whoever has time' },
      { value: 'me', label: "Each AM handles their own properties' draws" },
    ],
  },
  {
    id: 'pain',
    question: 'Which of these have happened to your team in the last 12 months?',
    hint: 'Select all that apply.',
    type: 'multi',
    options: [
      { value: 'duplicate', label: 'Submitted a draw with a duplicate invoice' },
      { value: 'kickback', label: 'Draw kicked back due to missing documents or lien waivers' },
      { value: 'sorting', label: 'Had to manually figure out which invoice belonged to which property' },
      { value: 'gap', label: 'Owner or exec had to fund a gap because a draw was delayed' },
      { value: 'partial', label: 'Lender partially funded a draw' },
      { value: 'late', label: 'Submitted a draw late or missed a cycle entirely' },
      { value: 'chase', label: 'Had to chase a vendor or GC for a missing document at the last minute' },
    ],
  },
  {
    id: 'hours',
    question: 'For a single property, how long does it take to go from "invoices are in" to "draw submitted"?',
    hint: 'Think about the full process — sorting, categorizing, assembling, submitting.',
    type: 'single',
    options: [
      { value: 'under2', label: 'Less than 2 hours', mid: 1 },
      { value: '2-5', label: '2–5 hours', mid: 3.5 },
      { value: '5-10', label: '5–10 hours', mid: 7.5 },
      { value: '10+', label: 'More than 10 hours', mid: 12 },
      { value: 'unknown', label: "We've never measured it", mid: 8 },
    ],
  },
  {
    id: 'invoices',
    question: 'How many invoices does your team process across all draws in a typical month?',
    hint: 'A rough estimate is fine.',
    type: 'single',
    options: [
      { value: 'under50', label: 'Fewer than 50', mid: 25 },
      { value: '50-200', label: '50–200', mid: 125 },
      { value: '200-500', label: '200–500', mid: 350 },
      { value: '500+', label: 'More than 500', mid: 600 },
    ],
  },
]

export const PAIN_FLAGS = {
  duplicate: {
    label: 'Duplicate invoices',
    copy: 'Relay detects these before submission — not after funding.',
  },
  kickback: {
    label: 'Servicer kickbacks',
    copy: "Relay's pre-checklist enforces required docs before you hit submit.",
  },
  sorting: {
    label: 'Manual invoice sorting',
    copy: 'Relay reads each invoice and routes it to the correct property automatically.',
  },
  gap: {
    label: 'Cash gaps from delayed draws',
    copy: 'Relay builds draws proactively — so you\'re reviewing, not scrambling.',
  },
  partial: {
    label: 'Partial funding',
    copy: 'Relay catches incomplete packages before they leave your desk.',
  },
  late: {
    label: 'Missed or late draw cycles',
    copy: 'Relay tracks every draw across your portfolio in one view.',
  },
  chase: {
    label: 'Last-minute document chase',
    copy: "Relay's checklist flags missing items days before your deadline.",
  },
}

export const DEDICATED_FLAGS = {
  one: 'Single point of failure: if that person is out, your draws stop. Relay distributes the process to the platform.',
  shared: 'Shared ownership without a system of record means things fall through. Relay is the single source of truth.',
  adhoc: 'Ad hoc process: whoever runs the draw this cycle may not know what the last person did. Relay fixes that.',
  me: "Owner-dependent: your time is too valuable for draw assembly. Relay handles the build — you review and approve.",
}

export function calcROI(answers) {
  const propOpt = QUESTIONS[1].options.find(o => o.value === answers.properties)
  const numProperties = propOpt ? propOpt.mid : 10

  const hourOpt = QUESTIONS[5].options.find(o => o.value === answers.hours)
  const hoursPerDraw = hourOpt ? hourOpt.mid : 8

  const invOpt = QUESTIONS[6].options.find(o => o.value === answers.invoices)
  const invoiceVolume = invOpt ? invOpt.mid : 125

  const drawsPerMonth = numProperties
  const monthlyHours = Math.round(hoursPerDraw * drawsPerMonth)
  const monthlyLaborCost = Math.round(monthlyHours * 50)

  const delayPerProperty = 4500
  const monthlyDelayExposure = Math.round(numProperties * delayPerProperty)

  const avgInvoiceValue = 5000
  const duplicateRate = 0.015
  const duplicateCount = Math.round(invoiceVolume * duplicateRate)
  const duplicateExposure = Math.round(duplicateCount * avgInvoiceValue)

  return {
    numProperties,
    hoursPerDraw,
    invoiceVolume,
    monthlyHours,
    monthlyLaborCost,
    monthlyDelayExposure,
    duplicateCount,
    duplicateExposure,
  }
}

export function fmt(n) {
  return n.toLocaleString('en-US')
}

const BLOCKED_DOMAINS = new Set([
  'gmail.com','yahoo.com','yahoo.co.uk','hotmail.com','hotmail.co.uk',
  'outlook.com','live.com','icloud.com','me.com','aol.com',
  'protonmail.com','msn.com','comcast.net','sbcglobal.net',
  'att.net','verizon.net','mac.com','googlemail.com',
])

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return false
  const domain = email.split('@')[1].toLowerCase()
  if (BLOCKED_DOMAINS.has(domain)) return false
  return true
}

// Fill these in once HubSpot access is available
const HS_PORTAL_ID = 'YOUR_PORTAL_ID'
const HS_FORM_GUID = 'YOUR_FORM_GUID'

export async function sendLead(answers, email, roi) {
  const painLabels = (answers.pain || []).map(p => PAIN_FLAGS[p]?.label).filter(Boolean).join(', ')
  const roleLabel = answers.role === 'am' ? 'Asset Manager / Property Manager' : 'Owner / Principal / Executive'
  const resourceRisk = DEDICATED_FLAGS[answers.dedicated] || ''

  const fields = [
    { name: 'email',                value: email },
    { name: 'draw_role',            value: roleLabel },
    { name: 'draw_properties',      value: answers.properties },
    { name: 'draw_process',         value: answers.process },
    { name: 'draw_dedicated',       value: answers.dedicated },
    { name: 'draw_pain_points',     value: painLabels || 'None reported' },
    { name: 'draw_resource_risk',   value: resourceRisk },
    { name: 'draw_hours_per_draw',  value: answers.hours },
    { name: 'draw_invoice_volume',  value: answers.invoices },
    { name: 'draw_labor_cost',      value: `$${fmt(roi.monthlyLaborCost)}` },
    { name: 'draw_monthly_hours',   value: String(roi.monthlyHours) },
    { name: 'draw_delay_exposure',  value: `$${fmt(roi.monthlyDelayExposure)}` },
    { name: 'draw_num_properties',  value: String(roi.numProperties) },
    { name: 'draw_duplicate_exp',   value: `$${fmt(roi.duplicateExposure)}` },
    { name: 'draw_duplicate_count', value: String(roi.duplicateCount) },
  ]

  try {
    await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${HS_PORTAL_ID}/${HS_FORM_GUID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields,
        context: { pageUri: window.location.href, pageName: 'Relay Draw Readiness Diagnostic' },
      }),
    })
  } catch (_) {}
}
