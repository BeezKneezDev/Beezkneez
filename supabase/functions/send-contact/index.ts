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

    const body = await req.json()
    const { name, email, phone, service, address, message, preferredContact,
            frequency, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body

    const isAdsLead = source === 'google-ads'

    // Landing page leads require name + phone; regular form requires name + email + message
    if (!name || (!isAdsLead && (!email || !message))) {
      return new Response(JSON.stringify({ error: 'Required fields missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let html
    let subject

    if (isAdsLead) {
      // Google Ads landing page lead
      subject = `📱 Google Ads Lead — ${name}`
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: #e65100; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">📱 Google Ads Lead</h1>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; width: 100px; color: #555;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Phone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;"><a href="tel:${phone}" style="color: #2d5a27; font-weight: 600;">${phone}</a></td>
              </tr>
              ${address ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Address</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">${address}</td>
              </tr>` : ''}
              ${frequency ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Frequency</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;"><strong>${frequency}</strong></td>
              </tr>` : ''}
            </table>
            ${message ? `
            <div style="margin-top: 20px; padding: 16px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 8px; font-size: 0.9rem; color: #555;">Message</h3>
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>` : ''}
            ${(utm_source || utm_campaign || utm_term) ? `
            <div style="margin-top: 20px; padding: 16px; background: #fff3e0; border-radius: 6px; border: 1px solid #ffe0b2;">
              <h3 style="margin: 0 0 8px; font-size: 0.9rem; color: #e65100;">Ad Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #555;">
                ${utm_campaign ? `<tr><td style="padding: 4px 0; font-weight: 600;">Campaign</td><td style="padding: 4px 0;">${utm_campaign}</td></tr>` : ''}
                ${utm_term ? `<tr><td style="padding: 4px 0; font-weight: 600;">Keyword</td><td style="padding: 4px 0;">${utm_term}</td></tr>` : ''}
                ${utm_source ? `<tr><td style="padding: 4px 0; font-weight: 600;">Source</td><td style="padding: 4px 0;">${utm_source}${utm_medium ? ' / ' + utm_medium : ''}</td></tr>` : ''}
                ${utm_content ? `<tr><td style="padding: 4px 0; font-weight: 600;">Ad Content</td><td style="padding: 4px 0;">${utm_content}</td></tr>` : ''}
              </table>
            </div>` : ''}
          </div>
        </div>
      `
    } else {
      // Regular website enquiry (existing format)
      subject = `New enquiry from ${name} — ${service || 'General'}`
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: #2d5a27; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">New Enquiry from beezkneez.nz</h1>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; width: 100px; color: #555;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${email}" style="color: #2d5a27;">${email}</a></td>
              </tr>
              ${phone ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Phone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;"><a href="tel:${phone}" style="color: #2d5a27;">${phone}</a></td>
              </tr>` : ''}
              ${service ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Service</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">${service}</td>
              </tr>` : ''}
              ${address ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">Address</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">${address}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top: 20px; padding: 16px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 8px; font-size: 0.9rem; color: #555;">Message</h3>
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
          </div>
        </div>
      `
    }

    const emailPayload = {
      from: 'Beezkneez Website <invoices@beezkneez.nz>',
      to: 'byron@beezkneez.nz',
      subject,
      html,
    }

    // Set reply-to for regular enquiries
    if (email) {
      emailPayload.reply_to = email
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    const result = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
