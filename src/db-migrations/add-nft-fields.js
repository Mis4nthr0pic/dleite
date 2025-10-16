/**
 * Migration: Add NFT fields to qr_codes table
 *
 * Adds fields to track NFT minting status and metadata
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'app.sqlite');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function migrate() {
  const db = new sqlite3.Database(DB_PATH);

  try {
    console.log('Starting NFT fields migration...');

    // Add NFT-related columns to qr_codes table
    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_status TEXT DEFAULT 'pending'
      CHECK(nft_status IN ('pending', 'processing', 'minted', 'failed'))
    `);
    console.log('✓ Added nft_status column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_token_id TEXT
    `);
    console.log('✓ Added nft_token_id column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_metadata_uri TEXT
    `);
    console.log('✓ Added nft_metadata_uri column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_minted_at TEXT
    `);
    console.log('✓ Added nft_minted_at column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_tx_hash TEXT
    `);
    console.log('✓ Added nft_tx_hash column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_error_message TEXT
    `);
    console.log('✓ Added nft_error_message column');

    await run(db, `
      ALTER TABLE qr_codes ADD COLUMN nft_recipient_address TEXT
    `);
    console.log('✓ Added nft_recipient_address column');

    console.log('Migration completed successfully!');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('Migration already applied, skipping...');
    } else {
      console.error('Migration failed:', error);
      throw error;
    }
  } finally {
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate };
