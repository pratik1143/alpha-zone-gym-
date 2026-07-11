import { db } from '@/lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';

export const paymentEngine = {
  calculateOutstandingAmount: (invoiceAmount: number, paidAmount: number): number => {
    const outstanding = (invoiceAmount || 0) - (paidAmount || 0);
    return Math.max(0, outstanding); // Prevent negative outstanding
  },

  calculatePaymentStatus: (invoiceAmount: number, paidAmount: number): 'PAID' | 'PARTIAL' | 'PENDING' => {
    const outstanding = paymentEngine.calculateOutstandingAmount(invoiceAmount, paidAmount);
    if (paidAmount === 0 && invoiceAmount > 0) return 'PENDING';
    if (outstanding <= 0) return 'PAID';
    return 'PARTIAL';
  },

  selfHealPaymentData: async (invoice: any) => {
    if (!invoice || !invoice.id) return invoice;

    const invoiceTotal = Number(invoice.amount || 0) + Number(invoice.gst || 0);
    const paidTotal = Number(invoice.paid || 0);
    
    const computedOutstanding = paymentEngine.calculateOutstandingAmount(invoiceTotal, paidTotal);
    const computedStatus = paymentEngine.calculatePaymentStatus(invoiceTotal, paidTotal);
    
    let needsUpdate = false;
    const updates: any = {};

    if (invoice.pendingAmount !== computedOutstanding) {
      updates.pendingAmount = computedOutstanding;
      needsUpdate = true;
    }

    // Match uppercase for our strict enum vs lowercase stored format if needed
    const normalizedStoredStatus = (invoice.status || '').toUpperCase();
    if (normalizedStoredStatus !== computedStatus) {
      updates.status = computedStatus.toLowerCase(); // keep lowercase for DB consistency if desired, or uppercase. Let's use lowercase to match 'paid', 'pending' in previous code
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await updateDoc(doc(db, 'invoices', invoice.id), updates);
        console.log(`[Self-Heal] Repaired payment data for invoice ${invoice.id}`);
        return { ...invoice, ...updates };
      } catch (e) {
        console.error('[Self-Heal] Failed', e);
      }
    }
    
    return invoice;
  }
};
