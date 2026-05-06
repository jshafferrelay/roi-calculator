const HS_PORTAL_ID = '245182131'
const HS_FORM_GUID = 'c13a33fe-2545-45ef-bc12-77b30a86a658'

const PAIN_LABELS = {
  duplicate: 'Duplicate invoices',
  kickback: 'Servicer kickbacks',
  sorting: 'Manual invoice sorting',
  gap: 'Cash gaps from delayed draws',
  partial: 'Partial funding',
  late: 'Missed or late draw cycles',
  chase: 'Last-minute document chase',
}

const DEDICATED_FLAGS = {
  one: 'Single point of failure: if that person is out, your draws stop.',
  shared: 'Shared ownership without a system of record means things fall through.',
  adhoc: 'Ad hoc process: whoever runs the draw this cycle may not know what the last person did.',
  me: "Owner-dependent: your time is too valuable for draw assembly.",
}

function fmt(n) {
  return n.toLocaleString('en-US')
}

function buildReport(answers, roi) {
  const painItems = answers.pain || []
  const painLines = painItems.map(p => PAIN_LABELS[p]).filter(Boolean).join(', ') || 'None reported'
  const role = answers.role === 'owner' ? 'Owner / Principal / Executive' : 'Asset Manager / Property Manager'

  return `Role: ${role}
Portfolio: ${answers.properties} properties
Hours per draw: ${answers.hours}
Monthly invoices: ${answers.invoices}
Process: ${answers.process}
Ownership: ${answers.dedicated}

Monthly draw labor: $${fmt(roi.monthlyLaborCost)} (${roi.monthlyHours} hrs)
Delayed funding exposure: $${fmt(roi.monthlyDelayExposure)}
Duplicate invoice risk: $${fmt(roi.duplicateExposure)} (~${roi.duplicateCount}/mo)

Pain points: ${painLines}
Resource risk: ${DEDICATED_FLAGS[answers.dedicated] || 'N/A'}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { answers, email, roi } = req.body
  if (!email || !answers || !roi) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const role = answers.role === 'owner' ? 'Owner / Principal / Executive' : 'Asset Manager / Property Manager'
  const report = buildReport(answers, roi)

  const fields = [
    { name: 'email',                  value: email },
    { name: 'jobtitle',               value: role },
    { name: 'portfolio_size',         value: answers.properties || '' },
    { name: 'roi_calculator_report',  value: report },
  ]

  try {
    const res2 = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HS_PORTAL_ID}/${HS_FORM_GUID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          context: { pageUri: 'https://relay-diagnostic-src.vercel.app', pageName: 'Relay ROI Calculator' },
        }),
      }
    )

    if (!res2.ok) {
      const err = await res2.json()
      console.error('HubSpot error:', err)
      return res.status(500).json({ error: 'HubSpot submission failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Submit error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
