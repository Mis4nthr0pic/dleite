const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');

class NFTService extends BaseService {
  /**
   * Get QR codes that need NFT minting (consumed but not minted)
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} List of QR codes with full details
   */
  async getQRCodesForMinting(limit = 100) {
    return this.all(`
      SELECT
        q.*,
        b.batch_number,
        b.expiry_date,
        p.name as producer_name,
        p.cnpj as producer_cnpj,
        a.neighborhood_name,
        a.president_name
      FROM qr_codes q
      JOIN batches b ON q.batch_id = b.id
      JOIN producers p ON b.producer_id = p.id
      JOIN associations a ON q.association_id = a.id
      WHERE q.status = 'consumed'
        AND (q.nft_status IS NULL OR q.nft_status = 'pending' OR q.nft_status = 'failed')
      ORDER BY q.consumed_at ASC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Update NFT status for a QR code
   * @param {string} token - QR code token
   * @param {Object} updates - NFT status updates
   * @param {string} updates.nft_status - Status: 'processing', 'minted', 'failed'
   * @param {string} [updates.nft_token_id] - Blockchain token ID
   * @param {string} [updates.nft_metadata_uri] - IPFS metadata URI
   * @param {string} [updates.nft_tx_hash] - Transaction hash
   * @param {string} [updates.nft_recipient_address] - Recipient wallet address
   * @param {string} [updates.nft_error_message] - Error message if failed
   * @returns {Promise<void>}
   */
  async updateNFTStatus(token, updates) {
    const { nft_status, nft_token_id, nft_metadata_uri, nft_tx_hash, nft_recipient_address, nft_error_message } = updates;

    // Load current QR state to enforce one-time mint and valid transitions
    const current = await this.get('SELECT status, nft_status FROM qr_codes WHERE token = ?', [token]);
    if (!current) {
      throw new NotFoundError(`QR code with token ${token} not found`);
    }

    // Once minted, no further changes allowed
    if (current.nft_status === 'minted') {
      throw new ValidationError('NFT already minted for this QR code');
    }

    // Only allow mint if QR was consumed
    if (nft_status === 'minted' && current.status !== 'consumed') {
      throw new ValidationError('QR must be consumed before minting');
    }

    if (!['processing', 'minted', 'failed', 'pending'].includes(nft_status)) {
      throw new ValidationError('Invalid NFT status');
    }

    const setClauses = ['nft_status = ?'];
    const params = [nft_status];

    if (nft_token_id !== undefined) {
      setClauses.push('nft_token_id = ?');
      params.push(nft_token_id);
    }

    if (nft_metadata_uri !== undefined) {
      setClauses.push('nft_metadata_uri = ?');
      params.push(nft_metadata_uri);
    }

    if (nft_tx_hash !== undefined) {
      setClauses.push('nft_tx_hash = ?');
      params.push(nft_tx_hash);
    }

    if (nft_recipient_address !== undefined) {
      setClauses.push('nft_recipient_address = ?');
      params.push(nft_recipient_address);
    }

    if (nft_error_message !== undefined) {
      setClauses.push('nft_error_message = ?');
      params.push(nft_error_message);
    }

    if (nft_status === 'minted') {
      setClauses.push('nft_minted_at = ?');
      params.push(new Date().toISOString());
    }

    params.push(token);

    const sql = `UPDATE qr_codes SET ${setClauses.join(', ')} WHERE token = ?`;
    const result = await this.run(sql, params);

    if (result.changes === 0) {
      throw new NotFoundError(`QR code with token ${token} not found`);
    }
  }

  /**
   * Mark QR code as processing
   * @param {string} token - QR code token
   * @returns {Promise<void>}
   */
  async markAsProcessing(token) {
    return this.updateNFTStatus(token, { nft_status: 'processing' });
  }

  /**
   * Mark QR code as minted
   * @param {string} token - QR code token
   * @param {Object} nftData - NFT minting data
   * @returns {Promise<void>}
   */
  async markAsMinted(token, nftData) {
    return this.updateNFTStatus(token, {
      nft_status: 'minted',
      nft_token_id: nftData.tokenId,
      nft_metadata_uri: nftData.metadataUri,
      nft_tx_hash: nftData.txHash,
      nft_recipient_address: nftData.recipientAddress,
    });
  }

  /**
   * Mark QR code as failed
   * @param {string} token - QR code token
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async markAsFailed(token, errorMessage) {
    return this.updateNFTStatus(token, {
      nft_status: 'failed',
      nft_error_message: errorMessage,
    });
  }

  /**
   * Get NFT statistics
   * @returns {Promise<Object>} NFT statistics
   */
  async getNFTStats() {
    const [pending, processing, minted, failed, total] = await Promise.all([
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE status = 'consumed' AND (nft_status IS NULL OR nft_status = 'pending')"),
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE nft_status = 'processing'"),
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE nft_status = 'minted'"),
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE nft_status = 'failed'"),
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE status = 'consumed'"),
    ]);

    return {
      pending: pending.c,
      processing: processing.c,
      minted: minted.c,
      failed: failed.c,
      total: total.c,
    };
  }

  /**
   * Get QR code by token with NFT info
   * @param {string} token - QR code token
   * @returns {Promise<Object|null>} QR code with NFT details
   */
  async getQRCodeWithNFT(token) {
    return this.get(`
      SELECT
        q.*,
        b.batch_number,
        b.expiry_date,
        p.name as producer_name,
        a.neighborhood_name
      FROM qr_codes q
      JOIN batches b ON q.batch_id = b.id
      JOIN producers p ON b.producer_id = p.id
      JOIN associations a ON q.association_id = a.id
      WHERE q.token = ?
    `, [token]);
  }

  /**
   * Retry failed NFT minting
   * @param {string} token - QR code token
   * @returns {Promise<void>}
   */
  async retryFailedMinting(token) {
    const qr = await this.get('SELECT * FROM qr_codes WHERE token = ?', [token]);

    if (!qr) {
      throw new NotFoundError(`QR code with token ${token} not found`);
    }

    if (qr.nft_status !== 'failed') {
      throw new ValidationError('Can only retry failed NFT minting');
    }

    return this.updateNFTStatus(token, {
      nft_status: 'pending',
      nft_error_message: null,
    });
  }
}

module.exports = new NFTService();
