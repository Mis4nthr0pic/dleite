const express = require('express');

const router = express.Router();

// Public landing page for consumers/admins
router.get(['/', '/home'], (req, res) => {
  if (req.session && req.session.user) {
    // Redirect logged-in users to their dashboards
    if (req.session.user.role === 'admin') return res.redirect('/admin');
    if (req.session.user.role === 'association') return res.redirect('/assoc');
  }
  res.render('home', { title: 'Home' });
});

// Public QR testing page with camera + fallback
router.get('/scan-test', (req, res) => {
  res.render('scan_test', { title: req.t('scan.title') });
});

module.exports = router;
