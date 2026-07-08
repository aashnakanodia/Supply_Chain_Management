require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Company: NovaMart Distribution Pvt. Ltd.
// A consumer electronics distributor supplying retail stores across India.
// All monetary values in Indian Rupees (INR).

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Wipe existing data ─────────────────────────────────────────────────────
    await client.query(`
      TRUNCATE chat_messages, chat_sessions, audit_logs, alerts,
               shipments, purchase_order_items, purchase_orders,
               stock_movements, supplier_products, inventory_items,
               products, users, suppliers, warehouses
      RESTART IDENTITY CASCADE
    `);
    console.log('Cleared existing data...');

    // ── Warehouses ─────────────────────────────────────────────────────────────
    const { rows: [whDEL] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Delhi NCR Warehouse',
              'Plot 22, Udyog Vihar Phase IV, Sector 18',
              'Gurugram', 'India', 50000)
      RETURNING id
    `);
    const { rows: [whMUM] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Mumbai Fulfilment Center',
              'Unit 8, Bhiwandi Logistics Park, NH-48',
              'Mumbai', 'India', 60000)
      RETURNING id
    `);
    const { rows: [whHYD] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Hyderabad Distribution Hub',
              'Survey No. 41, IDA Jeedimetla, Phase III',
              'Hyderabad', 'India', 40000)
      RETURNING id
    `);
    const wh = { del: whDEL.id, mum: whMUM.id, hyd: whHYD.id };
    console.log('Warehouses created...');

    // ── Suppliers ──────────────────────────────────────────────────────────────
    const { rows: [supSamsung] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Samsung India Electronics Pvt. Ltd.',
              'Arjun Malhotra', 'a.malhotra@samsung-india.com', '+91-124-488-8800',
              '6th Floor, DLF Centre, Sansad Marg',
              'New Delhi', 'India', 'Net 30', 7)
      RETURNING id
    `);
    const { rows: [supApple] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Apple India Pvt. Ltd.',
              'Meera Iyer', 'm.iyer@apple-india.com', '+91-80-6660-9999',
              '19th Floor, Vittal Mallya Road, UB City',
              'Bengaluru', 'India', 'Advance Payment', 10)
      RETURNING id
    `);
    const { rows: [supBoat] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Imagine Marketing Ltd. (boAt)',
              'Rohit Sharma', 'r.sharma@boat-lifestyle.com', '+91-11-4560-7890',
              'B-85, Sector 4, Noida Industrial Area',
              'Noida', 'India', 'Net 15', 5)
      RETURNING id
    `);
    const { rows: [supAnker] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Anker Innovations India Pvt. Ltd.',
              'Priya Menon', 'p.menon@anker.com', '+91-22-6789-4567',
              'Level 4, One BKC, Bandra Kurla Complex',
              'Mumbai', 'India', 'Net 30', 7)
      RETURNING id
    `);
    const sup = {
      samsung: supSamsung.id,
      apple:   supApple.id,
      boat:    supBoat.id,
      anker:   supAnker.id,
    };
    console.log('Suppliers created...');

    // ── Users ──────────────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hash(pw, 12);

    const { rows: [uAdmin] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Priya', 'Sharma', 'admin') RETURNING id
    `, ['p.sharma@novamart.in', await hash('PSharma@Nova26')]);

    const { rows: [uProcure] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Rahul', 'Gupta', 'procurement_manager') RETURNING id
    `, ['r.gupta@novamart.in', await hash('RGupta@Nova26')]);

    const { rows: [uStaffDEL] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Deepak', 'Kumar', 'warehouse_staff', $3) RETURNING id
    `, ['d.kumar@novamart.in', await hash('DKumar@Nova26'), wh.del]);

    const { rows: [uStaffMUM] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Sneha', 'Patel', 'warehouse_staff', $3) RETURNING id
    `, ['s.patel@novamart.in', await hash('SPatel@Nova26'), wh.mum]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Arjun', 'Malhotra', 'supplier', $3)
    `, ['a.malhotra@samsung-india.com', await hash('AMalhotra@Samsung26'), sup.samsung]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Rohit', 'Sharma', 'supplier', $3)
    `, ['r.sharma@boat-lifestyle.com', await hash('RSharma@Boat26'), sup.boat]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Ritu', 'Agarwal', 'viewer')
    `, ['r.agarwal@novamart.in', await hash('RAgarwal@Nova26')]);

    const u = {
      admin:    uAdmin.id,
      procure:  uProcure.id,
      staffDEL: uStaffDEL.id,
      staffMUM: uStaffMUM.id,
    };

    console.log('Users created...');

    // ── Products ───────────────────────────────────────────────────────────────
    const productDefs = [
      { sku: 'PHONE-IPH15-128',   name: 'Apple iPhone 15 128GB Midnight',        category: 'Smartphones',    unit: 'piece', unit_price: 79900,  reorder_level: 50,  lead_time_days: 10 },
      { sku: 'PHONE-IPH15-256',   name: 'Apple iPhone 15 256GB Pink',            category: 'Smartphones',    unit: 'piece', unit_price: 89900,  reorder_level: 30,  lead_time_days: 10 },
      { sku: 'PHONE-SGS24-256',   name: 'Samsung Galaxy S24 256GB Onyx Black',   category: 'Smartphones',    unit: 'piece', unit_price: 74999,  reorder_level: 50,  lead_time_days: 7  },
      { sku: 'PHONE-SGA54-128',   name: 'Samsung Galaxy A54 128GB Awesome Navy', category: 'Smartphones',    unit: 'piece', unit_price: 38999,  reorder_level: 80,  lead_time_days: 7  },
      { sku: 'PHONE-OP12-256',    name: 'OnePlus 12 256GB Silky Black',           category: 'Smartphones',    unit: 'piece', unit_price: 64999,  reorder_level: 40,  lead_time_days: 7  },
      { sku: 'LAPTOP-MBA-M2-256', name: 'Apple MacBook Air M2 256GB Space Grey', category: 'Laptops',        unit: 'piece', unit_price: 114900, reorder_level: 20,  lead_time_days: 14 },
      { sku: 'LAPTOP-DELL-I5',    name: 'Dell Inspiron 15 Intel i5 512GB',       category: 'Laptops',        unit: 'piece', unit_price: 62990,  reorder_level: 20,  lead_time_days: 10 },
      { sku: 'TV-SAM-55-4K',      name: 'Samsung 55" Crystal 4K UHD Smart TV',   category: 'Televisions',    unit: 'piece', unit_price: 54990,  reorder_level: 15,  lead_time_days: 7  },
      { sku: 'AUDIO-BOAT-141',    name: 'boAt Airdopes 141 TWS Earbuds',         category: 'Audio',          unit: 'piece', unit_price: 1299,   reorder_level: 200, lead_time_days: 5  },
      { sku: 'AUDIO-BOAT-R450',   name: 'boAt Rockerz 450 Wireless Headphones',  category: 'Audio',          unit: 'piece', unit_price: 1799,   reorder_level: 150, lead_time_days: 5  },
      { sku: 'AUDIO-SONY-XM5',    name: 'Sony WH-1000XM5 Noise Cancelling',      category: 'Audio',          unit: 'piece', unit_price: 29990,  reorder_level: 20,  lead_time_days: 10 },
      { sku: 'ACC-ANKER-65W',     name: 'Anker 65W GaN USB-C Charger',           category: 'Accessories',    unit: 'piece', unit_price: 2999,   reorder_level: 100, lead_time_days: 7  },
      { sku: 'ACC-ANKER-PB20K',   name: 'Anker PowerCore 20000mAh Power Bank',   category: 'Accessories',    unit: 'piece', unit_price: 3499,   reorder_level: 100, lead_time_days: 7  },
      { sku: 'ACC-CABLE-USBC2M',  name: 'Anker USB-C to USB-C Cable 2m 100W',    category: 'Accessories',    unit: 'piece', unit_price: 899,    reorder_level: 200, lead_time_days: 7  },
      { sku: 'ACC-CASE-IPH15',    name: 'Apple iPhone 15 Silicone Case Black',   category: 'Accessories',    unit: 'piece', unit_price: 3900,   reorder_level: 100, lead_time_days: 10 },
    ];

    const pid = {};
    for (const p of productDefs) {
      const { rows } = await client.query(`
        INSERT INTO products (sku, name, category, unit, unit_price, reorder_level, lead_time_days)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [p.sku, p.name, p.category, p.unit, p.unit_price, p.reorder_level, p.lead_time_days]);
      pid[p.sku] = rows[0].id;
    }
    console.log('Products created...');

    // ── Supplier Products ──────────────────────────────────────────────────────
    // Samsung India
    for (const [sku, price, moq, ltd] of [
      ['PHONE-SGS24-256',  62000, 10,  7],
      ['PHONE-SGA54-128',  31000, 20,  7],
      ['TV-SAM-55-4K',     42000, 5,   7],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.samsung, pid[sku], price, ltd, moq]);
    }

    // Apple India
    for (const [sku, price, moq, ltd] of [
      ['PHONE-IPH15-128',   72000, 5,  10],
      ['PHONE-IPH15-256',   81000, 5,  10],
      ['LAPTOP-MBA-M2-256', 105000, 3, 14],
      ['ACC-CASE-IPH15',    3200,  20, 10],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.apple, pid[sku], price, ltd, moq]);
    }

    // boAt
    for (const [sku, price, moq, ltd] of [
      ['AUDIO-BOAT-141',  850,  100, 5],
      ['AUDIO-BOAT-R450', 1200, 50,  5],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.boat, pid[sku], price, ltd, moq]);
    }

    // Anker India
    for (const [sku, price, moq, ltd] of [
      ['ACC-ANKER-65W',   2200, 50,  7],
      ['ACC-ANKER-PB20K', 2600, 50,  7],
      ['ACC-CABLE-USBC2M', 600, 100, 7],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.anker, pid[sku], price, ltd, moq]);
    }
    console.log('Supplier products created...');

    // ── Purchase Orders ────────────────────────────────────────────────────────
    //
    // Full pipeline snapshot (one PO at every stage):
    //   PO-001  received   → iPhone 15 batch delivered to Delhi. Stock updated.
    //   PO-002  ordered    → Samsung 55" TVs shipped, in transit to Mumbai.
    //   PO-003  approved   → boAt earbuds approved. Procurement can now create shipment.
    //   PO-004  pending    → Samsung Galaxy S24 restock. Awaiting admin approval.
    //   PO-005  pending    → Anker accessories restock. Awaiting admin approval.
    //   PO-006  cancelled  → MacBook Air order cancelled due to Q3 budget cut.

    // PO-001: RECEIVED — 100 iPhone 15 128GB from Apple India, Delhi
    const { rows: [po1] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0001', $1, $2, 'received', 7200000.00, $3, $4,
              'Diwali season restock — 100 units iPhone 15 128GB for Delhi NCR region. All units received and QC passed.',
              '2026-06-15', '2026-06-25')
      RETURNING id
    `, [sup.apple, wh.del, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 100, 72000.00, 100)
    `, [po1.id, pid['PHONE-IPH15-128']]);

    // PO-002: ORDERED — 30 Samsung 55" TVs from Samsung India, Mumbai
    const { rows: [po2] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0002', $1, $2, 'ordered', 1260000.00, $3, $4,
              'Q3 TV restock for Mumbai region retail partners. Shipment dispatched from Samsung warehouse, Noida.',
              '2026-06-20', '2026-07-10')
      RETURNING id
    `, [sup.samsung, wh.mum, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 30, 42000.00, 0)
    `, [po2.id, pid['TV-SAM-55-4K']]);

    // PO-003: APPROVED — 500 boAt Airdopes 141 from boAt, Hyderabad
    const { rows: [po3] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0003', $1, $2, 'approved', 425000.00, $3, $4,
              'boAt earbuds are a fast-moving item in Hyderabad. Approved — procurement team to create shipment now.',
              '2026-06-28', '2026-07-05')
      RETURNING id
    `, [sup.boat, wh.hyd, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 500, 850.00, 0)
    `, [po3.id, pid['AUDIO-BOAT-141']]);

    // PO-004: PENDING — 50 Samsung Galaxy S24 from Samsung India, Delhi
    const { rows: [po4] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0004', $1, $2, 'pending', 3100000.00, $3,
              'Delhi stock of Galaxy S24 is below reorder level. Urgent — Samsung is offering a 2% early order discount valid until 15-Jul-2026.',
              '2026-07-01', '2026-07-10')
      RETURNING id
    `, [sup.samsung, wh.del, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 50, 62000.00, 0)
    `, [po4.id, pid['PHONE-SGS24-256']]);

    // PO-005: PENDING — Anker accessories restock, Mumbai
    const { rows: [po5] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0005', $1, $2, 'pending', 540000.00, $3,
              'Anker 65W chargers and power banks running low in Mumbai. High attach-rate with phone sales. Please approve.',
              '2026-07-02', '2026-07-12')
      RETURNING id
    `, [sup.anker, wh.mum, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 100, 2200.00, 0), ($1, $3, 100, 2600.00, 0)
    `, [po5.id, pid['ACC-ANKER-65W'], pid['ACC-ANKER-PB20K']]);

    // PO-006: CANCELLED — MacBook Air from Apple India, Delhi
    const { rows: [po6] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date)
      VALUES ('PO-2026-0006', $1, $2, 'cancelled', 1050000.00, $3,
              'Cancelled — Q3 laptop budget reallocated to smartphone inventory. Will reconsider in Q4.',
              '2026-06-25')
      RETURNING id
    `, [sup.apple, wh.del, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 10, 105000.00, 0)
    `, [po6.id, pid['LAPTOP-MBA-M2-256']]);

    console.log('Purchase orders created...');

    // ── Shipments ──────────────────────────────────────────────────────────────
    //
    // SHP-001: DELIVERED → PO-001 (Apple iPhones → Delhi). Stock already updated.
    // SHP-002: IN_TRANSIT → PO-002 (Samsung TVs → Mumbai). Expected 10-Jul.

    const { rows: [shp1] } = await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, actual_arrival, notes)
      VALUES ('SHP-2026-0001', $1, $2, 'delivered',
              'Blue Dart Express', 'BD-APL-9988123-DEL',
              '2026-06-16', '2026-06-25', '2026-06-24',
              'Delivered one day early. All 100 iPhone 15 units received and counted. IMEI verification complete.')
      RETURNING id
    `, [po1.id, wh.del]);

    await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, notes)
      VALUES ('SHP-2026-0002', $1, $2, 'in_transit',
              'DTDC Courier & Cargo', 'DTDC-SAM-TV-44219-MUM',
              '2026-06-22', '2026-07-10',
              'Dispatched from Samsung Noida warehouse. 30 units of 55" TVs in 30 individual cartons. Handle with care.')
    `, [po2.id, wh.mum]);

    console.log('Shipments created...');

    // ── Inventory ──────────────────────────────────────────────────────────────
    const inventoryData = [
      // Delhi NCR Warehouse
      { wh: wh.del, sku: 'PHONE-IPH15-128',   qty: 112,  rp: 50  }, // boosted by SHP-001
      { wh: wh.del, sku: 'PHONE-IPH15-256',   qty: 28,   rp: 30  }, // LOW — near reorder
      { wh: wh.del, sku: 'PHONE-SGS24-256',   qty: 18,   rp: 50  }, // CRITICAL — PO-004 pending
      { wh: wh.del, sku: 'PHONE-SGA54-128',   qty: 95,   rp: 80  },
      { wh: wh.del, sku: 'PHONE-OP12-256',    qty: 44,   rp: 40  },
      { wh: wh.del, sku: 'LAPTOP-MBA-M2-256', qty: 22,   rp: 20  },
      { wh: wh.del, sku: 'LAPTOP-DELL-I5',    qty: 31,   rp: 20  },
      { wh: wh.del, sku: 'AUDIO-BOAT-141',    qty: 310,  rp: 200 },
      { wh: wh.del, sku: 'AUDIO-SONY-XM5',    qty: 14,   rp: 20  }, // LOW
      { wh: wh.del, sku: 'ACC-ANKER-65W',     qty: 88,   rp: 100 }, // LOW
      { wh: wh.del, sku: 'ACC-ANKER-PB20K',   qty: 74,   rp: 100 }, // LOW
      { wh: wh.del, sku: 'ACC-CABLE-USBC2M',  qty: 245,  rp: 200 },
      { wh: wh.del, sku: 'ACC-CASE-IPH15',    qty: 180,  rp: 100 },

      // Mumbai Fulfilment Center
      { wh: wh.mum, sku: 'PHONE-IPH15-128',   qty: 68,   rp: 50  },
      { wh: wh.mum, sku: 'PHONE-IPH15-256',   qty: 45,   rp: 30  },
      { wh: wh.mum, sku: 'PHONE-SGS24-256',   qty: 62,   rp: 50  },
      { wh: wh.mum, sku: 'PHONE-SGA54-128',   qty: 110,  rp: 80  },
      { wh: wh.mum, sku: 'TV-SAM-55-4K',      qty: 8,    rp: 15  }, // LOW — SHP-002 in transit
      { wh: wh.mum, sku: 'AUDIO-BOAT-141',    qty: 420,  rp: 200 },
      { wh: wh.mum, sku: 'AUDIO-BOAT-R450',   qty: 195,  rp: 150 },
      { wh: wh.mum, sku: 'ACC-ANKER-65W',     qty: 92,   rp: 100 }, // LOW — PO-005 pending
      { wh: wh.mum, sku: 'ACC-ANKER-PB20K',   qty: 85,   rp: 100 }, // LOW — PO-005 pending
      { wh: wh.mum, sku: 'ACC-CABLE-USBC2M',  qty: 380,  rp: 200 },
      { wh: wh.mum, sku: 'ACC-CASE-IPH15',    qty: 210,  rp: 100 },

      // Hyderabad Distribution Hub
      { wh: wh.hyd, sku: 'PHONE-IPH15-128',   qty: 55,   rp: 50  },
      { wh: wh.hyd, sku: 'PHONE-SGS24-256',   qty: 70,   rp: 50  },
      { wh: wh.hyd, sku: 'PHONE-SGA54-128',   qty: 130,  rp: 80  },
      { wh: wh.hyd, sku: 'PHONE-OP12-256',    qty: 48,   rp: 40  },
      { wh: wh.hyd, sku: 'AUDIO-BOAT-141',    qty: 95,   rp: 200 }, // CRITICAL — PO-003 approved, needs shipment
      { wh: wh.hyd, sku: 'AUDIO-BOAT-R450',   qty: 88,   rp: 150 }, // LOW
      { wh: wh.hyd, sku: 'AUDIO-SONY-XM5',    qty: 26,   rp: 20  },
      { wh: wh.hyd, sku: 'ACC-ANKER-65W',     qty: 145,  rp: 100 },
      { wh: wh.hyd, sku: 'ACC-CABLE-USBC2M',  qty: 290,  rp: 200 },
    ];

    const invId = {};
    for (const row of inventoryData) {
      const { rows } = await client.query(`
        INSERT INTO inventory_items (warehouse_id, product_id, quantity, reorder_point)
        VALUES ($1,$2,$3,$4) RETURNING id
      `, [row.wh, pid[row.sku], row.qty, row.rp]);
      invId[`${row.wh}_${row.sku}`] = rows[0].id;
    }
    console.log('Inventory created...');

    // ── Stock Movements ────────────────────────────────────────────────────────

    // SHP-001 delivered — 100 iPhone 15 128GB into Delhi
    const iph15DEL = invId[`${wh.del}_PHONE-IPH15-128`];
    if (iph15DEL) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, reference_id, notes, created_by)
        VALUES ($1,$2,$3,'IN',100,'shipment',$4,
                'Received via SHP-2026-0001 — Blue Dart BD-APL-9988123-DEL. All 100 units verified.',$5)
      `, [iph15DEL, wh.del, pid['PHONE-IPH15-128'], shp1.id, u.staffDEL]);
    }

    // Sales dispatch — 32 Samsung Galaxy S24 sold from Delhi store
    const sgs24DEL = invId[`${wh.del}_PHONE-SGS24-256`];
    if (sgs24DEL) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, notes, created_by)
        VALUES ($1,$2,$3,'OUT',32,'manual',
                'Sales dispatch to Delhi retail partners — Week 26 batch',$4)
      `, [sgs24DEL, wh.del, pid['PHONE-SGS24-256'], u.staffDEL]);
    }

    // Sales dispatch — 105 boAt earbuds sold from Hyderabad
    const boat141HYD = invId[`${wh.hyd}_AUDIO-BOAT-141`];
    if (boat141HYD) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, notes, created_by)
        VALUES ($1,$2,$3,'OUT',105,'manual',
                'Sales dispatch to Hyderabad retail partners — high demand post sale event',$4)
      `, [boat141HYD, wh.hyd, pid['AUDIO-BOAT-141'], u.staffDEL]);
    }

    console.log('Stock movements created...');

    // ── Alerts ─────────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
      VALUES
        ('low_stock', 'critical',
         'boAt Airdopes 141 near stockout — Hyderabad Hub',
         'Current stock: 95 units against reorder point of 200. PO-2026-0003 (₹4.25L) is already approved — create a shipment now to advance it to ordered and unblock restocking.',
         $1, $2),

        ('low_stock', 'critical',
         'Samsung Galaxy S24 critically low — Delhi NCR',
         'Current stock: 18 units against reorder point of 50. PO-2026-0004 (₹31L) is awaiting admin approval. Samsung early-order discount expires 15-Jul-2026.',
         $3, $4),

        ('low_stock', 'high',
         'Samsung 55" Smart TV low — Mumbai Fulfilment',
         'Current stock: 8 units against reorder point of 15. SHP-2026-0002 carrying 30 units is in transit via DTDC, expected 10-Jul-2026. Monitor for delays.',
         $5, $6),

        ('low_stock', 'high',
         'Anker 65W Charger below reorder point — Mumbai',
         'Current stock: 92 units against reorder point of 100. PO-2026-0005 (₹5.4L) is pending admin approval. High attach-rate with phone sales — approve urgently.',
         $5, $7),

        ('low_stock', 'medium',
         'Apple iPhone 15 256GB running low — Delhi NCR',
         'Current stock: 28 units against reorder point of 30. Consider raising a new purchase order from Apple India before stock drops further.',
         $3, $8),

        ('delayed_shipment', 'low',
         'SHP-2026-0002 — Monitor Samsung TV Shipment',
         'DTDC shipment DTDC-SAM-TV-44219-MUM from Samsung Noida is expected 10-Jul-2026. Track for any transit delays — 30 TVs for Mumbai retail partners are pending this delivery.',
         $5, NULL)
    `, [
      wh.hyd, pid['AUDIO-BOAT-141'],
      wh.del, pid['PHONE-SGS24-256'],
      wh.mum, pid['TV-SAM-55-4K'],
      pid['ACC-ANKER-65W'],
      pid['PHONE-IPH15-256'],
    ]);

    console.log('Alerts created...');

    await client.query('COMMIT');

    console.log('\n✅ Seed complete — NovaMart Distribution Pvt. Ltd.\n');
    console.log('Login accounts:');
    console.log('  p.sharma@novamart.in            / PSharma@Nova26        (admin)');
    console.log('  r.gupta@novamart.in             / RGupta@Nova26         (procurement_manager)');
    console.log('  d.kumar@novamart.in             / DKumar@Nova26         (warehouse_staff → Delhi)');
    console.log('  s.patel@novamart.in             / SPatel@Nova26         (warehouse_staff → Mumbai)');
    console.log('  a.malhotra@samsung-india.com    / AMalhotra@Samsung26   (supplier → Samsung India)');
    console.log('  r.sharma@boat-lifestyle.com     / RSharma@Boat26        (supplier → boAt)');
    console.log('  r.agarwal@novamart.in           / RAgarwal@Nova26       (viewer)');
    console.log('\nFull flow walkthrough:');
    console.log('  1. Log in as admin (p.sharma@novamart.in)');
    console.log('  2. Approve PO-2026-0004 (Galaxy S24) and PO-2026-0005 (Anker accessories)');
    console.log('  3. Log in as procurement (r.gupta@novamart.in)');
    console.log('  4. Create a shipment for PO-2026-0003 (boAt earbuds) — advances PO to ordered');
    console.log('  5. Mark SHP-2026-0002 (Samsung TVs) as delivered — stock auto-updates');
    console.log('  6. Check dashboard for live KPIs and alerts');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
