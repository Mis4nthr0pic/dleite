const express = require('express');
const AuthService = require('../services/AuthService');
const { UnauthorizedError } = require('../utils/errors');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { title: req.t('login.title') });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await AuthService.login(email, password);
    req.session.user = AuthService.createSessionUser(user);

    if (user.role === 'admin') {
      return res.redirect('/admin');
    }
    if (user.role === 'association') {
      return res.redirect('/assoc');
    }
    return res.redirect('/');
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).render('login', {
        title: req.t('login.title'),
        error: req.t('login.invalid'),
      });
    }
    console.error('Error during login:', error);
    res.status(500).render('login', {
      title: req.t('login.title'),
      error: 'An error occurred during login',
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
