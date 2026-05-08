const HS_PORTAL_ID = '245182131'
const HS_FORM_GUID = 'c13a33fe-2545-45ef-bc12-77b30a86a658'

const EJS_SERVICE_ID  = 'service_8uzw121'
const EJS_TEMPLATE_ID = 'template_ybuhvu8'
const EJS_PUBLIC_KEY  = 'sn_5VxRjAqHj40M9X'

const PAIN_FLAGS = {
  duplicate: {
    label: 'Duplicate invoice submissions',
    copy: "Relay flags duplicate invoice numbers and amounts before you submit — whether it's an internal mistake or a GC resubmission.",
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
    copy: "Relay builds draws proactively — so you're reviewing, not scrambling.",
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

const HOURS_LABELS = {
  'under2':  'under 2 hrs',
  '2-5':     '2–5 hrs',
  '5-10':    '5–10 hrs',
  '10+':     '10+ hrs',
  'unknown': 'unmeasured',
}

const DEDICATED_FLAGS = {
  one:    'Single point of failure: if that person is out, your draws stop.',
  shared: 'Shared ownership without a system of record means things fall through.',
  adhoc:  'Ad hoc process: whoever runs the draw this cycle may not know what the last person did.',
  me:     'Owner-dependent: your time is too valuable for draw assembly.',
}

function fmt(n) {
  return n.toLocaleString('en-US')
}

function buildPainSection(painItems) {
  if (!painItems || painItems.length === 0) return ''
  const rows = painItems.map(p => {
    const flag = PAIN_FLAGS[p]
    if (!flag) return ''
    return `<tr>
      <td style="padding:13px 16px;font-size:13px;color:#2C2C2A;border-bottom:1px solid #E8E7E2;vertical-align:top;">${flag.label}</td>
      <td style="padding:13px 16px;font-size:13px;color:#0A3126;border-bottom:1px solid #E8E7E2;background:#DDF2CC;vertical-align:top;">${flag.copy}</td>
    </tr>`
  }).join('')

  return `<tr>
    <td style="background:#ffffff;padding:0 40px 32px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#888780;margin-bottom:14px;">Process gaps flagged</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #E8E7E2;">
        <tr>
          <td width="50%" style="background:#0A3126;padding:10px 16px;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(247,247,245,0.6);">Today</td>
          <td width="50%" style="background:#0A3126;padding:10px 16px;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(247,247,245,0.6);">With Relay</td>
        </tr>
        ${rows}
      </table>
    </td>
  </tr>`
}

function buildHubSpotReport(answers, roi) {
  const painItems = answers.pain || []
  const painLines = painItems.map(p => PAIN_FLAGS[p]?.label).filter(Boolean).join(', ') || 'None reported'
  const role = answers.role === 'owner' ? 'Owner / Principal / Executive' : 'Asset Manager / Property Manager'

  return `Role: ${role}
Portfolio: ${answers.properties} properties
Hours per draw: ${answers.hours}
Monthly invoices: ${answers.invoices}
Process: ${answers.process}
Ownership: ${answers.dedicated}

Monthly draw labor: $${fmt(roi.monthlyLaborCost)} (${roi.monthlyHours} hrs)
Delayed funding exposure (21-day avg): $${fmt(roi.monthlyDelayExposure)}
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

  // HubSpot + EmailJS fire in parallel
  const [hsResult] = await Promise.allSettled([
    fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HS_PORTAL_ID}/${HS_FORM_GUID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: [
            { name: 'email',                 value: email },
            { name: 'jobtitle',              value: role },
            { name: 'portfolio_size',        value: answers.properties || '' },
            { name: 'roi_calculator_report', value: buildHubSpotReport(answers, roi) },
          ],
          context: { pageUri: 'https://relay-diagnostic-src.vercel.app', pageName: 'Relay ROI Calculator' },
        }),
      }
    ),
    fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EJS_SERVICE_ID,
        template_id: EJS_TEMPLATE_ID,
        user_id:     EJS_PUBLIC_KEY,
        template_params: {
          to_email:           email,
          role,
          properties:         answers.properties,
          hours_per_draw:     HOURS_LABELS[answers.hours] || answers.hours,
          monthly_labor_cost: `$${fmt(roi.monthlyLaborCost)}`,
          monthly_hours:      String(roi.monthlyHours),
          delay_exposure:     `$${fmt(roi.monthlyDelayExposure)}`,
          num_properties:     String(roi.numProperties),
          duplicate_exposure: `$${fmt(roi.duplicateExposure)}`,
          duplicate_count:    String(roi.duplicateCount),
          pain_section:       buildPainSection(answers.pain || []),
        },
      }),
    }),
  ])

  if (hsResult.status === 'rejected' || (hsResult.value && !hsResult.value.ok)) {
    console.error('HubSpot error:', hsResult.reason || await hsResult.value?.text())
    return res.status(500).json({ error: 'HubSpot submission failed' })
  }

  return res.status(200).json({ ok: true })
}
