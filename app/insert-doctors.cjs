const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

function getPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

try {
  db.transaction(() => {
    const nowMs = Date.now();

    // 1. Create user for Dr. Gautham Krishnamurthy
    const gauthamUsername = 'drgauthamkrishna';
    let gauthamUser = db.prepare('SELECT id FROM users WHERE username = ?').get(gauthamUsername);
    if (!gauthamUser) {
      const gauthamPass = getPasswordHash('apollo123');
      const info = db.prepare(`
        INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(gauthamUsername, gauthamPass, 'Dr. Gautham Krishnamurthy', 'doctor', nowMs, nowMs, nowMs);
      gauthamUser = { id: info.lastInsertRowid };
      console.log('Created user for Dr. Gautham with ID:', gauthamUser.id);
    }
    
    // Update Dr. Gautham (id = 8) to use his own userId instead of Vishnu's (9)
    db.prepare('UPDATE doctors SET userId = ? WHERE id = 8').run(gauthamUser.id);
    console.log('Updated Dr. Gautham doctor record to use userId:', gauthamUser.id);

    // 2. Insert Dr. Vishnu Abishek Raju back if not already exists in doctors
    const vishnuDoc = db.prepare('SELECT id FROM doctors WHERE name LIKE ?').get('%Vishnu%');
    if (!vishnuDoc) {
      db.prepare(`
        INSERT INTO doctors (name, credentials, specialty, registrationNumber, userId, serviceName, branch, image, fees, availability, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Dr. Vishnu Abishek Raju',
        'MBBS, MD (Internal Medicine), DM (Gastroenterology)',
        'Gastroenterology / GI Medicine',
        'REG-007',
        9, // Vishnu's existing userId
        'Dr. Vishnu Abishek Raju - Gastroenterology',
        'Apollo Hospitals Greams Road, Chennai',
        '/images/vishnu.jpg',
        1200,
        'Friday (11:00 AM – 3:00 PM)',
        'Available'
      );
      console.log('Inserted Dr. Vishnu back into doctors table');
    } else {
      console.log('Dr. Vishnu already exists in doctors table');
    }

    // 3. Create user and insert Dr. Rakesh Shetty
    const rakeshUsername = 'drrakeshshetty';
    let rakeshUser = db.prepare('SELECT id FROM users WHERE username = ?').get(rakeshUsername);
    if (!rakeshUser) {
      const rakeshPass = getPasswordHash('apollo123');
      const info = db.prepare(`
        INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(rakeshUsername, rakeshPass, 'Dr. Rakesh Shetty', 'doctor', nowMs, nowMs, nowMs);
      rakeshUser = { id: info.lastInsertRowid };
      console.log('Created user for Dr. Rakesh Shetty with ID:', rakeshUser.id);
    }

    const rakeshDoc = db.prepare('SELECT id FROM doctors WHERE name LIKE ?').get('%Rakesh%');
    if (!rakeshDoc) {
      db.prepare(`
        INSERT INTO doctors (name, credentials, specialty, registrationNumber, userId, serviceName, branch, image, fees, availability, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Dr. Rakesh Shetty',
        'MBBS, DNB (Orthopaedic) Certified in spine and joint Replacement Surgeon (Languages: English, Telugu, Tamil, Kannada, Bengali, Tulu, Marathi, Hindi)',
        'Orthopedics-Sports Medicine',
        'REG-008',
        rakeshUser.id,
        'Dr. Rakesh Shetty - Orthopedics-Sports Medicine',
        'Apollo Hospitals Chennai',
        '/images/rakesh.jpg',
        1200,
        'Monday & Wednesday (2:00 PM – 5:00 PM)',
        'Available'
      );
      console.log('Inserted Dr. Rakesh Shetty into doctors table');
    } else {
      console.log('Dr. Rakesh Shetty already exists in doctors table');
    }
  })();
  console.log('All operations completed successfully');
} catch (err) {
  console.error('Error during transaction:', err);
}
