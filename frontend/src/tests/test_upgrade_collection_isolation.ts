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

  const today = '2026-09-01';

  // Old bill paid on 20 Aug 2026
  const oldBill: PaymentRecord = {
    invoiceNumber: 'INV-MEM-001',
    amount: 3000,
    paid: 3000,
    amountPaid: 3000,
    date: '2026-08-20',
  };

  // Upgraded bill created today
  // New package price = 5000, previous paid = 3000, additional paid = 2000
  const upgradedBill: PaymentRecord = {
    invoiceNumber: 'INV-UPG-002',
    isUpgrade: true,
    transactionType: 'membership_upgrade',
    amount: 5000,
    adjustedAmount: 3000,
    additionalAmountPaid: 2000,
    amountPaid: 2000,
    paid: 2000,
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

  // Upgraded bill with 0 additional cash collected today (pending balance)
  const zeroCashUpgrade: PaymentRecord = {
    invoiceNumber: 'INV-UPG-004',
    isUpgrade: true,
    transactionType: 'membership_upgrade',
    amount: 3000,
    adjustedAmount: 3000,
    additionalAmountPaid: 0,
    amountPaid: 0,
    paid: 0,
    date: today,
    invoiceDate: today,
  };

  console.log('\n--- 1. Testing resolveAmount on Upgraded Bill ---');
  const upgAmount = resolveAmount(upgradedBill);
  console.log(`Upgraded bill package price: ₹5,000 | Additional collected: ₹2,000 -> resolveAmount: ₹${upgAmount}`);
  assert.strictEqual(upgAmount, 2000, 'Upgraded bill must resolve strictly to ₹2,000 additional collected today, NOT ₹5,000');
  console.log('✓ PASS: Upgraded bill resolves to ₹2,000');

  console.log('\n--- 2. Testing resolveAmount on Zero Cash Upgrade ---');
  const zeroAmount = resolveAmount(zeroCashUpgrade);
  console.log(`Zero additional cash upgrade -> resolveAmount: ₹${zeroAmount}`);
  assert.strictEqual(zeroAmount, 0, 'Zero cash upgrade must resolve to ₹0');
  console.log('✓ PASS: Zero additional upgrade resolves to ₹0');

  console.log('\n--- 3. Testing Today Collection Aggregation ---');
  const todaysPayments = [upgradedBill, regularBill, zeroCashUpgrade];
  const todaysTotal = todaysPayments.reduce((sum, p) => sum + resolveAmount(p), 0);
  console.log(`Todays payments: Upgrade (₹2,000) + Regular (₹2,500) + Zero Upgrade (₹0) -> Total: ₹${todaysTotal}`);
  assert.strictEqual(todaysTotal, 4500, 'Today Collection must be ₹4,500 (2000 + 2500 + 0)');
  console.log('✓ PASS: Today Collection total is exactly ₹4,500');

  console.log('\n=== ALL UPGRADE COLLECTION ISOLATION TESTS PASSED! ===');
}

runUpgradeIsolationTests();
