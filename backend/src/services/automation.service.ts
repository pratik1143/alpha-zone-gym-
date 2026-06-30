import * as fs from 'fs';
import * as path from 'path';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { db, admin, isFirebaseInitialized } from '../firebase';

// Types
export interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  triggers?: {
    welcome: boolean;
    expiry7: boolean;
    expiry3: boolean;
    payment: boolean;
    expired: boolean;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

// Default Templates
const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to Alpha Zone Gym! 🎉',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #000; padding: 40px 32px; text-align: center; }
  .hero h1 { color: #d4ff00; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
  .hero p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0; }
  .body { padding: 32px; }
  .body h2 { font-size: 20px; font-weight: 800; color: #0f172a; }
  .body p { color: #64748b; font-size: 14px; line-height: 1.7; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .info-row:last-child { border: none; }
  .label { color: #94a3b8; font-weight: 600; }
  .value { color: #0f172a; font-weight: 700; }
  .btn { display: block; background: #000; color: #d4ff00; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>⚡ ALPHA ZONE</h1>
      <p>Beyond Strength. Beyond Limits.</p>
    </div>
    <div class="body">
      <h2>Welcome, {{memberName}}! 🎉</h2>
      <p>Your membership has been activated. Here are your details:</p>
      <div class="info-box">
        <div class="info-row"><span class="label">Plan</span><span class="value">{{plan}}</span></div>
        <div class="info-row"><span class="label">Start Date</span><span class="value">{{startDate}}</span></div>
        <div class="info-row"><span class="label">Expiry Date</span><span class="value">{{expiryDate}}</span></div>
        <div class="info-row"><span class="label">Branch</span><span class="value">{{branch}}</span></div>
      </div>
      <p>Head to the gym and scan your ID at the biometric gate to start your fitness journey.</p>
      <a class="btn" href="#">View My Membership Portal</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · +91 98765 43210</div>
  </div>
</body>
</html>`
  },
  expiry: {
    subject: 'Your Alpha Zone Membership Expires Soon ⚠️',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 32px; text-align: center; }
  .hero h1 { color: #fff; font-size: 24px; font-weight: 900; margin: 0; }
  .hero .badge { background: rgba(255,255,255,0.2); color: #fff; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 99px; display: inline-block; margin-top: 10px; }
  .body { padding: 32px; }
  .countdown { background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
  .countdown .days { font-size: 48px; font-weight: 900; color: #ef4444; }
  .countdown p { color: #64748b; font-size: 13px; margin: 4px 0 0; }
  .btn { display: block; background: #ef4444; color: #fff; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>Membership Expiring Soon!</h1>
      <div class="badge">Action Required</div>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-size:16px;font-weight:700">Hi {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Your <strong>{{plan}}</strong> membership is expiring soon. Renew now to keep your gym access uninterrupted.</p>
      <div class="countdown">
        <div class="days">{{daysLeft}}</div>
        <p>Days remaining · Expires on <strong>{{expiryDate}}</strong></p>
      </div>
      <a class="btn" href="#">Renew My Membership Now →</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab</div>
  </div>
</body>
</html>`
  },
  receipt: {
    subject: 'Payment Received — Invoice #{{invoice}} ✅',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #10b981; padding: 32px; text-align: center; }
  .hero h1 { color: #fff; font-size: 22px; font-weight: 900; margin: 0; }
  .hero p { color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0; }
  .body { padding: 32px; }
  .invoice-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  .invoice-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
  .invoice-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; }
  .total-row td { font-size: 16px; font-weight: 900; background: #f8fafc; border-radius: 8px; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>✅ Payment Received</h1>
      <p>Invoice #{{invoice}}</p>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-weight:700">Dear {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Thank you for your payment. Your membership is now active. Please find your detailed PDF invoice attached to this email.</p>
      <table class="invoice-table">
        <tr><th>Description</th><th>Amount</th></tr>
        <tr><td>{{plan}} Membership</td><td>₹{{amount}}</td></tr>
        <tr><td>GST (18%)</td><td>₹{{gst}}</td></tr>
        <tr class="total-row"><td><strong>Total Paid</strong></td><td><strong>₹{{total}}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:12px">Payment Method: {{method}} · Date: {{date}}</p>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · GSTIN: 27AAAAA0000A1Z5</div>
  </div>
</body>
</html>`
  },
  renewal: {
    subject: 'Renew Your Alpha Zone Membership & Keep Crushing It! 💪',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
  .hero { background: #000; padding: 40px 32px; text-align: center; }
  .hero h1 { color: #d4ff00; font-size: 26px; font-weight: 900; margin: 0; }
  .hero p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0; }
  .body { padding: 32px; }
  .plans { display: grid; gap: 12px; margin: 20px 0; }
  .plan-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
  .plan-card.highlight { border-color: #d4ff00; background: #fafff0; }
  .plan-name { font-weight: 800; color: #0f172a; font-size: 14px; }
  .plan-price { font-weight: 900; color: #0052FF; font-size: 16px; }
  .btn { display: block; background: #d4ff00; color: #000; text-decoration: none; text-align: center; padding: 16px 28px; border-radius: 12px; font-weight: 900; font-size: 14px; margin: 24px 0 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <div class="wrapper">
    <div class="hero">
      <h1>Keep the Momentum! 💪</h1>
      <p>Your membership expired. Come back stronger!</p>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-size:16px;font-weight:700">Hey {{memberName}},</p>
      <p style="color:#64748b;font-size:14px">Don't let your progress stop. Renew today and get back to crushing your goals.</p>
      <div class="plans">
        <div class="plan-card"><div class="plan-name">Monthly Access</div><div class="plan-price">₹2,500</div></div>
        <div class="plan-card highlight"><div class="plan-name">⭐ Quarterly Plan</div><div class="plan-price">₹6,500</div></div>
        <div class="plan-card"><div class="plan-name">Annual VIP Pass</div><div class="plan-price">₹18,000</div></div>
      </div>
      <a class="btn" href="#">Renew Now & Save →</a>
    </div>
    <div class="footer">Alpha Zone Gym · Mohali, Punjab · Unsubscribe</div>
  </div>
</body>
</html>`
  }
};

// Local storage for templates
let localTemplates: Record<string, EmailTemplate> = { ...DEFAULT_TEMPLATES };

export const getSavedTemplates = async (): Promise<Record<string, EmailTemplate>> => {
  const firestore = isFirebaseInitialized && admin ? admin.firestore() : null;
  if (firestore) {
    const doc = await firestore.collection('system_config').doc('templates').get();
    if (doc.exists) {
      return { ...DEFAULT_TEMPLATES, ...doc.data() };
    }
  }
  const templatesPath = './email_templates.json';
  if (fs.existsSync(templatesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      localTemplates = { ...DEFAULT_TEMPLATES, ...data };
      return localTemplates;
    } catch (e) {}
  }
  return DEFAULT_TEMPLATES;
};

export const saveTemplates = async (templatesData: any): Promise<any> => {
  const firestore = isFirebaseInitialized && admin ? admin.firestore() : null;
  if (firestore) {
    await firestore.collection('system_config').doc('templates').set(templatesData, { merge: true });
  }
  localTemplates = { ...localTemplates, ...templatesData };
  const templatesPath = './email_templates.json';
  try {
    fs.writeFileSync(templatesPath, JSON.stringify(templatesData, null, 2), 'utf8');
  } catch (e) {}
  return templatesData;
};

// Send SMTP Email helper
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<boolean> => {
  try {
    const smtpConfig = await db.getSmtpConfig();
    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
      console.warn('[Automation] SMTP is not configured. Skipping email to:', to);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port, 10) || 587,
      secure: smtpConfig.secure, // true for port 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to,
      subject,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Automation] Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Automation] Failed to send email:', error);
    return false;
  }
};

// Replace variables in templates
const parseTemplate = (html: string, variables: Record<string, string>): string => {
  let parsed = html;
  for (const [key, value] of Object.entries(variables)) {
    parsed = parsed.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return parsed;
};

export const generateInvoicePdf = async (payment: any, member: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Logo image or Title
    const logoPath = path.resolve(__dirname, '../../../frontend/public/gym_logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 40, { width: 110 });
      } catch (err) {
        // Fallback text if logo fails to render
        doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('ALPHA ZONE', 40, 40);
        doc.fillColor('#d4ff00').fontSize(10).text('GYM CENTER', 40, 68);
      }
    } else {
      doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('ALPHA ZONE', 40, 40);
      doc.fillColor('#d4ff00').fontSize(10).text('GYM CENTER', 40, 68);
    }

    // Invoice Info Panel (Right side)
    doc.roundedRect(360, 40, 195, 80, 8).fill('#f8fafc');
    doc.roundedRect(360, 40, 195, 80, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();
    
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('INVOICE', 375, 52);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#64748b').text('INVOICE NO:', 375, 75);
    doc.font('Helvetica').fillColor('#0f172a').text(payment.invoice || 'INV-00000', 450, 75, { align: 'right', width: 90 });
    
    doc.font('Helvetica-Bold').fillColor('#64748b').text('DATE:', 375, 90);
    doc.font('Helvetica').fillColor('#0f172a').text(payment.date || new Date().toISOString().split('T')[0], 450, 90, { align: 'right', width: 90 });
    
    doc.font('Helvetica-Bold').fillColor('#64748b').text('STATUS:', 375, 105);
    doc.font('Helvetica-Bold').fillColor('#10b981').text('PAID', 450, 105, { align: 'right', width: 90 });

    // Neon Accent Line (shifted down to y=155 to clear the logo)
    doc.strokeColor('#d4ff00').lineWidth(3).moveTo(40, 155).lineTo(555, 155).stroke();

    // Bill Details columns (structured side-by-side cards, shifted down to y=170)
    // Left: Billed To
    doc.roundedRect(40, 170, 245, 95, 8).fill('#f8fafc');
    doc.roundedRect(40, 170, 245, 95, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();
    doc.rect(40, 170, 4, 95).fill('#d4ff00');
    
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text('BILLED TO', 55, 180);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(member.name || payment.memberName || 'Athlete', 55, 195);
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
    doc.text(`Client ID: ${member.memberId || member.clientId || 'N/A'}`, 55, 212);
    doc.text(`Phone: +91 ${member.phone || 'N/A'}`, 55, 226);
    doc.text(`Email: ${member.email || 'N/A'}`, 55, 240);

    // Right: Billed By
    doc.roundedRect(310, 170, 245, 95, 8).fill('#f8fafc');
    doc.roundedRect(310, 170, 245, 95, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();
    doc.rect(310, 170, 4, 95).fill('#0f172a');
    
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text('BILLED BY', 325, 180);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Alpha Zone Gym & Fitness', 325, 195);
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
    doc.text('SCO 14-15, Phase 5, Sector 59', 325, 212);
    doc.text('Mohali, Punjab, India - 160059', 325, 226);
    doc.text('GSTIN: 27AAAAA0000A1Z5', 325, 240);

    // Items table header (shifted down to y=285)
    doc.roundedRect(40, 285, 515, 24, 6).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 55, 293);
    doc.text('VALIDITY PERIOD', 260, 293, { width: 140, align: 'center' });
    doc.text('AMOUNT (INR)', 450, 293, { width: 90, align: 'right' });

    // Table Item (shifted down to y=325)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(`${payment.plan || 'Monthly'} Gym Membership Access`, 55, 325);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Full access to cardio, strength area, CrossFit & biometric lockers.', 55, 340);
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(`${member.joinDate || 'N/A'} to ${member.expiryDate || 'N/A'}`, 260, 325, { width: 140, align: 'center' });
    
    const subtotal = payment.amount - (payment.gst || 0);
    doc.font('Helvetica-Bold').fontSize(10).text(`₹${subtotal.toLocaleString('en-IN')}`, 450, 325, { width: 90, align: 'right' });

    // Table separator
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 365).lineTo(555, 365).stroke();

    // Summary calculations block (Right bottom side, shifted down to y=380)
    doc.roundedRect(310, 380, 245, 115, 8).fill('#f8fafc');
    doc.roundedRect(310, 380, 245, 115, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();
    
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Subtotal:', 325, 392, { width: 100, align: 'left' });
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${subtotal.toLocaleString('en-IN')}`, 440, 392, { width: 100, align: 'right' });

    const cgst = Math.floor((payment.gst || 0) / 2);
    const sgst = Math.floor((payment.gst || 0) / 2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('CGST (9%):', 325, 408, { width: 100, align: 'left' });
    doc.fillColor('#0f172a').font('Helvetica').text(`₹${cgst.toLocaleString('en-IN')}`, 440, 408, { width: 100, align: 'right' });

    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('SGST (9%):', 325, 424, { width: 100, align: 'left' });
    doc.fillColor('#0f172a').font('Helvetica').text(`₹${sgst.toLocaleString('en-IN')}`, 440, 424, { width: 100, align: 'right' });

    // Thin separator inside summary card
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(325, 442).lineTo(540, 442).stroke();

    // Total box
    doc.roundedRect(320, 452, 225, 30, 4).fill('#0f172a');
    doc.fillColor('#d4ff00').fontSize(10).font('Helvetica-Bold').text('Total Paid (Incl. GST):', 330, 461);
    doc.fontSize(11).text(`₹${payment.amount.toLocaleString('en-IN')}`, 430, 461, { width: 105, align: 'right' });

    // PAID digital stamp (tilted -10 deg on left side, shifted down to y=410)
    doc.save();
    doc.translate(85, 410);
    doc.rotate(-10);
    
    // Stamp double border
    doc.roundedRect(0, 0, 110, 42, 6).lineWidth(2).strokeColor('#10b981').stroke();
    doc.roundedRect(3, 3, 104, 36, 4).lineWidth(1).strokeColor('#10b981').stroke();
    
    // Stamp text
    doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(14).text('PAID', 0, 14, { width: 110, align: 'center' });
    doc.restore();

    // Terms & Conditions block (shifted down to y=515)
    doc.roundedRect(40, 515, 515, 80, 8).fill('#f8fafc');
    doc.roundedRect(40, 515, 515, 80, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();
    
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('TERMS & CONDITIONS', 55, 527);
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica');
    doc.text('1. Membership fees are strictly non-refundable and non-transferable.', 55, 542);
    doc.text('2. Biometric registration is mandatory for facility entry at the access control gates.', 55, 554);
    doc.text('3. Members must strictly follow gym rules, protocols, and safety measures at all times.', 55, 566);
    doc.text('4. Loss or damage to gym property due to negligence will be charged to the member.', 55, 578);

    // Neon Accent Line above footer
    doc.strokeColor('#d4ff00').lineWidth(2).moveTo(40, 735).lineTo(555, 735).stroke();

    // Decorative bottom block
    doc.roundedRect(40, 745, 515, 35, 6).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('ALPHA ZONE OS', 55, 758);
    doc.fillColor('#d4ff00').fontSize(8.5).font('Helvetica-Bold').text('GET ACTIVE. GET STRONGER.', 350, 758, { align: 'right', width: 190 });

    doc.end();
  });
};
export const triggerWelcomeEmail = async (member: any) => {
  try {
    const config = await db.getSmtpConfig();
    if (!config || !config.triggers || !config.triggers.welcome) return;

    const templates = await getSavedTemplates();
    const welcomeTemplate = templates.welcome;
    if (!welcomeTemplate) return;

    const parsedHtml = parseTemplate(welcomeTemplate.html, {
      memberName: member.name,
      plan: member.plan || 'Monthly Access',
      startDate: member.joinDate || new Date().toISOString().split('T')[0],
      expiryDate: member.expiryDate || 'N/A',
      branch: member.branch || 'Mohali, Punjab'
    });

    await sendEmail(member.email, welcomeTemplate.subject, parsedHtml);
  } catch (error) {
    console.error('[Automation] Welcome Email failed:', error);
  }
};

export const triggerPaymentEmail = async (payment: any) => {
  try {
    const config = await db.getSmtpConfig();
    if (!config || !config.triggers || !config.triggers.payment) return;

    const templates = await getSavedTemplates();
    const receiptTemplate = templates.receipt;
    if (!receiptTemplate) return;

    const members = await db.getMembers();
    const member = members.find(m => m.id === payment.memberId || m.name === payment.memberName);
    if (!member || !member.email) {
      console.warn('[Automation] Member email not found for payment, skipping email receipt.');
      return;
    }

    const subtotal = payment.amount - (payment.gst || 0);
    const parsedHtml = parseTemplate(receiptTemplate.html, {
      memberName: member.name,
      invoice: payment.invoice || 'INV-00000',
      plan: payment.plan || member.plan || 'Monthly Access',
      amount: subtotal.toString(),
      gst: (payment.gst || 0).toString(),
      total: payment.amount.toString(),
      method: payment.method || 'UPI',
      date: payment.date || new Date().toISOString().split('T')[0]
    });

    // Generate PDF Attachments
    const pdfBuffer = await generateInvoicePdf(payment, member);
    const pdfFilename = `Invoice_${payment.invoice || 'INV-00000'}.pdf`;

    await sendEmail(member.email, receiptTemplate.subject.replace('{{invoice}}', payment.invoice || 'INV-00000'), parsedHtml, [
      { filename: pdfFilename, content: pdfBuffer }
    ]);
  } catch (error) {
    console.error('[Automation] Payment Email failed:', error);
  }
};

// Scheduler Automation checks (runs daily)
export const runDailyAutomationChecks = async () => {
  try {
    console.log('[Automation Scheduler] Running daily checks...');
    const config = await db.getSmtpConfig();
    if (!config || !config.triggers) return;

    const templates = await getSavedTemplates();
    const members = await db.getMembers();
    const todayStr = new Date().toISOString().split('T')[0];

    for (const member of members) {
      if (!member.email || !member.expiryDate) continue;

      const expiryTime = new Date(member.expiryDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.ceil((expiryTime - todayTime) / (1000 * 60 * 60 * 24));

      // 1. Membership Expiring in 7 days
      if (diffDays === 7 && config.triggers.expiry7 && templates.expiry) {
        const parsedHtml = parseTemplate(templates.expiry.html, {
          memberName: member.name,
          plan: member.plan || 'Monthly Access',
          daysLeft: '7',
          expiryDate: member.expiryDate
        });
        await sendEmail(member.email, templates.expiry.subject, parsedHtml);
      }

      // 2. Membership Expiring in 3 days
      if (diffDays === 3 && config.triggers.expiry3 && templates.expiry) {
        const parsedHtml = parseTemplate(templates.expiry.html, {
          memberName: member.name,
          plan: member.plan || 'Monthly Access',
          daysLeft: '3',
          expiryDate: member.expiryDate
        });
        await sendEmail(member.email, templates.expiry.subject, parsedHtml);
      }

      // 3. Membership Expired today (diffDays === 0 or -1 depending on date logic)
      if (diffDays === 0 && config.triggers.expired && templates.renewal) {
        const parsedHtml = parseTemplate(templates.renewal.html, {
          memberName: member.name,
          plan: member.plan || 'Monthly Access',
        });
        await sendEmail(member.email, templates.renewal.subject, parsedHtml);
      }
    }
  } catch (error) {
    console.error('[Automation Scheduler] Daily checks failed:', error);
  }
};
