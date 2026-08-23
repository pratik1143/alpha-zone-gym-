const http = require('http');
const XLSX = require('xlsx');
const fs = require('fs');

const { parseAndValidateMemberRow } = require('../src/lib/importMemberSchema');

async function testBackend() {
  console.log('Reading Excel file...');
  const filePath = 'C:/Users/HP CONNECT/Downloads/all members 23082026 (1).xlsx';
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawObjects = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const members = [];
  rawObjects.forEach((r, idx) => {
    const parsed = parseAndValidateMemberRow(r, idx + 2);
    if (parsed) members.push(parsed);
  });

  console.log(`Parsed ${members.length} members ready for import.`);

  // Function to make HTTP POST
  function postRequest(urlPath, data) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  function getRequest(urlPath) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: urlPath,
        method: 'GET'
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  console.log('\n--- 1. Testing Dry Run Endpoint ---');
  const dryRunRes = await postRequest('/api/members/dry-run-migration', { members });
  console.log('Dry run response status:', dryRunRes.status);
  console.log('Dry run summary:', dryRunRes.data);

  console.log('\n--- 2. Testing Execution Migration 1st Pass ---');
  const migRes1 = await postRequest('/api/members/migrate', {
    members,
    dryRun: false,
    sessionId: 'test_session_1'
  });
  console.log('Migration 1 status:', migRes1.status);
  console.log('Migration 1 summary:', migRes1.data.migrationSummary || migRes1.data.stats);

  console.log('\n--- 3. Testing Idempotency (2nd Pass with same members) ---');
  const migRes2 = await postRequest('/api/members/migrate', {
    members,
    dryRun: false,
    sessionId: 'test_session_2'
  });
  console.log('Migration 2 status:', migRes2.status);
  console.log('Migration 2 summary:', migRes2.data.migrationSummary || migRes2.data.stats);

  console.log('\n--- 4. Verifying Members in Backend ---');
  const allMembersRes = await getRequest('/api/members');
  if (Array.isArray(allMembersRes.data)) {
    const list = allMembersRes.data;
    console.log(`Total members in database: ${list.length}`);

    const honey = list.find(m => String(m.clientId) === '6' || m.id === 'member_6');
    const roshani = list.find(m => String(m.clientId) === '5' || m.id === 'member_5');
    const kiran = list.find(m => String(m.clientId) === '439' || m.id === 'member_439');
    const priyal = list.find(m => String(m.clientId) === '404' || m.id === 'member_404');

    console.log('Member #6 (Honey):', honey ? `Found: ${honey.name}, Phone: ${honey.phone}` : 'MISSING');
    console.log('Member #5 (Roshani):', roshani ? `Found: ${roshani.name}, Phone: ${roshani.phone}` : 'MISSING');
    console.log('Member #439 (Kiran):', kiran ? `Found: ${kiran.name}, Expiry: ${kiran.expiryDate}, Paid: ${kiran.amountPaid}, Balance: ${kiran.balanceAmount}` : 'MISSING');
    console.log('Member #404 (Priyal):', priyal ? `Found: ${priyal.name}, Paid: ${priyal.amountPaid}, Balance: ${priyal.balanceAmount}` : 'MISSING');

    if (honey && roshani && honey.id !== roshani.id) {
      console.log('✓ SUCCESS: Honey and Roshani both exist independently!');
    }
  }
}

testBackend().catch(err => {
  console.error('Backend test error:', err);
});
