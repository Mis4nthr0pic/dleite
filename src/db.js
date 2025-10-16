const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.sqlite');

function connect() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA busy_timeout = 5000');
  });
  return db;
}

function run(db, sql, params = [], attempt = 0) {
  const maxAttempts = 5;
  const delay = 100 * (attempt + 1);
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        if (err.code === 'SQLITE_BUSY' && attempt < maxAttempts) {
          return setTimeout(() => {
            run(db, sql, params, attempt + 1).then(resolve).catch(reject);
          }, delay);
        }
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function all(db, sql, params = [], attempt = 0) {
  const maxAttempts = 5;
  const delay = 100 * (attempt + 1);
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) {
        if (err.code === 'SQLITE_BUSY' && attempt < maxAttempts) {
          return setTimeout(() => {
            all(db, sql, params, attempt + 1).then(resolve).catch(reject);
          }, delay);
        }
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(db, sql, params = [], attempt = 0) {
  const maxAttempts = 5;
  const delay = 100 * (attempt + 1);
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) {
        if (err.code === 'SQLITE_BUSY' && attempt < maxAttempts) {
          return setTimeout(() => {
            get(db, sql, params, attempt + 1).then(resolve).catch(reject);
          }, delay);
        }
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function migrateAndSeed() {
  const db = connect();
  await run(db, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','association')),
    association_id INTEGER,
    FOREIGN KEY(association_id) REFERENCES associations(id) ON DELETE SET NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    neighborhood_name TEXT NOT NULL,
    president_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS producers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT NOT NULL,
    name TEXT NOT NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL,
    producer_id INTEGER NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity_produced INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(producer_id) REFERENCES producers(id) ON DELETE CASCADE
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    association_id INTEGER NOT NULL,
    quantity_requested INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial','fulfilled')),
    created_at TEXT NOT NULL,
    FOREIGN KEY(association_id) REFERENCES associations(id) ON DELETE CASCADE
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS fulfillments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    quantity_allocated INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    batch_id INTEGER NOT NULL,
    order_id INTEGER,
    association_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','consumed')),
    issued_at TEXT NOT NULL,
    consumed_at TEXT,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY(association_id) REFERENCES associations(id) ON DELETE CASCADE
  )`);

  // Ensure NFT-related columns exist (best-effort, ignore if already added)
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_status TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_token_id TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_metadata_uri TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_minted_at TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_tx_hash TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_error_message TEXT`); } catch (e) {}
  try { await run(db, `ALTER TABLE qr_codes ADD COLUMN nft_recipient_address TEXT`); } catch (e) {}

  // Seed minimal data if not present
  const userCount = await get(db, 'SELECT COUNT(*) as c FROM users');
  if (!userCount || userCount.c === 0) {
    const now = dayjs().toISOString();

    // Associations (seed 5)
    const seedAssocs = [
      ['Bairro Central', 'Maria Silva', 'assoc@example.com', '+55 11 99999-0000'],
      ['Jardim das Flores', 'Paulo Mendes', 'flores@example.com', '+55 11 98888-1111'],
      ['Vila Esperança', 'Carla Souza', 'esperanca@example.com', '+55 11 97777-2222'],
      ['Ribeira', 'AMBRI', 'ribeira@example.com', '+55 84 90000-0000'],
      ['Nova Aliança', 'João Pereira', 'alianca@example.com', '+55 21 96666-3333']
    ];
    for (const a of seedAssocs) {
      await run(db, `INSERT INTO associations (neighborhood_name, president_name, email, phone) VALUES (?,?,?,?)`, a);
    }
    const assoc = await get(db, 'SELECT * FROM associations ORDER BY id ASC LIMIT 1');

    // Users
    const adminPass = bcrypt.hashSync('12345', 10);
    await run(db, `INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)`, [
      'Admin', 'admin@example.com', adminPass, 'admin'
    ]);

    // Association users will be auto-created below to ensure each association has at least one user

    // Producer
    await run(db, `INSERT INTO producers (cnpj, name) VALUES (?,?)`, [
      '12.345.678/0001-90', 'VerdeLeite'
    ]);
    const producer = await get(db, 'SELECT * FROM producers LIMIT 1');

    // Batch
    const expiry = dayjs().add(60, 'day').format('YYYY-MM-DD');
    await run(db, `INSERT INTO batches (batch_number, producer_id, expiry_date, quantity_produced, created_at) VALUES (?,?,?,?,?)`, [
      'BATCH-001', producer.id, expiry, 100, now
    ]);
    const batch = await get(db, 'SELECT * FROM batches LIMIT 1');

    // Order
    await run(db, `INSERT INTO orders (association_id, quantity_requested, status, created_at) VALUES (?,?,?,?)`, [
      assoc.id, 40, 'pending', now
    ]);
    const order = await get(db, 'SELECT * FROM orders LIMIT 1');

    // Partial fulfillment: 12 units (~30%)
    const qty = 12;
    await run(db, `INSERT INTO fulfillments (order_id, batch_id, quantity_allocated, created_at) VALUES (?,?,?,?)`, [
      order.id, batch.id, qty, now
    ]);
    await run(db, `UPDATE orders SET status = ? WHERE id = ?`, ['partial', order.id]);

    for (let i = 0; i < qty; i++) {
      const token = uuidv4();
      await run(db, `INSERT INTO qr_codes (token, batch_id, order_id, association_id, status, issued_at) VALUES (?,?,?,?,?,?)`, [
        token, batch.id, order.id, assoc.id, 'issued', now
      ]);
    }
  }

  // Ensure every user has password '12345' (temporary policy)
  try {
    const std = bcrypt.hashSync('12345', 10);
    await run(db, 'UPDATE users SET password_hash = ?', [std]);
  } catch (e) {}

  // Ensure each association has at least one linked user
  try {
    const assocs = await all(db, 'SELECT id, neighborhood_name, email FROM associations');
    const std = bcrypt.hashSync('12345', 10);
    for (const a of assocs) {
      const u = await get(db, 'SELECT id FROM users WHERE association_id = ?', [a.id]);
      if (!u) {
        let email = a.email || `assoc-${a.id}@example.local`;
        const existing = await get(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (existing) email = `assoc-${a.id}@example.local`;
        await run(db, 'INSERT INTO users (name,email,password_hash,role,association_id) VALUES (?,?,?,?,?)', [
          `Associação ${a.neighborhood_name}`, email, std, 'association', a.id
        ]);
      }
    }
  } catch (e) {}

  db.close();
}

module.exports = {
  connect,
  run,
  all,
  get,
  migrateAndSeed,
  DB_PATH,
};
