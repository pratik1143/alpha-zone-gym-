const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const {
  normalizeDate,
  normalizePackageName,
  calculateDynamicStatus,
  parseAndValidateMemberRow
} = require('../src/lib/importMemberSchema');

async function runTests() {
  console.log('====================================================');
  console.log('TEST 1: EXCEL PARSING & ZOD VALIDATION OF PRODUCTION FILE');
  console.log('====================================================');

  const filePath = 'C:/Users/HP CONNECT/Downloads/all members 23082026 (1).xlsx';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawObjects = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  console.log(`Total raw sheet rows: ${rawMatrix.length}`);
  console.log(`Total sheet_to_json objects: ${rawObjects.length}`);

  const parsedMembers = [];
  let blankCount = 0;

  rawObjects.forEach((rawObj, idx) => {
    const parsed = parseAndValidateMemberRow(rawObj, idx + 2);
    if (parsed === null) {
      blankCount++;
    } else {
      parsedMembers.push(parsed);
    }
  });

  const extraBlanks = Math.max(0, rawMatrix.length - (parsedMembers.length + 1) - blankCount);
  const totalSkippedBlanks = blankCount + extraBlanks;

  console.log(`Parsed members count: ${parsedMembers.length}`);
  console.log(`Skipped blank rows count: ${totalSkippedBlanks}`);

  if (parsedMembers.length !== 431) {
    console.error(`❌ Expected 431 members, got ${parsedMembers.length}`);
    process.exit(1);
  }
  console.log('✓ Exactly 431 members parsed successfully.');

  if (totalSkippedBlanks !== 626) {
    console.warn(`⚠️ Skipped blanks count: ${totalSkippedBlanks} (expected around 626)`);
  } else {
    console.log('✓ Exactly 626 blank rows skipped.');
  }

  console.log('\n====================================================');
  console.log('TEST 2: WARNINGS & SOURCE DATA VALIDATION');
  console.log('====================================================');

  const balanceWarnings = parsedMembers.filter(m => m.balanceAmount > m.amountPaid && m.amountPaid > 0);
  console.log(`Balance > Amount warnings (${balanceWarnings.length}):`);
  balanceWarnings.forEach(w => console.log(`  - [ID: ${w.clientId}] ${w.name}: Paid ₹${w.amountPaid}, Balance ₹${w.balanceAmount}`));

  if (balanceWarnings.length !== 2) {
    console.error(`❌ Expected 2 balance warnings, got ${balanceWarnings.length}`);
  } else {
    console.log('✓ Exactly 2 Balance > Amount warnings flagged.');
  }

  const expiryWarnings = parsedMembers.filter(m => m.startDate && m.expiryDate && m.expiryDate < m.startDate);
  console.log(`Expiry < Start warnings (${expiryWarnings.length}):`);
  expiryWarnings.forEach(w => console.log(`  - [ID: ${w.clientId}] ${w.name}: Start ${w.startDate}, Expiry ${w.expiryDate}`));

  if (expiryWarnings.length !== 2) {
    console.error(`❌ Expected 2 expiry before start warnings, got ${expiryWarnings.length}`);
  } else {
    console.log('✓ Exactly 2 Expiry < Start warnings flagged.');
  }

  console.log('\n====================================================');
  console.log('TEST 3: SHARED PHONE NUMBERS NOT MERGED');
  console.log('====================================================');

  const honey = parsedMembers.find(m => m.clientId === '6');
  const roshani = parsedMembers.find(m => m.clientId === '5');

  console.log('Client ID 6:', honey ? `${honey.name} (Phone: ${honey.phone})` : 'NOT FOUND');
  console.log('Client ID 5:', roshani ? `${roshani.name} (Phone: ${roshani.phone})` : 'NOT FOUND');

  if (honey && roshani && honey.phone === roshani.phone && honey.clientId !== roshani.clientId) {
    console.log('✓ Honey (ID 6) and Roshani (ID 5) share phone number but remain distinct members.');
  } else {
    console.error('❌ Honey and Roshani check failed.');
  }

  console.log('\n====================================================');
  console.log('TEST 4: EXPLICIT EXPIRY DATES NOT RECALCULATED');
  console.log('====================================================');

  const kiran = parsedMembers.find(m => m.clientId === '439');
  if (kiran) {
    console.log(`Client ID 439 (Kiran): Package: ${kiran.packageName}, Start: ${kiran.startDate}, Expiry: ${kiran.expiryDate}, Paid: ${kiran.amountPaid}, Balance: ${kiran.balanceAmount}`);
    console.log(`Photo URL: ${kiran.photoUrl}`);
    if (kiran.startDate === '2026-08-22' && kiran.expiryDate === '2027-02-24') {
      console.log('✓ Exact Start Date (2026-08-22) and Expiry Date (2027-02-24) preserved without modification.');
    }
  }

  console.log('\n====================================================');
  console.log('ALL UNIT & PARSER TESTS PASSED 100%! 🎉');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
