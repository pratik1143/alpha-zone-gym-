import assert from 'assert';

// Mirroring the resolveAmount logic from useTodaysPayments.ts
interface PaymentRecord {
  id?: string;
  invoice?: string;
  invoiceNumber?: string;
  amount?: number;
  paid?: number;
  amountPaid?: number;
  additionalAmountPaid?: number;
  adjustedAmount?: number;
  discount?: number;
  discountAmount?: number;
  netPayable?: number;
  isUpgrade?: boolean;
  transactionType?: string;
  date?: string;
  invoiceDate?: string;
  paymentDate?: string;
}

const resolveAmount = (p: PaymentRecord): number => {
  if (p.isUpgrade || p.transactionType === 'membership_upgrade') {
    const val = p.additionalAmountPaid !== undefined
      ? p.additionalAmountPaid
      : (p.amountPaid !== undefined ? p.amountPaid : 0);
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  const val =
    p.amountPaid !== undefined ? p.amountPaid :
    p.paid      !== undefined ? p.paid :
    (p.amount ?? 0);
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

function runUpgradeIsolationTests() {
  console.log('=== RUNNING UPGRADE PAYMENT TODAY COLLECTION ISOLATION TEST ===');

  const today = '2026-09-03';

  // Old bill paid on 20 Aug 2026
  const oldBill: PaymentRecord = {
    invoiceNumber: 'INV-MEM-001',
    amount: 2200,
    paid: 2200,
    amountPaid: 2200,
    date: '2026-08-20',
  };

  // Upgraded bill created today with discount
  // New package price = 6500, previous paid = 2200, discount = 1900, additional paid = 2400
  const clientDiscountedUpgradeBill: PaymentRecord = {
    invoiceNumber: 'INV-UPG-002',
    isUpgrade: true,
    transactionType: 'membership_upgrade',
    amount: 6500,
    adjustedAmount: 2200,
    discountAmount: 1900,
    discount: 1900,
    netPayable: 2400,
    additionalAmountPaid: 2400,
    amountPaid: 2400,
    paid: 2400,
    date: today,
    invoiceDate: today,
  };

  // Another regular payment today
  const regularBill: PaymentRecord = {
    invoiceNumber: 'INV-MEM-003',
    amount: 2500,
    paid: 2500,
    amountPaid: 2500,
    date: today,
    invoiceDate: today,
  };

  // Upgraded bill with 0 additional cash collected today (fully discounted or pending)
  const zeroCashUpgrade: PaymentRecord = {
    invoiceNumber: 'INV-UPG-004',
    isUpgrade: true,
    transactionType: 'membership_upgrade',
    amount: 4300,
    adjustedAmount: 2200,
    discountAmount: 2100,
    additionalAmountPaid: 0,
    amountPaid: 0,
    paid: 0,
    date: today,
    invoiceDate: today,
  };

  console.log('\n--- 1. Testing resolveAmount on Client Discounted Upgrade Bill ---');
  const upgAmount = resolveAmount(clientDiscountedUpgradeBill);
  console.log(`Upgraded bill package price: ₹6,500 | Adjusted: ₹2,200 | Discount: ₹1,900 | Additional collected: ₹2,400 -> resolveAmount: ₹${upgAmount}`);
  assert.strictEqual(upgAmount, 2400, 'Upgraded bill must resolve strictly to ₹2,400 additional collected today, NOT ₹6,500, NOT ₹4,300, NOT ₹1,900');
  console.log('✓ PASS: Upgraded bill resolves strictly to ₹2,400');

  console.log('\n--- 2. Testing resolveAmount on Zero Cash Upgrade ---');
  const zeroAmount = resolveAmount(zeroCashUpgrade);
  console.log(`Zero additional cash upgrade -> resolveAmount: ₹${zeroAmount}`);
  assert.strictEqual(zeroAmount, 0, 'Zero cash upgrade must resolve to ₹0');
  console.log('✓ PASS: Zero additional upgrade resolves to ₹0');

  console.log('\n--- 3. Testing Today Collection Aggregation ---');
  const todaysPayments = [clientDiscountedUpgradeBill, regularBill, zeroCashUpgrade];
  const todaysTotal = todaysPayments.reduce((sum, p) => sum + resolveAmount(p), 0);
  console.log(`Todays payments: Upgrade (₹2,400) + Regular (₹2,500) + Zero Upgrade (₹0) -> Total: ₹${todaysTotal}`);
  assert.strictEqual(todaysTotal, 4900, 'Today Collection must be ₹4,900 (2400 + 2500 + 0)');
  console.log('✓ PASS: Today Collection total is exactly ₹4,900');

  console.log('\n=== ALL UPGRADE COLLECTION ISOLATION TESTS PASSED! ===');
}

runUpgradeIsolationTests();
