const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if(i > 0) {
    const k = line.substring(0, i).trim();
    let v = line.substring(i+1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    env[k] = v;
  }
});

async function run() {
  const { initializeApp } = require('firebase/app');
  const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
  const db = getFirestore(app);
  
  const q = query(collection(db, 'webhook_logs'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if(snap.empty) { console.log('NO WEBHOOK LOGS FOUND'); }
  snap.forEach(doc => {
    console.log('--- LOG ID:', doc.id);
    const data = doc.data();
    data.createdAt = data.createdAt ? data.createdAt.toDate() : null;
    console.log(JSON.stringify(data, null, 2));
  });
  process.exit(0);
}
run().catch(console.error);
