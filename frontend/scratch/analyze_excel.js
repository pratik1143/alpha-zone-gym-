const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/HP CONNECT/Downloads/all members 23082026 (1).xlsx';
const wb = XLSX.readFile(filePath, { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

function normalizeDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return '';
    const y = d.y;
    const m = String(d.m).padStart(2, '0');
    const day = String(d.d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return '';
    const monthNames = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
      aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
      nov: 11, november: 11, dec: 12, december: 12
    };
    const mMatch = s.match(/^(\d{1,2})[-/ ]([A-Za-z]+)[-/ ](\d{2,4})$/);
    if (mMatch) {
      const day = parseInt(mMatch[1], 10);
      const monStr = mMatch[2].toLowerCase();
      let year = parseInt(mMatch[3], 10);
      if (year < 100) year += 2000;
      const mon = monthNames[monStr];
      if (mon) {
        return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return '';
}

function normalizePackageName(pkg) {
  if (!pkg) return 'General Membership';
  const str = String(pkg).trim();
  const lower = str.toLowerCase();
  
  // Normalization dictionary / rules
  if (/^1\s*day$/i.test(lower)) return '1 Day';
  if (/^10\s*days?$/i.test(lower)) return '10 Days';
  if (/^15\s*days?$/i.test(lower)) return '15 Days';
  if (/^1\s*months?$/i.test(lower)) return '1 Month';
  if (/^2\s*months?$/i.test(lower)) return '2 Months';
  if (/^3\s*months?$/i.test(lower)) return '3 Months';
  if (/^6\s*months?$/i.test(lower)) return '6 Months';
  if (/^12\s*months?$/i.test(lower) || /^1\s*year$/i.test(lower)) return '12 Months';
  if (/^3\s*\+\s*1\s*months?$/i.test(lower)) return '3+1 Months';
  if (/^3\s*\+\s*2\s*months?$/i.test(lower)) return '3+2 Months';
  if (/^6\s*\+\s*1\s*months?$/i.test(lower)) return '6+1 Months';

  return str.charAt(0).toUpperCase() + str.slice(1);
}

let dateErrors = [];
let expiryBeforeStart = [];
let balanceWarning = [];
let validRows = 0;

rows.forEach((r, idx) => {
  const cid = String(r['Client ID'] || '').trim();
  const name = String(r['Client name'] || '').trim();
  const phone = String(r['Number'] || '').trim();
  const gender = String(r['Gender'] || '').trim();
  const sRaw = r['Start Date'];
  const eRaw = r['Expiry Date'];
  const pkgRaw = r['Package'];
  const amount = Number(r['Amount']) || 0;
  const balance = Number(r['Balance']) || 0;
  const photo = String(r['Photo'] || '').trim();

  if (!cid && !name && !phone) return;
  validRows++;

  const sNorm = normalizeDate(sRaw);
  const eNorm = normalizeDate(eRaw);
  const pkgNorm = normalizePackageName(pkgRaw);

  if (!sNorm || !eNorm) {
    dateErrors.push({ cid, name, sRaw, eRaw, sNorm, eNorm });
  }

  if (sNorm && eNorm && eNorm < sNorm) {
    expiryBeforeStart.push({ cid, name, sNorm, eNorm });
  }

  if (balance > amount && amount > 0) {
    balanceWarning.push({ cid, name, amount, balance });
  }
});

console.log('Total rows processed:', validRows);
console.log('Date parse failures:', dateErrors.length);
console.log('Expiry before Start:', expiryBeforeStart.length, expiryBeforeStart);
console.log('Balance > Amount warnings:', balanceWarning.length, balanceWarning);
