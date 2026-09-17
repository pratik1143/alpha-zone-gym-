const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../backend/serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMembers() {
  const ids = ['2321', '1145', '10013', '1001'];
  console.log('--- CHECKING MEMBERS BY BIOMETRIC ID / DEVICE USER ID / MEMBER ID ---');
  
  const snap = await db.collection('members').get();
  snap.docs.forEach(doc => {
    const data = doc.data();
    const bio = String(data.biometricId || '');
    const dev = String(data.deviceUserId || '');
    const memId = String(data.memberId || '');
    const uid = doc.id;
    const name = data.name;
    
    if (ids.includes(bio) || ids.includes(dev) || ids.includes(memId) || ids.includes(uid)) {
      console.log(`FOUND: Name="${name}", ID="${uid}", memberId="${memId}", biometricId="${bio}", deviceUserId="${dev}"`);
    }
  });

  console.log('--- CHECKING DEVICES COLLECTION ---');
  const devSnap = await db.collection('devices').get();
  devSnap.docs.forEach(doc => {
    console.log(`Device Doc ID="${doc.id}":`, doc.data());
  });

  process.exit(0);
}

checkMembers().catch(console.error);
