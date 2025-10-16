const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFiles = ['app.sqlite', 'sessions.sqlite'];

let removed = 0;
for (const f of dbFiles) {
  const p = path.join(dataDir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Removed', p);
    removed++;
  }
}

if (removed === 0) {
  console.log('No database files to remove.');
} else {
  console.log('Database reset. Start the server to re-create and seed.');
}

