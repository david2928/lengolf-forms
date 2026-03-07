import nodemailer from 'nodemailer'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'mail.len.golf',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'cs94.hostneverdie.com',
  },
})

export interface CourseRentalEmailConfirmation {
  customerName: string
  email: string
  rentalCode: string
  clubSetName: string
  clubSetTier: string
  clubSetGender: string
  startDate: string
  endDate: string
  durationDays: number
  deliveryRequested: boolean
  deliveryAddress?: string
  deliveryTime?: string
  addOns: { label: string; price: number }[]
  rentalPrice: number
  deliveryFee: number
  totalPrice: number
  notes?: string
}

export async function sendCourseRentalConfirmationEmail(booking: CourseRentalEmailConfirmation): Promise<boolean> {
  const emailSubject = `LENGOLF Course Rental Confirmation - ${booking.rentalCode}`

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  const dateDisplay = booking.durationDays > 1
    ? `${formatDate(booking.startDate)} &rarr; ${formatDate(booking.endDate)} (${booking.durationDays} days)`
    : formatDate(booking.startDate)

  const safeName = escapeHtml(booking.customerName)
  const safeAddress = booking.deliveryAddress ? escapeHtml(booking.deliveryAddress) : ''
  const safeNotes = booking.notes ? escapeHtml(booking.notes) : ''
  const safeClubSetName = escapeHtml(booking.clubSetName)
  const safeRentalCode = escapeHtml(booking.rentalCode)
  const safeDeliveryTime = booking.deliveryTime ? escapeHtml(booking.deliveryTime) : ''

  const addOnsHtml = booking.addOns.length > 0
    ? booking.addOns.map(a => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; color: #555;">${escapeHtml(a.label)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${a.price.toLocaleString()}</td>
      </tr>
    `).join('')
    : ''

  const emailContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://booking.len.golf/images/logo_v1.png" alt="LENGOLF Logo" style="max-width: 200px;">
        </div>

        <h2 style="color: #1a3308; text-align: center; margin-bottom: 20px;">Course Rental Reservation Confirmed!</h2>

        <p style="font-size: 16px; line-height: 1.5; color: #1a3308; margin-bottom: 5px;">
            Dear <strong>${safeName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Thank you for your golf club rental reservation. Here are your details:
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 5px;">Your Rental Code</p>
            <p style="font-size: 24px; font-weight: bold; color: #15803d; margin: 0; letter-spacing: 2px; font-family: monospace;">${safeRentalCode}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 15px;">
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Club Set</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <strong>${safeClubSetName}</strong>
                    <br><span style="font-size: 13px; color: #666;">${booking.clubSetTier === 'premium-plus' ? 'Premium+' : 'Premium'} &middot; ${booking.clubSetGender === 'mens' ? "Men's" : "Women's"}</span>
                </td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Rental Period</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dateDisplay}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">${booking.deliveryRequested ? 'Delivery' : 'Pickup'}</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    ${booking.deliveryRequested
                      ? `Delivery & Return<br><span style="font-size: 13px; color: #666;">${safeAddress}</span>`
                      : 'Pickup at LENGOLF<br><span style="font-size: 13px; color: #666;">Mercury Ville @ BTS Chidlom, Floor 4</span>'
                    }
                    ${safeDeliveryTime ? `<br><span style="font-size: 13px; color: #666;">Preferred time: ${safeDeliveryTime}</span>` : ''}
                </td>
            </tr>
            ${safeNotes ? `
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Notes</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; white-space: pre-wrap;">${safeNotes}</td>
            </tr>
            ` : ''}
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 15px;">
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; color: #555;">Club Rental (${booking.durationDays}d)</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${booking.rentalPrice.toLocaleString()}</td>
            </tr>
            ${booking.deliveryRequested ? `
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; color: #555;">Delivery & Return</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${booking.deliveryFee.toLocaleString()}</td>
            </tr>
            ` : ''}
            ${addOnsHtml}
            <tr style="font-weight: bold; font-size: 16px;">
                <td style="padding: 12px 10px; border-top: 2px solid #15803d; color: #15803d;">Total</td>
                <td style="padding: 12px 10px; border-top: 2px solid #15803d; text-align: right; color: #15803d;">${booking.totalPrice.toLocaleString()}</td>
            </tr>
        </table>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="font-weight: bold; color: #1e40af; margin: 0 0 5px;">What happens next?</p>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">Our team will contact you within 2 hours via phone or LINE to confirm availability and arrange payment. No payment is required now.</p>
        </div>

        <div style="font-size: 14px; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 5px 0; text-align: center;">
                <strong>Phone Number:</strong> <a href="tel:+66966682335" style="color: #8dc743; text-decoration: none;">+66 96 668 2335</a>
            </p>
            <p style="margin: 5px 0; text-align: center;">
                <strong>LINE:</strong> <a href="https://lin.ee/UwwOr84" style="color: #8dc743; text-decoration: none;">@lengolf</a>
            </p>
            <p style="margin: 5px 0; text-align: center;">
                <strong>Address:</strong> 4th Floor, Mercury Ville at BTS Chidlom
            </p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="https://len.golf" style="text-decoration: none; color: white; background-color: #1a3308; padding: 8px 15px; border-radius: 5px; font-size: 14px;">
                    Visit Our Website
                </a>
            </div>
            <p style="font-size: 12px; margin-top: 15px; color: #777; text-align: center;">
                &copy; ${new Date().getFullYear()} LENGOLF. All rights reserved.
            </p>
        </div>
    </div>
  `.trim()

  const mailOptions = {
    from: 'LENGOLF <notification@len.golf>',
    to: booking.email,
    subject: emailSubject,
    html: emailContent,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('[EmailService] Course rental confirmation sent to:', booking.email)
    return true
  } catch (error) {
    console.error('[EmailService] Failed to send course rental confirmation:', error)
    return false
  }
}
