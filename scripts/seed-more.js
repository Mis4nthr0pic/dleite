const dayjs = require('dayjs');
const { connect, run, get, all } = require('../src/db');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const db = connect();
  try {
    const now = dayjs().toISOString();

    // Add more associations
    const moreAssocs = [
      ['Jardim das Flores', 'Paulo Mendes', 'contato@jardimflores.org', '+55 11 98888-1111'],
      ['Vila Esperança', 'Carla Souza', 'contato@vilaesperanca.org', '+55 11 97777-2222'],
      ['Ribeira', 'AMBRI', 'ambricontato@example.com', '+55 84 90000-0000']
    ];
    for (const a of moreAssocs) {
      await run(db, `INSERT INTO associations (neighborhood_name, president_name, email, phone) VALUES (?,?,?,?)`, a);
    }

    // Add producers
    const producers = [
      ['01.234.567/0001-10', "D'Leite Vegetal"],
      ['98.765.432/0001-55', 'SolVerde Alimentos']
    ];
    for (const [cnpj, name] of producers) {
      await run(db, `INSERT INTO producers (cnpj, name) VALUES (?,?)`, [cnpj, name]);
    }

    const allProds = await all(db, 'SELECT * FROM producers ORDER BY id DESC');
    const prods = allProds.slice(0, 2);

    // Add multiple batches per producer
    for (const p of prods) {
      for (let i = 1; i <= 3; i++) {
        const bnum = `${p.name.substring(0,3).toUpperCase()}-${String(i).padStart(3,'0')}`;
        const expiry = dayjs().add(30 + i * 10, 'day').format('YYYY-MM-DD');
        const qty = 50 + i * 25;
        await run(db, `INSERT INTO batches (batch_number, producer_id, expiry_date, quantity_produced, created_at) VALUES (?,?,?,?,?)`, [
          bnum, p.id, expiry, qty, now
        ]);
      }
    }

    // Create extra orders and partial fulfillments for each new association
    const assocs = await all(db, 'SELECT * FROM associations ORDER BY id DESC LIMIT 3');
    const batches = await all(db, 'SELECT * FROM batches ORDER BY id DESC');
    for (const [idx, a] of assocs.entries()) {
      const requested = 30 + idx * 10;
      await run(db, `INSERT INTO orders (association_id, quantity_requested, status, created_at) VALUES (?,?,?,?)`, [
        a.id, requested, 'pending', now
      ]);
      const order = await get(db, 'SELECT * FROM orders WHERE association_id = ? ORDER BY id DESC LIMIT 1', [a.id]);

      // Allocate ~30%
      const fulfillQty = Math.floor(requested * 0.3);
      const batch = batches[(idx * 2) % batches.length];
      await run(db, `INSERT INTO fulfillments (order_id, batch_id, quantity_allocated, created_at) VALUES (?,?,?,?)`, [
        order.id, batch.id, fulfillQty, now
      ]);
      await run(db, `UPDATE orders SET status = ? WHERE id = ?`, ['partial', order.id]);
      for (let i = 0; i < fulfillQty; i++) {
        await run(db, `INSERT INTO qr_codes (token, batch_id, order_id, association_id, status, issued_at) VALUES (?,?,?,?,?,?)`, [
          uuidv4(), batch.id, order.id, a.id, 'issued', now
        ]);
      }
    }

    console.log('Seeded more associations, producers, batches, and orders with QR codes.');
  } catch (e) {
    console.error('Error seeding:', e);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();

