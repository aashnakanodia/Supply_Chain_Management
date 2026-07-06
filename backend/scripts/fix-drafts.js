require('dotenv').config();
const db = require('../src/config/database');

db.query(
  "UPDATE purchase_orders SET status = $1 WHERE status = $2 RETURNING po_number, status",
  ['pending', 'draft']
).then(r => {
  console.log('Updated', r.rowCount, 'POs to pending:', r.rows.map(r => r.po_number));
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
