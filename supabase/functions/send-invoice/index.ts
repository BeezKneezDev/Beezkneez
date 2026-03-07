import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

    const { invoice, customer } = await req.json()

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    const invoiceDate = invoice.created_at
      ? new Date(invoice.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    const subtotal = Number(invoice.amount || 0)
    const discountPercent = Number(invoice.discount_percent || 0)
    const discountAmount = subtotal * discountPercent / 100
    const total = subtotal - discountAmount
    const hasDiscount = discountPercent > 0
    let rawLineItems = invoice.line_items
    if (typeof rawLineItems === 'string') {
      try { rawLineItems = JSON.parse(rawLineItems) } catch { rawLineItems = null }
    }
    const lineItems = rawLineItems && Array.isArray(rawLineItems) && rawLineItems.length > 0
      ? rawLineItems
      : null

    let tableHtml
    if (lineItems) {
      tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 2px solid #e0e0e0; font-weight: 600;">Description</td>
            <td style="padding: 8px 0; border-bottom: 2px solid #e0e0e0; text-align: right; font-weight: 600;">Amount</td>
          </tr>
          ${lineItems.map((item: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${item.description || '—'}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">$${Number(item.amount || 0).toFixed(2)}</td>
          </tr>`).join('')}
          ${hasDiscount ? `
          <tr>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; font-weight: 600;">Subtotal</td>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; text-align: right; font-weight: 600;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #e53e3e;">Discount (${discountPercent}%)</td>
            <td style="padding: 8px 0; text-align: right; color: #e53e3e; font-weight: 600;">-$${discountAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Total</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 1.2rem;">$${total.toFixed(2)}</td>
          </tr>` : `
          <tr>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; font-weight: 700;">Total</td>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; text-align: right; font-weight: 700; font-size: 1.2rem;">$${subtotal.toFixed(2)}</td>
          </tr>`}
        </table>`
    } else {
      tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 2px solid #e0e0e0; font-weight: 600;">Description</td>
            <td style="padding: 8px 0; border-bottom: 2px solid #e0e0e0; text-align: right; font-weight: 600;">Amount</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${invoice.description || '—'}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">$${subtotal.toFixed(2)}</td>
          </tr>
          ${hasDiscount ? `
          <tr>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; font-weight: 600;">Subtotal</td>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; text-align: right; font-weight: 600;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #e53e3e;">Discount (${discountPercent}%)</td>
            <td style="padding: 8px 0; text-align: right; color: #e53e3e; font-weight: 600;">-$${discountAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Total</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 1.2rem;">$${total.toFixed(2)}</td>
          </tr>` : `
          <tr>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; font-weight: 700;">Total</td>
            <td style="padding: 8px 0; border-top: 2px solid #e0e0e0; text-align: right; font-weight: 700; font-size: 1.2rem;">$${subtotal.toFixed(2)}</td>
          </tr>`}
        </table>`
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #2d5a27; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Beezkneez Lawns &amp; Property Care</h1>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="margin-top: 0; color: #2d5a27;">Invoice ${invoice.invoice_number}</h2>
          ${invoiceDate ? `<p style="margin: 4px 0; color: #888; font-size: 0.9rem;">Date: ${invoiceDate}</p>` : ''}

          <p>Hi ${customer?.name || 'there'},</p>
          <p>Please find your invoice details below.</p>

          ${customer?.address ? `<p style="margin: 4px 0; color: #555;"><strong>Property:</strong> ${customer.address}</p>` : ''}

          ${tableHtml}

          <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 0.95rem;">Payment Details</h3>
            <p style="margin: 4px 0;"><strong>Name:</strong> Beezkneez Lawns &amp; Property Care</p>
            <p style="margin: 4px 0;"><strong>Bank:</strong> Kiwibank</p>
            <p style="margin: 4px 0;"><strong>Account:</strong> 38-9024-0138160-00</p>
            <p style="margin: 4px 0;"><strong>Reference:</strong> ${invoice.invoice_number}</p>
          </div>

          <p style="color: #888; font-size: 0.85rem;">Please use the invoice number as your payment reference.${dueDate ? `<br/>Payment due by <strong style="color: #333;">${dueDate}</strong>.` : ''}</p>
          <p style="margin-top: 24px;">Cheers,<br/>Byron<br/>Beezkneez Lawns &amp; Property Care</p>
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
        to: 'byron@beezkneez.nz',
        subject: `Invoice ${invoice.invoice_number} — Beezkneez Lawns & Property Care`,
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
