import assert from 'assert';
import { db } from '../firebase';
import { upgradeMembership } from '../controllers/member.controller';

async function runUpgradeTests() {
  console.log('=== RUNNING MEMBERSHIP UPGRADE AUTOMATED TEST SUITE ===');

  const testMemberId = `mem_upgrade_test_${Date.now()}`;
  const oldInvoiceNumber = `INV-MEM-TEST-001`;
  const oldPaymentDate = '2026-08-20';

  try {
    // 1. Create a member with 3-month membership
    console.log('\n--- 1. Setting up initial member & old bill ---');
    const member = await db.addMember({
      id: testMemberId,
      name: 'Upgrade Test Member',
      phone: '9876543299',
      plan: '3 Months',
      price: 3000,
      amount: 3000,
      totalBilled: 3000,
      totalPaid: 3000,
      outstandingBalance: 0,
      startDate: '2026-08-20',
      expiryDate: '2026-11-20',
      status: 'active',
      paymentStatus: 'paid',
    });

    const oldBill = await db.addPayment({
      memberId: testMemberId,
      memberName: 'Upgrade Test Member',
      plan: '3 Months',
      invoiceNumber: oldInvoiceNumber,
      invoice: oldInvoiceNumber,
      amount: 3000,
      paid: 3000,
      originalAmount: 3000,
      netPayable: 3000,
      amountPaid: 3000,
      pendingAmount: 0,
      status: 'paid',
      date: oldPaymentDate,
      paymentDate: oldPaymentDate,
      invoiceDate: oldPaymentDate,
      transactionDate: oldPaymentDate,
    });

    console.log(`Initial member created with old bill ${oldBill.invoiceNumber} paid on ${oldPaymentDate}`);

    // 2. Perform Upgrade to 6 Months (₹5,000) with ₹2,000 additional payment
    console.log('\n--- 2. Executing Upgrade: 3 Months -> 6 Months (₹3,000 adjusted, ₹2,000 additional) ---');
    
    let resStatus = 200;
    let resJson: any = null;
    const mockReq: any = {
      params: { id: testMemberId },
      body: {
        plan: '6 Months',
        packagePrice: 5000,
        startDate: '2026-08-20',
        expiryDate: '2027-02-20',
        previousInvoiceId: oldBill.id,
        previousInvoiceNumber: oldInvoiceNumber,
        previousInvoiceDate: oldPaymentDate,
        previousPlan: '3 Months',
        previousPaidAmount: 3000,
        adjustedAmount: 3000,
        additionalAmountDue: 2000,
        additionalAmountPaid: 2000,
        paymentMethod: 'UPI',
        paymentStatus: 'paid',
        invoiceDate: '2026-09-01',
        notes: 'Upgraded to 6 Months',
      }
    };
    const mockRes: any = {
      status: (code: number) => {
        resStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        resJson = data;
        return mockRes;
      }
    };

    await upgradeMembership(mockReq, mockRes);

    assert.strictEqual(resStatus, 200, `Upgrade endpoint should return 200, got ${resStatus}`);
    assert.strictEqual(resJson.success, true, 'Upgrade response should have success = true');
    console.log(`✓ Upgrade API succeeded with invoice: ${resJson.invoiceNumber}`);

    // 3. Verify Upgraded Bill
    const newInvoice = resJson.payment;
    assert(newInvoice.invoiceNumber.startsWith('INV-UPG-'), 'New invoice must start with INV-UPG-');
    assert.strictEqual(newInvoice.plan, '6 Months', 'New invoice plan must be 6 Months');
    assert.strictEqual(newInvoice.netPayable, 5000, 'New invoice total package price must be 5000');
    assert.strictEqual(newInvoice.adjustedAmount, 3000, 'Adjusted amount must be 3000');
    assert.strictEqual(newInvoice.additionalAmountPaid, 2000, 'Additional paid must be 2000');
    assert.strictEqual(newInvoice.amountPaid, 2000, 'amountPaid on invoice must be 2000 for Today Collection isolation');
    assert.strictEqual(newInvoice.previousInvoiceNumber, oldInvoiceNumber, 'Must link to old invoice number');
    assert.strictEqual(newInvoice.previousInvoiceDate, oldPaymentDate, 'Must link to old payment date');
    console.log('✓ Upgraded bill metadata and amounts verified');

    // 4. Verify Old Bill Remains Intact
    const payments = await db.getPayments({ memberId: testMemberId });
    const fetchedOldBill = payments.find((p: any) => p.invoiceNumber === oldInvoiceNumber || p.id === oldBill.id);
    assert(fetchedOldBill, 'Old bill must still exist');
    assert.strictEqual(fetchedOldBill.date, oldPaymentDate, 'Old bill date must NOT be overwritten');
    assert.strictEqual(fetchedOldBill.paid, 3000, 'Old bill paid amount must remain 3000');
    assert.strictEqual(fetchedOldBill.isUpgraded, true, 'Old bill should be marked as upgraded');
    assert.strictEqual(fetchedOldBill.upgradedToInvoice, newInvoice.invoiceNumber, 'Old bill should reference new invoice');
    console.log('✓ Old bill preserved with original payment date and amounts');

    // 5. Verify Member Document
    const updatedMember = await db.getMemberById(testMemberId);
    assert.strictEqual(updatedMember.plan, '6 Months', 'Member plan must be updated to 6 Months');
    assert.strictEqual(updatedMember.expiryDate, '2027-02-20', 'Member expiry must be updated');
    assert.strictEqual(updatedMember.totalBilled, 5000, 'Member totalBilled must be 5000');
    assert.strictEqual(updatedMember.totalPaid, 5000, 'Member totalPaid must be 5000');
    assert.strictEqual(updatedMember.outstandingBalance, 0, 'Outstanding balance must be 0');
    assert(Array.isArray(updatedMember.membershipHistory) && updatedMember.membershipHistory.length > 0, 'History entry must exist');
    assert.strictEqual(updatedMember.membershipHistory[0].type, 'UPGRADE', 'History entry must be type UPGRADE');
    console.log('✓ Member document and membership history updated accurately');

    console.log('\n=== ALL MEMBERSHIP UPGRADE TESTS PASSED SUCCESSFULLY! ===');
  } finally {
    // Cleanup test records
    try {
      await db.deleteMember(testMemberId);
      const allP = await db.getPayments({ memberId: testMemberId });
      for (const p of allP) {
        await db.updatePayment(p.id, { deleted: true });
      }
    } catch (_) {}
  }
}

runUpgradeTests().catch(err => {
  console.error('Upgrade test failed:', err);
  process.exit(1);
});
