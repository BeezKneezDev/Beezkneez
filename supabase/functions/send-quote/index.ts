import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

    const EMAIL_OVERRIDE = Deno.env.get('EMAIL_OVERRIDE')

    const { to, subject, body, line_items } = await req.json()

    const recipientEmail = EMAIL_OVERRIDE || to
    if (!recipientEmail) throw new Error('No recipient email')

    const bodyHtml = body.replace(/\n/g, '<br>')

    let lineItemsHtml = ''
    if (line_items && line_items.length > 0) {
      const total = line_items.reduce((sum: number, li: { amount: number }) => sum + Number(li.amount || 0), 0)
      const rows = line_items.map((li: { description: string; amount: number }) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">${li.description || ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${Number(li.amount || 0).toFixed(2)}</td>
        </tr>`
      ).join('')

      lineItemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0 8px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #2d5a27; font-weight: 600; color: #333;">Description</th>
              <th style="text-align: right; padding: 8px 12px; border-bottom: 2px solid #2d5a27; font-weight: 600; color: #333;">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align: right; font-weight: 700; font-size: 1.05rem; padding: 4px 12px;">Total: $${total.toFixed(2)}</div>
      `
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto 40px; color: #333;">
        <div style="background: #2d5a27; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Beezkneez Lawns &amp; Property Care</h1>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          ${bodyHtml}
          ${lineItemsHtml}
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Beezkneez Lawns & Property Care <invoices@beezkneez.nz>',
        to: recipientEmail,
        subject,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
