import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const today = new Date().toISOString().split('T')[0]

    // Find sent invoices that are past due
    const { data: overdueInvoices, error } = await supabase
      .from('invoices')
      .select('*, customers(name, email)')
      .eq('status', 'sent')
      .lt('due_date', today)
      .is('paid_at', null)

    if (error) throw new Error(`Query failed: ${error.message}`)

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue invoices found' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update status to overdue
    const ids = overdueInvoices.map(inv => inv.id)
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .in('id', ids)

    if (updateError) throw new Error(`Update failed: ${updateError.message}`)

    // Build summary email
    const rows = overdueInvoices.map(inv => {
      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.floor((new Date(today).getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const subtotal = Number(inv.amount || 0)
      const discount = Number(inv.discount_percent || 0)
      const total = subtotal * (1 - discount / 100)
      const customerName = inv.customers?.name || 'Unknown'

      return `
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${inv.invoice_number}</td>
          <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${customerName}</td>
          <td style="padding: 10px 12px; border: 1px solid #e0e0e0; text-align: right;">$${total.toFixed(2)}</td>
          <td style="padding: 10px 12px; border: 1px solid #e0e0e0; text-align: center;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</td>
        </tr>`
    }).join('')

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #2d5a27; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Beezkneez Lawns &amp; Property Care</h1>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="margin-top: 0; color: #e53e3e;">Overdue Invoices</h2>
          <p>The following ${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? 's are' : ' is'} overdue:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #2d5a27;">
              <th style="padding: 10px 12px; border: 1px solid #e0e0e0; color: #fff; text-align: left;">Invoice</th>
              <th style="padding: 10px 12px; border: 1px solid #e0e0e0; color: #fff; text-align: left;">Customer</th>
              <th style="padding: 10px 12px; border: 1px solid #e0e0e0; color: #fff; text-align: right;">Amount</th>
              <th style="padding: 10px 12px; border: 1px solid #e0e0e0; color: #fff; text-align: center;">Overdue</th>
            </tr>
            ${rows}
          </table>

          <p style="color: #888; font-size: 0.85rem;">These invoices have been automatically marked as overdue.</p>
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
        subject: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length !== 1 ? 's' : ''} — Beezkneez`,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      updated: ids.length,
      emailId: result.id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
