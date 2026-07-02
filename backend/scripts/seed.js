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

// All monetary values in Indian Rupees (INR)

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
    const { rows: [whBLR] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Bengaluru Assembly Plant',
              'Plot 14-B, Electronics City Phase 1, Hosur Road',
              'Bengaluru', 'India', 80000)
      RETURNING id
    `);
    const { rows: [whPNQ] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Pune Manufacturing Facility',
              'Gat No. 152, MIDC Industrial Area, Pimpri-Chinchwad',
              'Pune', 'India', 65000)
      RETURNING id
    `);
    const { rows: [whCHN] } = await client.query(`
      INSERT INTO warehouses (name, address, city, country, capacity)
      VALUES ('Chennai Distribution Hub',
              'No. 7, SIPCOT IT Park Phase II, Siruseri',
              'Chennai', 'India', 50000)
      RETURNING id
    `);
    const wh = { blr: whBLR.id, pnq: whPNQ.id, chn: whCHN.id };
    console.log('Warehouses created...');

    // ── Suppliers ──────────────────────────────────────────────────────────────
    const { rows: [supMouser] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Mouser Electronics India Pvt. Ltd.',
              'Vikram Mehta', 'v.mehta@mouser-india.com', '+91-80-4567-8901',
              '3rd Floor, Prestige Tech Park, Outer Ring Road, Devarabeesanahalli',
              'Bengaluru', 'India', 'Advance Payment', 7)
      RETURNING id
    `);
    const { rows: [supElectro] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Electrocomponents India Pvt. Ltd.',
              'Deepa Nair', 'd.nair@electrocomponents.in', '+91-22-6789-0123',
              'Unit 5B, Peninsula Business Park, Senapati Bapat Marg, Lower Parel',
              'Mumbai', 'India', 'Net 30', 10)
      RETURNING id
    `);
    const { rows: [supSuntech] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('SunTech PCB Solutions Pvt. Ltd.',
              'Harish Gupta', 'h.gupta@suntechpcb.in', '+91-120-4567-8900',
              'B-47, Sector 63, NOIDA Industrial Development Area',
              'Noida', 'India', 'Net 45', 21)
      RETURNING id
    `);
    const { rows: [supAmara] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES ('Amara Raja Power Systems Ltd.',
              'Srinivas Reddy', 's.reddy@amararaja.in', '+91-877-234-5678',
              'Survey No. 93, Karakambadi Road, Renigunta',
              'Tirupati', 'India', 'Net 30', 14)
      RETURNING id
    `);
    const sup = {
      mouser:  supMouser.id,
      electro: supElectro.id,
      suntech: supSuntech.id,
      amara:   supAmara.id,
    };
    console.log('Suppliers created...');

    // ── Users ──────────────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hash(pw, 12);

    const { rows: [uAdmin] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Rajesh', 'Iyer', 'admin') RETURNING id
    `, ['r.iyer@techvolt.in', await hash('RIyer@TechVolt26')]);

    const { rows: [uProcure] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Ananya', 'Krishnamurthy', 'procurement_manager') RETURNING id
    `, ['a.krishnamurthy@techvolt.in', await hash('AKrishna@TechVolt26')]);

    const { rows: [uStaffBLR] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Suresh', 'Babu', 'warehouse_staff', $3) RETURNING id
    `, ['s.babu@techvolt.in', await hash('SBabu@TechVolt26'), wh.blr]);

    const { rows: [uStaffPNQ] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Pooja', 'Deshmukh', 'warehouse_staff', $3) RETURNING id
    `, ['p.deshmukh@techvolt.in', await hash('PDeshmukh@TechVolt26'), wh.pnq]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Vikram', 'Mehta', 'supplier', $3) RETURNING id
    `, ['v.mehta@mouser-india.com', await hash('VMehta@Mouser26'), sup.mouser]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Deepa', 'Nair', 'supplier', $3) RETURNING id
    `, ['d.nair@electrocomponents.in', await hash('DNair@Electro26'), sup.electro]);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Karthik', 'Sundaram', 'viewer')
    `, ['k.sundaram@techvolt.in', await hash('KSundaram@TechVolt26')]);

    const u = {
      admin:    uAdmin.id,
      procure:  uProcure.id,
      staffBLR: uStaffBLR.id,
      staffPNQ: uStaffPNQ.id,
    };

    await client.query(`UPDATE warehouses SET manager_id = $1 WHERE id = $2`, [u.staffBLR, wh.blr]);
    await client.query(`UPDATE warehouses SET manager_id = $1 WHERE id = $2`, [u.staffPNQ, wh.pnq]);
    console.log('Users created...');

    // ── Products (prices in INR) ───────────────────────────────────────────────
    const productDefs = [
      { sku: 'MCU-ESP32-WROOM32',    name: 'ESP32-WROOM-32D WiFi+BT Module',        category: 'Microcontrollers',   unit: 'piece', unit_price: 245.00,  reorder_level: 500,   lead_time_days: 14 },
      { sku: 'MCU-STM32F103C8T6',    name: 'STM32F103C8T6 ARM Cortex-M3 MCU',       category: 'Microcontrollers',   unit: 'piece', unit_price: 105.00,  reorder_level: 1000,  lead_time_days: 10 },
      { sku: 'CAP-ELEC-10UF-50V',    name: '10µF 50V Electrolytic Capacitor',        category: 'Passive Components', unit: 'piece', unit_price: 6.50,    reorder_level: 5000,  lead_time_days: 21 },
      { sku: 'CAP-MLCC-100NF-50V',   name: '100nF 50V MLCC Capacitor 0402',          category: 'Passive Components', unit: 'piece', unit_price: 1.50,    reorder_level: 10000, lead_time_days: 21 },
      { sku: 'RES-10K-0402-1PCT',    name: '10kΩ 1% 0.1W Resistor 0402',            category: 'Passive Components', unit: 'piece', unit_price: 0.80,    reorder_level: 10000, lead_time_days: 21 },
      { sku: 'SEMI-IRLZ44N-MOSFET',  name: 'IRLZ44N N-Channel Power MOSFET TO-220', category: 'Semiconductors',     unit: 'piece', unit_price: 58.00,   reorder_level: 2000,  lead_time_days: 10 },
      { sku: 'REG-AMS1117-33',        name: 'AMS1117-3.3V LDO Voltage Regulator',    category: 'Semiconductors',     unit: 'piece', unit_price: 16.00,   reorder_level: 3000,  lead_time_days: 10 },
      { sku: 'DISP-TFT-7IN-800X480', name: '7" TFT LCD Display 800×480 RGB',         category: 'Displays',           unit: 'piece', unit_price: 1550.00, reorder_level: 100,   lead_time_days: 28 },
      { sku: 'DISP-OLED-096-128X64', name: '0.96" OLED Display 128×64 I2C',          category: 'Displays',           unit: 'piece', unit_price: 265.00,  reorder_level: 500,   lead_time_days: 21 },
      { sku: 'BAT-LIPO-3000MAH',     name: '3.7V 3000mAh Li-Po Battery Pack',        category: 'Power',              unit: 'piece', unit_price: 420.00,  reorder_level: 300,   lead_time_days: 21 },
      { sku: 'PWR-ADAPTER-12V2A',    name: '12V 2A DC Power Adapter with ISI Mark',  category: 'Power',              unit: 'piece', unit_price: 545.00,  reorder_level: 200,   lead_time_days: 14 },
      { sku: 'CONN-USBC-SMD-16PIN',  name: 'USB Type-C Receptacle SMD 16-Pin',       category: 'Connectors',         unit: 'piece', unit_price: 38.00,   reorder_level: 2000,  lead_time_days: 21 },
      { sku: 'CONN-HDR-40M-254MM',   name: '40-Pin 2.54mm Male Pin Header',           category: 'Connectors',         unit: 'piece', unit_price: 12.00,   reorder_level: 3000,  lead_time_days: 21 },
      { sku: 'PCB-FR4-100X80-2L',    name: 'FR4 PCB 100×80mm 2-Layer 1.6mm',         category: 'PCBs',               unit: 'piece', unit_price: 95.00,   reorder_level: 500,   lead_time_days: 21 },
      { sku: 'SOLD-LFREE-08MM-250G', name: 'Lead-Free Solder Wire 0.8mm 250g Reel',  category: 'Consumables',        unit: 'reel',  unit_price: 980.00,  reorder_level: 50,    lead_time_days: 7  },
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

    // ── Supplier Products (prices in INR) ─────────────────────────────────────
    // Mouser India — MCU modules, displays, batteries
    for (const [sku, price, moq, ltd] of [
      ['MCU-ESP32-WROOM32',    188.00,  100, 7 ],
      ['MCU-STM32F103C8T6',    78.00,   500, 7 ],
      ['DISP-TFT-7IN-800X480', 1100.00, 50,  14],
      ['DISP-OLED-096-128X64', 175.00,  200, 14],
      ['BAT-LIPO-3000MAH',     285.00,  100, 21],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.mouser, pid[sku], price, ltd, moq]);
    }

    // Electrocomponents India — semiconductors, passives, connectors
    for (const [sku, price, moq, ltd] of [
      ['SEMI-IRLZ44N-MOSFET', 42.00, 500,   10],
      ['REG-AMS1117-33',       11.50, 1000,  10],
      ['CAP-ELEC-10UF-50V',   4.20,  5000,  10],
      ['CONN-USBC-SMD-16PIN',  26.00, 1000,  10],
      ['CONN-HDR-40M-254MM',   8.00,  2000,  7 ],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.electro, pid[sku], price, ltd, moq]);
    }

    // SunTech PCB — PCBs + passives
    for (const [sku, price, moq, ltd] of [
      ['PCB-FR4-100X80-2L',  68.00, 200,   21],
      ['CAP-MLCC-100NF-50V', 0.90,  10000, 21],
      ['RES-10K-0402-1PCT',  0.45,  10000, 21],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.suntech, pid[sku], price, ltd, moq]);
    }

    // Amara Raja — power + consumables
    for (const [sku, price, moq, ltd] of [
      ['PWR-ADAPTER-12V2A',    395.00, 100, 14],
      ['BAT-LIPO-3000MAH',     310.00, 50,  14],
      ['SOLD-LFREE-08MM-250G', 745.00, 20,  7 ],
    ]) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
      `, [sup.amara, pid[sku], price, ltd, moq]);
    }
    console.log('Supplier products created...');

    // ── Purchase Orders (amounts in INR) ──────────────────────────────────────
    //
    // Full pipeline snapshot:
    //   received  — PO1 (Mouser → BLR, STM32 MCUs): completed via SHP-2026-0001 delivery
    //   ordered   — PO2 (Mouser → PNQ, OLED + batteries): SHP-2026-0002 in transit
    //   approved  — PO3 (SunTech → BLR, PCBs + passives): ready for shipment creation
    //   pending   — PO4 (Electrocomponents → PNQ, MOSFETs + USB-C): awaiting admin approval
    //   pending   — PO5 (Amara Raja → CHN, power adapters): awaiting admin approval
    //   cancelled — PO6 (Amara Raja → BLR, solder wire): cancelled due to budget freeze

    // PO-2026-0001: RECEIVED — 2,000 STM32 MCUs from Mouser, Bengaluru
    // 2000 × ₹78 = ₹1,56,000  |  received via SHP-2026-0001 (delivered)
    const { rows: [po1] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0001', $1, $2, 'received', 156000.00, $3, $4,
              'Emergency restock — Bengaluru production line critical. All 2,000 units delivered via SHP-2026-0001, QC passed.',
              '2026-06-01', '2026-06-08')
      RETURNING id
    `, [sup.mouser, wh.blr, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 2000, 78.00, 2000)
    `, [po1.id, pid['MCU-STM32F103C8T6']]);

    // PO-2026-0002: ORDERED — OLED displays + Li-Po batteries from Mouser, Pune
    // 1000 × ₹175 + 500 × ₹285 = ₹1,75,000 + ₹1,42,500 = ₹3,17,500
    // Auto-advanced from approved → ordered when SHP-2026-0002 was created
    const { rows: [po2] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0002', $1, $2, 'ordered', 317500.00, $3, $4,
              'Q2 OLED display and Li-Po battery restock for IoT-Mini V3 assembly line at Pune. GST invoice pending.',
              '2026-06-10', '2026-07-08')
      RETURNING id
    `, [sup.mouser, wh.pnq, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 1000, 175.00, 0), ($1, $3, 500, 285.00, 0)
    `, [po2.id, pid['DISP-OLED-096-128X64'], pid['BAT-LIPO-3000MAH']]);

    // PO-2026-0003: APPROVED — FR4 PCBs + passives from SunTech, Bengaluru
    // 1000 × ₹68 + 50000 × ₹0.90 + 80000 × ₹0.45 = ₹68,000 + ₹45,000 + ₹36,000 = ₹1,49,000
    // Approved — procurement manager can now create a shipment (which will auto-advance to ordered)
    const { rows: [po3] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0003', $1, $2, 'approved', 149000.00, $3, $4,
              'Monthly PCB and passive component replenishment. SunTech confirmed 21-day lead time from Noida facility.',
              '2026-06-18', '2026-07-15')
      RETURNING id
    `, [sup.suntech, wh.blr, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 1000, 68.00, 0), ($1, $3, 50000, 0.90, 0), ($1, $4, 80000, 0.45, 0)
    `, [po3.id,
        pid['PCB-FR4-100X80-2L'],
        pid['CAP-MLCC-100NF-50V'],
        pid['RES-10K-0402-1PCT']]);

    // PO-2026-0004: PENDING — MOSFETs + USB-C from Electrocomponents, Pune
    // 3000 × ₹42 + 5000 × ₹26 = ₹1,26,000 + ₹1,30,000 = ₹2,56,000
    // Awaiting admin approval — MOSFET stock is below reorder threshold
    const { rows: [po4] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0004', $1, $2, 'pending', 256000.00, $3,
              'Pune line — IRLZ44N MOSFET stock critically low. USB-C connectors also low. Requesting urgent admin approval.',
              '2026-06-22', '2026-07-20')
      RETURNING id
    `, [sup.electro, wh.pnq, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 3000, 42.00, 0), ($1, $3, 5000, 26.00, 0)
    `, [po4.id, pid['SEMI-IRLZ44N-MOSFET'], pid['CONN-USBC-SMD-16PIN']]);

    // PO-2026-0005: PENDING — Power adapters from Amara Raja, Chennai
    // 200 × ₹395 = ₹79,000
    const { rows: [po5] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0005', $1, $2, 'pending', 79000.00, $3,
              'Chennai hub Q3 power adapter planning. Amara Raja quote valid until 30-Jul-2026.',
              '2026-06-25', '2026-07-31')
      RETURNING id
    `, [sup.amara, wh.chn, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 200, 395.00, 0)
    `, [po5.id, pid['PWR-ADAPTER-12V2A']]);

    // PO-2026-0006: CANCELLED — Solder wire from Amara Raja, Bengaluru
    // 100 × ₹745 = ₹74,500 — cancelled due to Q2 budget freeze
    const { rows: [po6] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date)
      VALUES ('PO-2026-0006', $1, $2, 'cancelled', 74500.00, $3,
              'Cancelled — Q2 budget freeze. Solder wire stock not critical yet. Will raise fresh PO in Q3.',
              '2026-06-15')
      RETURNING id
    `, [sup.amara, wh.blr, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1, $2, 100, 745.00, 0)
    `, [po6.id, pid['SOLD-LFREE-08MM-250G']]);

    console.log('Purchase orders created...');

    // ── Shipments ──────────────────────────────────────────────────────────────
    //
    // SHP-2026-0001: DELIVERED → PO1 (Mouser → BLR, STM32 MCUs)
    //   Delivery triggered: PO1 marked received + BLR STM32 inventory credited
    //
    // SHP-2026-0002: IN_TRANSIT → PO2 (Mouser → PNQ, OLED + batteries)
    //   Creation triggered: PO2 auto-advanced from approved → ordered

    const { rows: [shp1] } = await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, actual_arrival, notes)
      VALUES ('SHP-2026-0001', $1, $2, 'delivered',
              'DTDC Courier & Cargo', 'DTDC-B2B-77234100',
              '2026-06-02', '2026-06-08', '2026-06-07',
              'Delivered one day ahead of schedule. All 2,000 STM32 units inspected — QC report ref: QC-BLR-2026-0247.')
      RETURNING id
    `, [po1.id, wh.blr]);

    await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, notes)
      VALUES ('SHP-2026-0002', $1, $2, 'in_transit',
              'Blue Dart Express', 'BD-9934421-MUM-PNQ',
              '2026-06-12', '2026-07-08',
              'Dispatched from Mouser Mumbai warehouse. In transit to Pune facility via Blue Dart Express cargo.')
    `, [po2.id, wh.pnq]);

    console.log('Shipments created...');

    // ── Inventory Items ────────────────────────────────────────────────────────
    //
    // BLR STM32 qty (2087) = 87 pre-PO baseline + 2,000 received via SHP-2026-0001
    // All other quantities reflect current physical stock.

    const inventoryData = [
      // Bengaluru Assembly Plant
      { wh: wh.blr, sku: 'MCU-ESP32-WROOM32',    qty: 1240,  rp: 500   },
      { wh: wh.blr, sku: 'MCU-STM32F103C8T6',    qty: 2087,  rp: 1000  }, // restocked by SHP-2026-0001
      { wh: wh.blr, sku: 'CAP-ELEC-10UF-50V',    qty: 28400, rp: 5000  },
      { wh: wh.blr, sku: 'CAP-MLCC-100NF-50V',   qty: 62000, rp: 10000 },
      { wh: wh.blr, sku: 'RES-10K-0402-1PCT',    qty: 95000, rp: 10000 },
      { wh: wh.blr, sku: 'SEMI-IRLZ44N-MOSFET',  qty: 3400,  rp: 2000  },
      { wh: wh.blr, sku: 'REG-AMS1117-33',        qty: 7200,  rp: 3000  },
      { wh: wh.blr, sku: 'DISP-TFT-7IN-800X480', qty: 210,   rp: 100   },
      { wh: wh.blr, sku: 'DISP-OLED-096-128X64', qty: 38,    rp: 500   }, // CRITICAL — no active shipment
      { wh: wh.blr, sku: 'BAT-LIPO-3000MAH',     qty: 520,   rp: 300   },
      { wh: wh.blr, sku: 'PWR-ADAPTER-12V2A',    qty: 340,   rp: 200   },
      { wh: wh.blr, sku: 'CONN-USBC-SMD-16PIN',  qty: 4800,  rp: 2000  },
      { wh: wh.blr, sku: 'CONN-HDR-40M-254MM',   qty: 6200,  rp: 3000  },
      { wh: wh.blr, sku: 'PCB-FR4-100X80-2L',    qty: 890,   rp: 500   },
      { wh: wh.blr, sku: 'SOLD-LFREE-08MM-250G', qty: 42,    rp: 50    }, // LOW — PO6 was cancelled
      // Pune Manufacturing Facility
      { wh: wh.pnq, sku: 'MCU-ESP32-WROOM32',    qty: 680,   rp: 500   },
      { wh: wh.pnq, sku: 'MCU-STM32F103C8T6',    qty: 1450,  rp: 1000  },
      { wh: wh.pnq, sku: 'CAP-ELEC-10UF-50V',    qty: 15000, rp: 5000  },
      { wh: wh.pnq, sku: 'CAP-MLCC-100NF-50V',   qty: 44000, rp: 10000 },
      { wh: wh.pnq, sku: 'RES-10K-0402-1PCT',    qty: 71000, rp: 10000 },
      { wh: wh.pnq, sku: 'SEMI-IRLZ44N-MOSFET',  qty: 1800,  rp: 2000  }, // LOW — PO4 pending
      { wh: wh.pnq, sku: 'REG-AMS1117-33',        qty: 4100,  rp: 3000  },
      { wh: wh.pnq, sku: 'DISP-TFT-7IN-800X480', qty: 95,    rp: 100   },
      { wh: wh.pnq, sku: 'DISP-OLED-096-128X64', qty: 620,   rp: 500   },
      { wh: wh.pnq, sku: 'BAT-LIPO-3000MAH',     qty: 280,   rp: 300   }, // LOW — SHP-2026-0002 in transit
      { wh: wh.pnq, sku: 'PWR-ADAPTER-12V2A',    qty: 415,   rp: 200   },
      { wh: wh.pnq, sku: 'CONN-USBC-SMD-16PIN',  qty: 3300,  rp: 2000  },
      { wh: wh.pnq, sku: 'CONN-HDR-40M-254MM',   qty: 5100,  rp: 3000  },
      { wh: wh.pnq, sku: 'PCB-FR4-100X80-2L',    qty: 420,   rp: 500   }, // LOW — PO4 pending approval
      { wh: wh.pnq, sku: 'SOLD-LFREE-08MM-250G', qty: 88,    rp: 50    },
      // Chennai Distribution Hub
      { wh: wh.chn, sku: 'MCU-ESP32-WROOM32',    qty: 920,   rp: 500   },
      { wh: wh.chn, sku: 'MCU-STM32F103C8T6',    qty: 2100,  rp: 1000  },
      { wh: wh.chn, sku: 'SEMI-IRLZ44N-MOSFET',  qty: 2600,  rp: 2000  },
      { wh: wh.chn, sku: 'REG-AMS1117-33',        qty: 5800,  rp: 3000  },
      { wh: wh.chn, sku: 'DISP-TFT-7IN-800X480', qty: 160,   rp: 100   },
      { wh: wh.chn, sku: 'PWR-ADAPTER-12V2A',    qty: 510,   rp: 200   },
      { wh: wh.chn, sku: 'CONN-USBC-SMD-16PIN',  qty: 6400,  rp: 2000  },
      { wh: wh.chn, sku: 'BAT-LIPO-3000MAH',     qty: 740,   rp: 300   },
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
    // Delivery of SHP-2026-0001 — 2,000 STM32 MCUs into Bengaluru
    const stm32BLR = invId[`${wh.blr}_MCU-STM32F103C8T6`];
    if (stm32BLR) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, reference_id, notes, created_by)
        VALUES ($1,$2,$3,'IN',2000,'shipment',$4,
                'Received via shipment SHP-2026-0001 — DTDC-B2B-77234100. QC report: QC-BLR-2026-0247.',$5)
      `, [stm32BLR, wh.blr, pid['MCU-STM32F103C8T6'], shp1.id, u.staffBLR]);
    }

    // Assembly line consumption — ESP32 modules used in production (BLR)
    const esp32BLR = invId[`${wh.blr}_MCU-ESP32-WROOM32`];
    if (esp32BLR) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, notes, created_by)
        VALUES ($1,$2,$3,'OUT',360,'manual',
                'IoT-Mini V3 production batch — Week 24/2026',$4)
      `, [esp32BLR, wh.blr, pid['MCU-ESP32-WROOM32'], u.staffBLR]);

      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, notes, created_by)
        VALUES ($1,$2,$3,'ADJUSTMENT',-15,'manual',
                'Cycle count correction — 15 units found damaged during QC inspection',$4)
      `, [esp32BLR, wh.blr, pid['MCU-ESP32-WROOM32'], u.staffBLR]);
    }

    // Power board assembly batch — MOSFET usage at Pune
    const mosfetPNQ = invId[`${wh.pnq}_SEMI-IRLZ44N-MOSFET`];
    if (mosfetPNQ) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, notes, created_by)
        VALUES ($1,$2,$3,'OUT',200,'manual',
                'Power board assembly batch PNQ-WK25-2026',$4)
      `, [mosfetPNQ, wh.pnq, pid['SEMI-IRLZ44N-MOSFET'], u.staffPNQ]);
    }

    console.log('Stock movements created...');

    // ── Alerts ─────────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
      VALUES
        ('low_stock', 'critical',
         'OLED Display (0.96") near stockout — Bengaluru Plant',
         'Current stock: 38 units against reorder point of 500. IoT-Mini V3 assembly line impacted. No active shipment exists — raise a Purchase Order immediately to restock.',
         $1, $2),

        ('low_stock', 'high',
         'Power MOSFET (IRLZ44N) below reorder point — Pune Facility',
         'Current stock: 1,800 units. Reorder point: 2,000. PO-2026-0004 (₹2,56,000) is pending admin approval — approve to unblock Pune production.',
         $3, $4),

        ('low_stock', 'high',
         'Li-Po Battery (3000mAh) running low — Pune Facility',
         'Current stock: 280 units. Reorder point: 300. SHP-2026-0002 carrying 500 units in transit via Blue Dart, expected 08-Jul-2026. Monitor closely.',
         $3, $5),

        ('low_stock', 'medium',
         'FR4 PCBs below reorder threshold — Pune Facility',
         'Current stock: 420 units. Reorder point: 500. PO-2026-0004 pending admin approval includes USB-C connectors but not PCBs — consider raising a separate PCB order.',
         $3, $6),

        ('low_stock', 'medium',
         'Lead-Free Solder Wire low — Bengaluru Plant',
         'Current stock: 42 reels. Reorder point: 50. PO-2026-0006 was cancelled due to Q2 budget freeze. Raise a replacement PO from Amara Raja for Q3.',
         $1, $7),

        ('delayed_shipment', 'low',
         'SHP-2026-0002 — Monitor Blue Dart Shipment',
         'Blue Dart shipment BD-9934421-MUM-PNQ from Mouser India expected 08-Jul-2026. Track for any customs or transit delays. Contact Blue Dart helpline: 1860-233-1234.',
         $3, NULL)
    `, [
      wh.blr, pid['DISP-OLED-096-128X64'],
      wh.pnq,
      pid['SEMI-IRLZ44N-MOSFET'],
      pid['BAT-LIPO-3000MAH'],
      pid['PCB-FR4-100X80-2L'],
      pid['SOLD-LFREE-08MM-250G'],
    ]);

    console.log('Alerts created...');

    await client.query('COMMIT');

    console.log('\n✅ Seed complete — TechVolt Electronics Pvt. Ltd.\n');
    console.log('Demo accounts:');
    console.log('  r.iyer@techvolt.in              / RIyer@TechVolt26       (admin)');
    console.log('  a.krishnamurthy@techvolt.in     / AKrishna@TechVolt26    (procurement_manager)');
    console.log('  s.babu@techvolt.in              / SBabu@TechVolt26       (warehouse_staff → Bengaluru)');
    console.log('  p.deshmukh@techvolt.in          / PDeshmukh@TechVolt26   (warehouse_staff → Pune)');
    console.log('  v.mehta@mouser-india.com        / VMehta@Mouser26        (supplier → Mouser India)');
    console.log('  d.nair@electrocomponents.in     / DNair@Electro26        (supplier → Electrocomponents)');
    console.log('  k.sundaram@techvolt.in          / KSundaram@TechVolt26   (viewer — Finance & Accounts)');
    console.log('\nData summary:');
    console.log('  3 warehouses   (Bengaluru, Pune, Chennai)');
    console.log('  4 suppliers    (Mouser India, Electrocomponents, SunTech PCB, Amara Raja)');
    console.log('  15 products    (MCUs, passives, displays, power, connectors, PCBs, consumables)');
    console.log('  37 inventory   records across 3 warehouses');
    console.log('  6 purchase orders: received(1), ordered(1), approved(1), pending(2), cancelled(1)');
    console.log('  2 shipments:   SHP-0001 delivered → BLR STM32  |  SHP-0002 in_transit → PNQ OLED+battery');
    console.log('  3 stock moves: 1× IN (shipment delivery), 2× OUT/ADJUSTMENT (production usage)');
    console.log('  6 alerts:      1 critical, 2 high, 2 medium, 1 low');
    console.log('\nPipeline state:');
    console.log('  pending → approved → ordered → received  (full flow shown via PO1+SHP1)');
    console.log('  PO3 approved:  procurement can create a shipment (auto-advances to ordered)');
    console.log('  PO4/PO5 pending: admin can approve them');
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
