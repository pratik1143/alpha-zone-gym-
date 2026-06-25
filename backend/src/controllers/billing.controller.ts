import { Request, Response } from 'express';
import { db } from '../firebase';

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

    // Automatically extend membership expiry if payment was successful
    let daysToAdd = 30;
    if (plan === 'Quarterly') daysToAdd = 90;
    if (plan === 'Semi-Annual') daysToAdd = 180;
    if (plan === 'Annual Premium' || plan === 'Annual') daysToAdd = 365;

    const currentExpiry = new Date(m.expiryDate).getTime() > Date.now() ? new Date(m.expiryDate) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    await db.updateMember(m.id, {
      expiryDate: newExpiry.toISOString().split('T')[0],
      status: 'active',
      daysLeft: Math.ceil((newExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
