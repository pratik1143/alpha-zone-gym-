import { Request, Response } from 'express';
import { db } from '../firebase';
import { triggerPaymentEmail } from '../services/automation.service';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const list = await db.getPayments();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      memberId, originalAmount, discountAmount, discount, taxAmount, gst, tax, otherCharges,
      netPayable, amount, paid, amountPaid, plan, method, memberName, memberPhone, date, notes, idempotencyKey
    } = req.body;

    const origAmt = Number(originalAmount !== undefined ? originalAmount : (amount || 0));
    const discAmt = Number(discountAmount !== undefined ? discountAmount : (discount || 0));
    const taxAmt = Number(taxAmount !== undefined ? taxAmount : (gst || tax || 0));
    const othAmt = Number(otherCharges || 0);

    const calculatedNet = Math.max(0, origAmt - discAmt + taxAmt + othAmt);
    const finalNet = Number(netPayable !== undefined ? netPayable : (calculatedNet > 0 ? calculatedNet : (amount || 0)));
    const finalPaid = Number(amountPaid !== undefined ? amountPaid : (paid !== undefined ? paid : finalNet));

    if (!finalPaid && !finalNet) {
      return res.status(400).json({ error: 'Payment amount is required' });
    }

    const members = await db.getMembers();
    const m = members.find(item => 
      item.id === memberId || 
      item.memberId === memberId || 
      (memberPhone && item.phone === memberPhone) ||
      (memberName && item.name?.toLowerCase().trim() === memberName.toLowerCase().trim())
    );

    const todayYMD = new Date().toISOString().split('T')[0];
    const invoice = await db.addPayment({
      memberId: m?.id || memberId || `m_${Date.now()}`,
      memberName: m?.name || memberName || 'Gym Member',
      memberPhone: m?.phone || memberPhone || '',
      originalAmount: origAmt,
      discountAmount: discAmt,
      discount: discAmt,
      taxAmount: taxAmt,
      otherCharges: othAmt,
      netPayable: finalNet,
      amount: finalNet,
      amountPaid: finalPaid,
      paid: finalPaid,
      outstandingAmount: Math.max(0, finalNet - finalPaid),
      pendingAmount: Math.max(0, finalNet - finalPaid),
      plan: plan || m?.plan || 'Monthly Standard',
      method: method || 'Cash',
      status: Math.max(0, finalNet - finalPaid) <= 0 ? 'paid' : (finalPaid > 0 ? 'partial' : 'pending'),
      date: date || todayYMD,
      idempotencyKey: idempotencyKey || `pay_${m?.id || memberId}_${plan}_${date || todayYMD}`,
      isRealTimeToday: true,
      notes: notes || 'Member Payment Invoice'
    });

    // Trigger Payment Invoice & Receipt Email
    triggerPaymentEmail(invoice).catch(err => console.error('[Automation] Payment email failed:', err));

    // Automatically extend membership expiry if member exists
    if (m) {
      let newExpiryString = '';
      if (req.body.newExpiryDate) {
        newExpiryString = req.body.newExpiryDate;
      } else {
        let daysToAdd = 30;
        if (plan === 'Quarterly' || plan === '3 Months') daysToAdd = 90;
        if (plan === 'Semi-Annual' || plan === '6 Months') daysToAdd = 180;
        if (plan === 'Annual Premium' || plan === 'Annual' || plan === '12 Months') daysToAdd = 365;

        const currentExpiry = m.expiryDate && new Date(m.expiryDate).getTime() > Date.now() 
          ? new Date(m.expiryDate) 
          : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        newExpiryString = newExpiry.toISOString().split('T')[0];
      }
      
      const newTotalPaid = (Number(m.totalPaid) || 0) + finalPaid;
      const totalBilled = Number(m.totalBilled) || finalNet;
      const newOutstanding = Math.max(0, totalBilled - newTotalPaid);
      const newPaymentStatus = newOutstanding <= 0 ? 'paid' : (newTotalPaid > 0 ? 'partial' : 'pending');

      const finalExpiryTime = new Date(newExpiryString).getTime();
      await db.updateMember(m.id, {
        expiryDate: newExpiryString,
        status: m.status === 'upcoming' ? 'upcoming' : (newExpiryString >= todayYMD ? 'active' : 'expired'),
        paymentStatus: newPaymentStatus,
        totalPaid: newTotalPaid,
        outstandingBalance: newOutstanding,
        daysLeft: Math.ceil((finalExpiryTime - Date.now()) / (1000 * 60 * 60 * 24))
      });
    }

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markPaymentPaid = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const members = await db.getMembers();
    const m = members.find(item => item.id === memberId);
    if (!m) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update member payment status
    await db.updateMember(memberId, { paymentStatus: 'paid' });

    // Find plan price
    const plansList = await db.getPlans();
    const matchedPlan = plansList.find(p => p.name?.toLowerCase() === (m.plan || '').toLowerCase());
    const amount = matchedPlan ? matchedPlan.price : 2500;

    // Generate Invoice
    const invoice = await db.addPayment({
      memberId: m.id,
      memberName: m.name,
      originalAmount: Number(amount),
      discountAmount: 0,
      netPayable: Number(amount),
      amount: Number(amount),
      amountPaid: Number(amount),
      paid: Number(amount),
      outstandingAmount: 0,
      plan: m.plan || 'Monthly',
      method: 'UPI',
      status: 'paid'
    });

    // Trigger Email
    triggerPaymentEmail(invoice).catch(err => console.error('[Automation] Payment email failed:', err));

    res.json({ message: 'Payment marked as paid and invoice sent', invoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cleanupDuplicateInvoicesController = async (req: Request, res: Response) => {
  try {
    const report = await db.cleanupDuplicateInvoices();
    res.json({ success: true, message: `Deduplicated ${report.length} duplicate invoice pairs.`, report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

