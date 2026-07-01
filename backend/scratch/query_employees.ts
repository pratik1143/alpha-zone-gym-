import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function run() {
  const user_id = 10011;
  
  // Simulate exact same queries that device_service.py runs
  console.log('=== Testing employee lookup for user_id:', user_id, '===\n');
  
  // 1. deviceUserId string match
  const q1 = await db.collection('employees')
    .where('deviceUserId', '==', String(user_id))
    .limit(1)
    .get();
  console.log(`1) employees.where('deviceUserId','==','${user_id}') -> ${q1.size} docs`);
  q1.forEach(doc => console.log('   Found:', doc.data().name, '| deviceUserId:', doc.data().deviceUserId));

  // 2. biometricId string match
  const q2 = await db.collection('employees')
    .where('biometricId', '==', String(user_id))
    .limit(1)
    .get();
  console.log(`2) employees.where('biometricId','==','${user_id}') -> ${q2.size} docs`);
  q2.forEach(doc => console.log('   Found:', doc.data().name, '| biometricId:', doc.data().biometricId));

  // 3. biometricId int match  
  const q3 = await db.collection('employees')
    .where('biometricId', '==', user_id)
    .limit(1)
    .get();
  console.log(`3) employees.where('biometricId','==',${user_id}) -> ${q3.size} docs`);
  q3.forEach(doc => console.log('   Found:', doc.data().name, '| biometricId:', doc.data().biometricId));
  
  // 4. Sanity check: full employees list
  const allSnap = await db.collection('employees').get();
  console.log(`\n4) Total employees in collection: ${allSnap.size}`);
  allSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   - "${d.name}" | biometricId: "${d.biometricId}" (${typeof d.biometricId}) | deviceUserId: "${d.deviceUserId}" (${typeof d.deviceUserId})`);
  });

  process.exit(0);
}

run();
