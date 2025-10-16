const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextFsBackend = require('i18next-fs-backend');

const { migrateAndSeed, DB_PATH } = require('./db');

// Ensure data folder exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// i18n setup
i18next
  .use(i18nextFsBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'pt',
    preload: ['pt', 'en'],
    backend: { loadPath: path.join(__dirname, 'locales', '{{lng}}.json') },
    detection: {
      // Default to Portuguese unless user explicitly chooses via ?lng= or stored cookie
      order: ['querystring', 'cookie'],
      caches: ['cookie'],
      cookieSecure: false
    },
    interpolation: { escapeValue: false },
  });

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(i18nextMiddleware.handle(i18next));

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
    secret: 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 },
  })
);

// Locals for templates
app.use((req, res, next) => {
  res.locals.t = req.t;
  res.locals.user = req.session.user || null;
  res.locals.lng = req.language || 'en';
  res.locals.currentPath = req.path || '/';
  res.locals.isAdmin = !!(req.session.user && req.session.user.role === 'admin');
  res.locals.isAssoc = !!(req.session.user && req.session.user.role === 'association');
  res.locals.bodyClass = req.path && req.path.startsWith('/admin') ? 'admin' : '';
  // Toasts (flash messages)
  res.locals.toast = req.session.toast || null;
  if (req.session) req.session.toast = null;
  next();
});

// Routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const assocRoutes = require('./routes/assoc');
const scanRoutes = require('./routes/scan');
const nftApiRoutes = require('./routes/nft-api');

app.use(publicRoutes);
app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use('/assoc', assocRoutes);
app.use('/scan', scanRoutes);
app.use('/api/nft', nftApiRoutes);

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role === 'admin') return res.redirect('/admin');
  if (req.session.user.role === 'association') return res.redirect('/assoc');
  res.redirect('/login');
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

const port = process.env.PORT || 3000;

migrateAndSeed()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`DB at ${DB_PATH}`);
    });
  })
  .catch((err) => {
    console.error('Failed to migrate/seed DB', err);
    process.exit(1);
  });
