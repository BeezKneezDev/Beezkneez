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

    const { name, email, phone, service, address, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Name, email and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = `
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Beezkneez Website <invoices@beezkneez.nz>',
        to: 'byron@beezkneez.nz',
        subject: `New enquiry from ${name} — ${service || 'General'}`,
        html,
        reply_to: email,
      }),
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
