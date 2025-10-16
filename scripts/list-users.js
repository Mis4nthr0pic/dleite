const { connect, all } = require('../src/db');

(async () => {
  const db = connect();
  try {
    const users = await all(db, `SELECT u.id, u.name, u.email, u.role, a.neighborhood_name AS association
                                  FROM users u LEFT JOIN associations a ON u.association_id = a.id
                                  ORDER BY u.role DESC, u.id ASC`);
    console.log('\nUsers:');
    users.forEach(u => {
      console.log(`- [${u.id}] ${u.name} <${u.email}> role=${u.role}${u.association ? ' assoc='+u.association : ''}`);
    });
    console.log('\nTip: login with admin@example.com / admin123 or assoc@example.com / assoc123');
  } catch (e) {
    console.error('Error listing users:', e);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();

