const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN

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
  one: 'Single point of failure: if that person is out, your draws stop. Relay distributes the process to the platform.',
  shared: 'Shared ownership without a system of record means things fall through. Relay is the single source of truth.',
  adhoc: 'Ad hoc process: whoever runs the draw this cycle may not know what the last person did. Relay fixes that.',
  me: "Owner-dependent: your time is too valuable for draw assembly. Relay handles the build — you review and approve.",
}

function fmt(n) {
  return n.toLocaleString('en-US')
}

function buildReportText(answers, roi) {
  const painItems = answers.pain || []
  const painLines = painItems.map(p => `- ${PAIN_LABELS[p]}`).join('\n') || '- None reported'
  const resourceRisk = DEDICATED_FLAGS[answers.dedicated] || ''
  const role = answers.role === 'owner' ? 'Owner / Principal / Executive' : 'Asset Manager / Property Manager'

  return `RELAY DRAW READINESS REPORT
Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

ROLE: ${role}
PORTFOLIO: ${answers.properties} properties
HOURS PER DRAW: ${answers.hours}
MONTHLY INVOICES: ${answers.invoices}

--- ESTIMATED MONTHLY EXPOSURE ---
Draw Labor Cost:        $${fmt(roi.monthlyLaborCost)} (${roi.monthlyHours} hrs × $50/hr)
Delayed Funding Cost:   $${fmt(roi.monthlyDelayExposure)} (5-day avg, ${roi.numProperties} properties)
Duplicate Invoice Risk: $${fmt(roi.duplicateExposure)} (~${roi.duplicateCount} duplicates/mo at $5K avg)

--- PROCESS GAPS FLAGGED ---
${painLines}

--- RESOURCE RISK ---
${resourceRisk || 'N/A'}

---
Estimates based on industry averages: $50/hr blended AM cost, 5-day draw delay on a $5M loan at 7% annual interest, 1.5% duplicate invoice rate, $5,000 avg invoice value.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { answers, email, roi } = req.body

  if (!email || !answers || !roi) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!HUBSPOT_TOKEN) {
    return res.status(500).json({ error: 'HubSpot token not configured' })
  }

  const reportText = buildReportText(answers, roi)
  const role = answers.role === 'owner' ? 'Owner / Principal / Executive' : 'Asset Manager / Property Manager'
  const painLabels = (answers.pain || []).map(p => PAIN_LABELS[p]).filter(Boolean).join('; ')

  const properties = {
    email,
    jobtitle: role,
    portfolio_size: answers.properties || '',
    roi_calculator_report: reportText,
    hs_lead_status: 'NEW',
    lifecyclestage: 'lead',
  }

  // Assign to Ryan Beaupre if owner ID is configured
  const RYAN_OWNER_ID = process.env.HUBSPOT_OWNER_ID
  if (RYAN_OWNER_ID) {
    properties.hubspot_owner_id = RYAN_OWNER_ID
  }

  try {
    // Search for existing contact first
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        limit: 1,
      }),
    })

    const searchData = await searchRes.json()
    const existingId = searchData.results?.[0]?.id

    let contactRes
    if (existingId) {
      // Update existing contact
      contactRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      })
    } else {
      // Create new contact
      contactRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      })
    }

    if (!contactRes.ok) {
      const err = await contactRes.json()
      console.error('HubSpot error:', err)
      return res.status(500).json({ error: 'Failed to save to HubSpot' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Submit error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
