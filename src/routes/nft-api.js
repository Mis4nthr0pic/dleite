const express = require('express');
const NFTService = require('../services/NFTService');
const { ValidationError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// Middleware for API key authentication
function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKey = process.env.NFT_API_KEY || 'dev-nft-api-key';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key',
    });
  }

  next();
}

// Apply API key authentication to all routes
router.use(authenticateAPIKey);

/**
 * GET /api/nft/pending
 * Get QR codes that need NFT minting
 */
router.get('/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const qrCodes = await NFTService.getQRCodesForMinting(limit);

    res.json({
      success: true,
      count: qrCodes.length,
      data: qrCodes,
    });
  } catch (error) {
    console.error('Error fetching pending QR codes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/nft/update-status
 * Update NFT minting status for a QR code
 */
router.post('/update-status', async (req, res) => {
  try {
    const { token, nft_status, nft_token_id, nft_metadata_uri, nft_tx_hash, nft_recipient_address, nft_error_message } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    if (!nft_status) {
      return res.status(400).json({
        success: false,
        error: 'nft_status is required',
      });
    }

    await NFTService.updateNFTStatus(token, {
      nft_status,
      nft_token_id,
      nft_metadata_uri,
      nft_tx_hash,
      nft_recipient_address,
      nft_error_message,
    });

    res.json({
      success: true,
      message: 'NFT status updated successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Error updating NFT status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/nft/mark-processing
 * Mark QR code as being processed
 */
router.post('/mark-processing', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    await NFTService.markAsProcessing(token);

    res.json({
      success: true,
      message: 'QR code marked as processing',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Error marking as processing:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/nft/mark-minted
 * Mark QR code as successfully minted
 */
router.post('/mark-minted', async (req, res) => {
  try {
    const { token, tokenId, metadataUri, txHash, recipientAddress } = req.body;

    if (!token || !tokenId || !metadataUri || !txHash || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'token, tokenId, metadataUri, txHash, and recipientAddress are required',
      });
    }

    await NFTService.markAsMinted(token, {
      tokenId,
      metadataUri,
      txHash,
      recipientAddress,
    });

    res.json({
      success: true,
      message: 'NFT marked as minted successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Error marking as minted:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/nft/mark-failed
 * Mark QR code as failed to mint
 */
router.post('/mark-failed', async (req, res) => {
  try {
    const { token, errorMessage } = req.body;

    if (!token || !errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'token and errorMessage are required',
      });
    }

    await NFTService.markAsFailed(token, errorMessage);

    res.json({
      success: true,
      message: 'NFT marked as failed',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Error marking as failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/nft/retry-failed
 * Retry failed NFT minting
 */
router.post('/retry-failed', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    await NFTService.retryFailedMinting(token);

    res.json({
      success: true,
      message: 'NFT minting retry initiated',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Error retrying failed minting:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/nft/stats
 * Get NFT minting statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await NFTService.getNFTStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching NFT stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/nft/qr/:token
 * Get QR code details with NFT info
 */
router.get('/qr/:token', async (req, res) => {
  try {
    const qrCode = await NFTService.getQRCodeWithNFT(req.params.token);

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
      });
    }

    res.json({
      success: true,
      data: qrCode,
    });
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
