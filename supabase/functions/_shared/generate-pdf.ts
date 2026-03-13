import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

function shortAddress(addr: string | null | undefined): string {
  if (!addr) return ''
  const parts = addr
    .replace(/,?\s*(Australia|New Zealand)\s*$/i, '')
    .replace(/,?\s*\d{4,5}\s*$/, '')
    .replace(/,?\s*(Bay of Plenty|Waikato|Canterbury|Otago|Hawke's Bay|Manawat[uū\u016b][-–]Whanganui|Taranaki|Southland|Northland|Gisborne|Marlborough|Nelson|West Coast|Tasman)\s*/gi, '')
    .replace(/\s+Lakes?\s+District/gi, '')
    .replace(/\s+District/gi, '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  return `${parts[0]}, ${parts[1]} ${parts[parts.length - 1]}`
}

export async function generateInvoicePdf(invoice: any, customer: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const green = rgb(45 / 255, 90 / 255, 39 / 255) // #2d5a27
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.88, 0.88, 0.88)
  const red = rgb(229 / 255, 62 / 255, 62 / 255)
  const white = rgb(1, 1, 1)

  const margin = 50
  const tableRight = width - margin
  let y = height

  // Helper: collapse whitespace/newlines, then word-wrap to maxWidth
  function getLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const clean = text.replace(/\s+/g, ' ').trim()
    const words = clean.split(' ')
    const lines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  // --- Header bar ---
  const headerHeight = 70
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: green,
  })
  page.drawText('Beezkneez Lawns & Property Care', {
    x: margin,
    y: height - 44,
    size: 20,
    font: helveticaBold,
    color: white,
  })

  y = height - headerHeight - 36

  // --- Invoice title ---
  page.drawText(`Invoice ${invoice.invoice_number}`, {
    x: margin, y,
    size: 18,
    font: helveticaBold,
    color: green,
  })
  y -= 22

  // --- Date ---
  const invoiceDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  if (invoiceDate) {
    page.drawText(`Date: ${invoiceDate}`, {
      x: margin, y,
      size: 10,
      font: helvetica,
      color: gray,
    })
    y -= 30
  }

  // --- Bill To ---
  page.drawText('Bill To:', {
    x: margin, y,
    size: 10,
    font: helveticaBold,
    color: black,
  })
  y -= 16
  page.drawText(customer?.name || '—', {
    x: margin, y,
    size: 11,
    font: helvetica,
    color: black,
  })
  y -= 15
  if (customer?.address) {
    page.drawText(shortAddress(customer.address), {
      x: margin, y,
      size: 10,
      font: helvetica,
      color: gray,
    })
    y -= 30
  } else {
    y -= 15
  }

  // --- Parse line items ---
  let rawLineItems = invoice.line_items
  if (typeof rawLineItems === 'string') {
    try {
      rawLineItems = JSON.parse(rawLineItems)
    } catch {
      rawLineItems = null
    }
  }
  const lineItems =
    rawLineItems && Array.isArray(rawLineItems) && rawLineItems.length > 0
      ? rawLineItems
      : null

  const subtotal = Number(invoice.amount || 0)
  const discountPercent = Number(invoice.discount_percent || 0)
  const discountAmount = (subtotal * discountPercent) / 100
  const total = subtotal - discountAmount
  const hasDiscount = discountPercent > 0

  // --- Table header ---
  page.drawText('Description', {
    x: margin, y,
    size: 10,
    font: helveticaBold,
    color: black,
  })
  const amountHeader = 'Amount'
  const amountHeaderWidth = helveticaBold.widthOfTextAtSize(amountHeader, 10)
  page.drawText(amountHeader, {
    x: tableRight - amountHeaderWidth, y,
    size: 10,
    font: helveticaBold,
    color: black,
  })
  y -= 8
  page.drawLine({
    start: { x: margin, y },
    end: { x: tableRight, y },
    thickness: 1.5,
    color: lightGray,
  })
  y -= 16

  // --- Line items ---
  const descMaxWidth = tableRight - margin - 80
  const lineHeight = 14

  function drawDescriptionAndAmount(desc: string, amt: string) {
    const lines = getLines(desc, helvetica, 10, descMaxWidth)
    // Draw amount on the first line
    const amtWidth = helvetica.widthOfTextAtSize(amt, 10)
    page.drawText(amt, {
      x: tableRight - amtWidth, y,
      size: 10,
      font: helvetica,
      color: black,
    })
    // Draw each description line
    for (const line of lines) {
      page.drawText(line, {
        x: margin, y,
        size: 10,
        font: helvetica,
        color: black,
      })
      y -= lineHeight
    }
    page.drawLine({
      start: { x: margin, y },
      end: { x: tableRight, y },
      thickness: 0.5,
      color: rgb(0.94, 0.94, 0.94),
    })
    y -= 14
  }

  if (lineItems) {
    for (const item of lineItems) {
      drawDescriptionAndAmount(
        item.description || '—',
        `$${Number(item.amount || 0).toFixed(2)}`,
      )
    }
  } else {
    drawDescriptionAndAmount(
      invoice.description || '—',
      `$${subtotal.toFixed(2)}`,
    )
  }

  // --- Totals separator ---
  page.drawLine({
    start: { x: margin, y },
    end: { x: tableRight, y },
    thickness: 1.5,
    color: lightGray,
  })
  y -= 20

  // Fixed columns for totals: labels right-aligned to labelX, values right-aligned to tableRight
  const valueCol = tableRight
  const labelCol = tableRight - 100

  if (hasDiscount) {
    // Subtotal
    const subtotalValue = `$${subtotal.toFixed(2)}`
    const stLabel = 'Subtotal'
    page.drawText(stLabel, {
      x: labelCol - helveticaBold.widthOfTextAtSize(stLabel, 10), y,
      size: 10, font: helveticaBold, color: black,
    })
    page.drawText(subtotalValue, {
      x: valueCol - helveticaBold.widthOfTextAtSize(subtotalValue, 10), y,
      size: 10, font: helveticaBold, color: black,
    })
    y -= 18

    // Discount
    const discLabel = `Discount (${discountPercent}%)`
    const discValue = `-$${discountAmount.toFixed(2)}`
    page.drawText(discLabel, {
      x: labelCol - helveticaBold.widthOfTextAtSize(discLabel, 10), y,
      size: 10, font: helveticaBold, color: red,
    })
    page.drawText(discValue, {
      x: valueCol - helveticaBold.widthOfTextAtSize(discValue, 10), y,
      size: 10, font: helveticaBold, color: red,
    })
    y -= 20

    // Total
    const totalValue = `$${total.toFixed(2)}`
    const totLabel = 'Total'
    page.drawText(totLabel, {
      x: labelCol - helveticaBold.widthOfTextAtSize(totLabel, 13), y,
      size: 13, font: helveticaBold, color: black,
    })
    page.drawText(totalValue, {
      x: valueCol - helveticaBold.widthOfTextAtSize(totalValue, 13), y,
      size: 13, font: helveticaBold, color: black,
    })
    y -= 30
  } else {
    const totalValue = `$${subtotal.toFixed(2)}`
    const totLabel = 'Total'
    page.drawText(totLabel, {
      x: labelCol - helveticaBold.widthOfTextAtSize(totLabel, 13), y,
      size: 13, font: helveticaBold, color: black,
    })
    page.drawText(totalValue, {
      x: valueCol - helveticaBold.widthOfTextAtSize(totalValue, 13), y,
      size: 13, font: helveticaBold, color: black,
    })
    y -= 30
  }

  // --- Payment Details box ---
  const boxHeight = 110
  const boxTop = y
  page.drawRectangle({
    x: margin,
    y: boxTop - boxHeight,
    width: tableRight - margin,
    height: boxHeight,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: lightGray,
    borderWidth: 1,
  })

  let payY = boxTop - 16
  page.drawText('Payment Details', {
    x: margin + 12, y: payY,
    size: 11,
    font: helveticaBold,
    color: black,
  })
  payY -= 20
  page.drawText('Name: Beezkneez Lawns & Property Care', {
    x: margin + 12, y: payY,
    size: 10,
    font: helvetica,
    color: black,
  })
  payY -= 16
  page.drawText('Bank: Kiwibank', {
    x: margin + 12, y: payY,
    size: 10,
    font: helvetica,
    color: black,
  })
  payY -= 16
  page.drawText('Account: 38-9024-0138160-00', {
    x: margin + 12, y: payY,
    size: 10,
    font: helvetica,
    color: black,
  })
  payY -= 16
  page.drawText(`Reference: ${invoice.invoice_number}`, {
    x: margin + 12, y: payY,
    size: 10,
    font: helvetica,
    color: black,
  })

  y = boxTop - boxHeight - 20

  // --- Due date ---
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  if (dueDate) {
    page.drawText(`Due by: ${dueDate}`, {
      x: margin, y,
      size: 10,
      font: helveticaBold,
      color: black,
    })
    y -= 24
  }

  // --- Footer note ---
  page.drawText('Please use the invoice number as your payment reference.', {
    x: margin, y,
    size: 9,
    font: helvetica,
    color: gray,
  })
  y -= 30

  // --- Sign-off ---
  page.drawText('Cheers,', {
    x: margin, y,
    size: 10,
    font: helvetica,
    color: black,
  })
  y -= 16
  page.drawText('Byron', {
    x: margin, y,
    size: 10,
    font: helvetica,
    color: black,
  })

  return await pdfDoc.save()
}

export { encode as uint8ArrayToBase64 } from 'https://deno.land/std@0.177.0/encoding/base64.ts'
