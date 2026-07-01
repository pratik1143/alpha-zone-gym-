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
    const { memberId, amount, plan, method } = req.body;
    if (!memberId || !amount) {
      return res.status(400).json({ error: 'memberId and amount are required' });
    }

    const members = await db.getMembers();
    const m = members.find(item => item.id === memberId);
    if (!m) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const invoice = await db.addPayment({
      memberId: m.id,
      memberName: m.name,
      amount: Number(amount),
      plan: plan || m.plan,
      method: method || 'UPI',
      status: 'paid'
    });

    // Trigger Payment Invoice & Receipt Email
    triggerPaymentEmail(invoice).catch(err => console.error('[Automation] Payment email failed:', err));

    // Automatically extend membership expiry if payment was successful
    let newExpiryString = '';
    if (req.body.newExpiryDate) {
      newExpiryString = req.body.newExpiryDate;
    } else {
      let daysToAdd = 30;
      if (plan === 'Quarterly') daysToAdd = 90;
      if (plan === 'Semi-Annual') daysToAdd = 180;
      if (plan === 'Annual Premium' || plan === 'Annual') daysToAdd = 365;

      const currentExpiry = new Date(m.expiryDate).getTime() > Date.now() ? new Date(m.expiryDate) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      newExpiryString = newExpiry.toISOString().split('T')[0];
    }
    
    const finalExpiryTime = new Date(newExpiryString).getTime();
    await db.updateMember(m.id, {
      expiryDate: newExpiryString,
      status: 'active',
      daysLeft: Math.ceil((finalExpiryTime - Date.now()) / (1000 * 60 * 60 * 24))
    });

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
      amount: Number(amount),
      plan: m.plan || 'Monthly',
      method: 'UPI', // Default method for fast checkout
      status: 'paid'
    });

    // Trigger Email
    triggerPaymentEmail(invoice).catch(err => console.error('[Automation] Payment email failed:', err));

    res.json({ message: 'Payment marked as paid and invoice sent', invoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

