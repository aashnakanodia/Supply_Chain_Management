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

    // ── Wipe existing data ────────────────────────────────────────────────────
    await client.query(`
      TRUNCATE chat_messages, chat_sessions, audit_logs, alerts,
               shipments, purchase_order_items, purchase_orders,
               stock_movements, supplier_products, inventory_items,
               users, suppliers, warehouses
      RESTART IDENTITY CASCADE
    `);
    console.log('Cleared existing data...');

    // ── Warehouses ────────────────────────────────────────────────────────────
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

    // ── Suppliers ─────────────────────────────────────────────────────────────
    const { rows: [supMouser] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES
        ('Mouser Electronics India Pvt. Ltd.',
         'Vikram Mehta',
         'v.mehta@mouser-india.com',
         '+91-80-4567-8901',
         '3rd Floor, Prestige Tech Park, Outer Ring Road, Devarabeesanahalli',
         'Bengaluru', 'India',
         'Advance Payment', 7)
      RETURNING id
    `);
    const { rows: [supElectro] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES
        ('Electrocomponents India Pvt. Ltd.',
         'Deepa Nair',
         'd.nair@electrocomponents.in',
         '+91-22-6789-0123',
         'Unit 5B, Peninsula Business Park, Senapati Bapat Marg, Lower Parel',
         'Mumbai', 'India',
         'Net 30', 10)
      RETURNING id
    `);
    const { rows: [supSuntech] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES
        ('SunTech PCB Solutions Pvt. Ltd.',
         'Harish Gupta',
         'h.gupta@suntechpcb.in',
         '+91-120-4567-8900',
         'B-47, Sector 63, NOIDA Industrial Development Area',
         'Noida', 'India',
         'Net 45', 21)
      RETURNING id
    `);
    const { rows: [supAmara] } = await client.query(`
      INSERT INTO suppliers
        (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
      VALUES
        ('Amara Raja Power Systems Ltd.',
         'Srinivas Reddy',
         's.reddy@amararaja.in',
         '+91-877-234-5678',
         'Survey No. 93, Karakambadi Road, Renigunta',
         'Tirupati', 'India',
         'Net 30', 14)
      RETURNING id
    `);

    const sup = {
      mouser:  supMouser.id,
      electro: supElectro.id,
      suntech: supSuntech.id,
      amara:   supAmara.id,
    };
    console.log('Suppliers created...');

    // ── Users ─────────────────────────────────────────────────────────────────
    const hash = (pw) => bcrypt.hash(pw, 12);

    // Admin
    const { rows: [uAdmin] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Rajesh', 'Iyer', 'admin') RETURNING id
    `, ['r.iyer@techvolt.in', await hash('RIyer@TechVolt26')]);

    // Procurement Manager
    const { rows: [uProcure] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Ananya', 'Krishnamurthy', 'procurement_manager') RETURNING id
    `, ['a.krishnamurthy@techvolt.in', await hash('AKrishna@TechVolt26')]);

    // Warehouse Staff — Bengaluru
    const { rows: [uStaffBLR] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Suresh', 'Babu', 'warehouse_staff', $3) RETURNING id
    `, ['s.babu@techvolt.in', await hash('SBabu@TechVolt26'), wh.blr]);

    // Warehouse Staff — Pune
    const { rows: [uStaffPNQ] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id)
      VALUES ($1, $2, 'Pooja', 'Deshmukh', 'warehouse_staff', $3) RETURNING id
    `, ['p.deshmukh@techvolt.in', await hash('PDeshmukh@TechVolt26'), wh.pnq]);

    // Supplier users
    const { rows: [uSupMouser] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Vikram', 'Mehta', 'supplier', $3) RETURNING id
    `, ['v.mehta@mouser-india.com', await hash('VMehta@Mouser26'), sup.mouser]);

    const { rows: [uSupElectro] } = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, supplier_id)
      VALUES ($1, $2, 'Deepa', 'Nair', 'supplier', $3) RETURNING id
    `, ['d.nair@electrocomponents.in', await hash('DNair@Electro26'), sup.electro]);

    // Viewer — Finance & Accounts
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, 'Karthik', 'Sundaram', 'viewer')
    `, ['k.sundaram@techvolt.in', await hash('KSundaram@TechVolt26')]);

    const u = {
      admin:     uAdmin.id,
      procure:   uProcure.id,
      staffBLR:  uStaffBLR.id,
      staffPNQ:  uStaffPNQ.id,
      supMouser: uSupMouser.id,
    };

    // Assign warehouse managers
    await client.query(`UPDATE warehouses SET manager_id = $1 WHERE id = $2`, [u.staffBLR, wh.blr]);
    await client.query(`UPDATE warehouses SET manager_id = $1 WHERE id = $2`, [u.staffPNQ, wh.pnq]);

    console.log('Users created...');

    // ── Products (prices in INR) ───────────────────────────────────────────────
    const productDefs = [
      // Microcontrollers
      { sku: 'MCU-ESP32-WROOM32',    name: 'ESP32-WROOM-32D WiFi+BT Module',         category: 'Microcontrollers',   unit: 'piece', unit_price: 245.00,   reorder_level: 500,   lead_time_days: 14 },
      { sku: 'MCU-STM32F103C8T6',    name: 'STM32F103C8T6 ARM Cortex-M3 MCU',        category: 'Microcontrollers',   unit: 'piece', unit_price: 105.00,   reorder_level: 1000,  lead_time_days: 10 },
      // Passive Components
      { sku: 'CAP-ELEC-10UF-50V',    name: '10µF 50V Electrolytic Capacitor',         category: 'Passive Components', unit: 'piece', unit_price: 6.50,     reorder_level: 5000,  lead_time_days: 21 },
      { sku: 'CAP-MLCC-100NF-50V',   name: '100nF 50V MLCC Capacitor 0402',           category: 'Passive Components', unit: 'piece', unit_price: 1.50,     reorder_level: 10000, lead_time_days: 21 },
      { sku: 'RES-10K-0402-1PCT',    name: '10kΩ 1% 0.1W Resistor 0402',             category: 'Passive Components', unit: 'piece', unit_price: 0.80,     reorder_level: 10000, lead_time_days: 21 },
      // Semiconductors
      { sku: 'SEMI-IRLZ44N-MOSFET',  name: 'IRLZ44N N-Channel Power MOSFET TO-220',  category: 'Semiconductors',     unit: 'piece', unit_price: 58.00,    reorder_level: 2000,  lead_time_days: 10 },
      { sku: 'REG-AMS1117-33',        name: 'AMS1117-3.3V LDO Voltage Regulator',     category: 'Semiconductors',     unit: 'piece', unit_price: 16.00,    reorder_level: 3000,  lead_time_days: 10 },
      // Displays
      { sku: 'DISP-TFT-7IN-800X480', name: '7" TFT LCD Display 800×480 RGB',          category: 'Displays',           unit: 'piece', unit_price: 1550.00,  reorder_level: 100,   lead_time_days: 28 },
      { sku: 'DISP-OLED-096-128X64', name: '0.96" OLED Display 128×64 I2C',           category: 'Displays',           unit: 'piece', unit_price: 265.00,   reorder_level: 500,   lead_time_days: 21 },
      // Power
      { sku: 'BAT-LIPO-3000MAH',     name: '3.7V 3000mAh Li-Po Battery Pack',         category: 'Power',              unit: 'piece', unit_price: 420.00,   reorder_level: 300,   lead_time_days: 21 },
      { sku: 'PWR-ADAPTER-12V2A',    name: '12V 2A DC Power Adapter with ISI Mark',   category: 'Power',              unit: 'piece', unit_price: 545.00,   reorder_level: 200,   lead_time_days: 14 },
      // Connectors
      { sku: 'CONN-USBC-SMD-16PIN',  name: 'USB Type-C Receptacle SMD 16-Pin',        category: 'Connectors',         unit: 'piece', unit_price: 38.00,    reorder_level: 2000,  lead_time_days: 21 },
      { sku: 'CONN-HDR-40M-254MM',   name: '40-Pin 2.54mm Male Pin Header',            category: 'Connectors',         unit: 'piece', unit_price: 12.00,    reorder_level: 3000,  lead_time_days: 21 },
      // PCBs
      { sku: 'PCB-FR4-100X80-2L',    name: 'FR4 PCB 100×80mm 2-Layer 1.6mm',          category: 'PCBs',               unit: 'piece', unit_price: 95.00,    reorder_level: 500,   lead_time_days: 21 },
      // Consumables
      { sku: 'SOLD-LFREE-08MM-250G', name: 'Lead-Free Solder Wire 0.8mm 250g Reel',   category: 'Consumables',        unit: 'reel',  unit_price: 980.00,   reorder_level: 50,    lead_time_days: 7  },
    ];

    const productIds = {};
    for (const p of productDefs) {
      const { rows } = await client.query(`
        INSERT INTO products (sku, name, category, unit, unit_price, reorder_level, lead_time_days)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name, unit_price = EXCLUDED.unit_price
        RETURNING id
      `, [p.sku, p.name, p.category, p.unit, p.unit_price, p.reorder_level, p.lead_time_days]);
      productIds[p.sku] = rows[0].id;
    }
    console.log('Products created...');

    // ── Inventory Items ───────────────────────────────────────────────────────
    const inventoryData = [
      // Bengaluru Assembly Plant
      { wh: wh.blr, sku: 'MCU-ESP32-WROOM32',    qty: 1240,  rp: 500   },
      { wh: wh.blr, sku: 'MCU-STM32F103C8T6',    qty: 87,    rp: 1000  }, // CRITICAL
      { wh: wh.blr, sku: 'CAP-ELEC-10UF-50V',    qty: 28400, rp: 5000  },
      { wh: wh.blr, sku: 'CAP-MLCC-100NF-50V',   qty: 62000, rp: 10000 },
      { wh: wh.blr, sku: 'RES-10K-0402-1PCT',    qty: 95000, rp: 10000 },
      { wh: wh.blr, sku: 'SEMI-IRLZ44N-MOSFET',  qty: 3400,  rp: 2000  },
      { wh: wh.blr, sku: 'REG-AMS1117-33',        qty: 7200,  rp: 3000  },
      { wh: wh.blr, sku: 'DISP-TFT-7IN-800X480', qty: 210,   rp: 100   },
      { wh: wh.blr, sku: 'DISP-OLED-096-128X64', qty: 38,    rp: 500   }, // CRITICAL
      { wh: wh.blr, sku: 'BAT-LIPO-3000MAH',     qty: 520,   rp: 300   },
      { wh: wh.blr, sku: 'PWR-ADAPTER-12V2A',    qty: 340,   rp: 200   },
      { wh: wh.blr, sku: 'CONN-USBC-SMD-16PIN',  qty: 4800,  rp: 2000  },
      { wh: wh.blr, sku: 'CONN-HDR-40M-254MM',   qty: 6200,  rp: 3000  },
      { wh: wh.blr, sku: 'PCB-FR4-100X80-2L',    qty: 890,   rp: 500   },
      { wh: wh.blr, sku: 'SOLD-LFREE-08MM-250G', qty: 42,    rp: 50    }, // LOW
      // Pune Manufacturing Facility
      { wh: wh.pnq, sku: 'MCU-ESP32-WROOM32',    qty: 680,   rp: 500   },
      { wh: wh.pnq, sku: 'MCU-STM32F103C8T6',    qty: 1450,  rp: 1000  },
      { wh: wh.pnq, sku: 'CAP-ELEC-10UF-50V',    qty: 15000, rp: 5000  },
      { wh: wh.pnq, sku: 'CAP-MLCC-100NF-50V',   qty: 44000, rp: 10000 },
      { wh: wh.pnq, sku: 'RES-10K-0402-1PCT',    qty: 71000, rp: 10000 },
      { wh: wh.pnq, sku: 'SEMI-IRLZ44N-MOSFET',  qty: 1800,  rp: 2000  }, // LOW
      { wh: wh.pnq, sku: 'REG-AMS1117-33',        qty: 4100,  rp: 3000  },
      { wh: wh.pnq, sku: 'DISP-TFT-7IN-800X480', qty: 95,    rp: 100   },
      { wh: wh.pnq, sku: 'DISP-OLED-096-128X64', qty: 620,   rp: 500   },
      { wh: wh.pnq, sku: 'BAT-LIPO-3000MAH',     qty: 280,   rp: 300   }, // LOW
      { wh: wh.pnq, sku: 'PWR-ADAPTER-12V2A',    qty: 415,   rp: 200   },
      { wh: wh.pnq, sku: 'CONN-USBC-SMD-16PIN',  qty: 3300,  rp: 2000  },
      { wh: wh.pnq, sku: 'CONN-HDR-40M-254MM',   qty: 5100,  rp: 3000  },
      { wh: wh.pnq, sku: 'PCB-FR4-100X80-2L',    qty: 420,   rp: 500   }, // LOW
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

    const invIds = {};
    for (const row of inventoryData) {
      const pid = productIds[row.sku];
      const { rows } = await client.query(`
        INSERT INTO inventory_items (warehouse_id, product_id, quantity, reorder_point)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (warehouse_id, product_id) DO UPDATE
          SET quantity = EXCLUDED.quantity, reorder_point = EXCLUDED.reorder_point
        RETURNING id
      `, [row.wh, pid, row.qty, row.rp]);
      invIds[`${row.wh}_${row.sku}`] = rows[0].id;
    }
    console.log('Inventory created...');

    // ── Supplier Products (prices in INR) ─────────────────────────────────────

    // Mouser India: MCU modules, displays, batteries
    const mouserProducts = [
      { sku: 'MCU-ESP32-WROOM32',    price: 188.00,  moq: 100,   ltd: 7  },
      { sku: 'MCU-STM32F103C8T6',    price: 78.00,   moq: 500,   ltd: 7  },
      { sku: 'DISP-TFT-7IN-800X480', price: 1100.00, moq: 50,    ltd: 14 },
      { sku: 'DISP-OLED-096-128X64', price: 175.00,  moq: 200,   ltd: 14 },
      { sku: 'BAT-LIPO-3000MAH',     price: 285.00,  moq: 100,   ltd: 21 },
    ];
    for (const p of mouserProducts) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
        ON CONFLICT (supplier_id, product_id) DO NOTHING
      `, [sup.mouser, productIds[p.sku], p.price, p.ltd, p.moq]);
    }

    // Electrocomponents India: semiconductors, passives
    const electroProducts = [
      { sku: 'SEMI-IRLZ44N-MOSFET',  price: 42.00,  moq: 500,   ltd: 10 },
      { sku: 'REG-AMS1117-33',        price: 11.50,  moq: 1000,  ltd: 10 },
      { sku: 'CAP-ELEC-10UF-50V',    price: 4.20,   moq: 5000,  ltd: 10 },
      { sku: 'CONN-USBC-SMD-16PIN',   price: 26.00,  moq: 1000,  ltd: 10 },
      { sku: 'CONN-HDR-40M-254MM',    price: 8.00,   moq: 2000,  ltd: 7  },
    ];
    for (const p of electroProducts) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
        ON CONFLICT (supplier_id, product_id) DO NOTHING
      `, [sup.electro, productIds[p.sku], p.price, p.ltd, p.moq]);
    }

    // SunTech PCB: PCBs + passives
    const suntechProducts = [
      { sku: 'PCB-FR4-100X80-2L',    price: 68.00,  moq: 200,   ltd: 21 },
      { sku: 'CAP-MLCC-100NF-50V',   price: 0.90,   moq: 10000, ltd: 21 },
      { sku: 'RES-10K-0402-1PCT',    price: 0.45,   moq: 10000, ltd: 21 },
    ];
    for (const p of suntechProducts) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
        ON CONFLICT (supplier_id, product_id) DO NOTHING
      `, [sup.suntech, productIds[p.sku], p.price, p.ltd, p.moq]);
    }

    // Amara Raja: power products + consumables
    const amaraProducts = [
      { sku: 'PWR-ADAPTER-12V2A',    price: 395.00, moq: 100,   ltd: 14 },
      { sku: 'BAT-LIPO-3000MAH',     price: 310.00, moq: 50,    ltd: 14 },
      { sku: 'SOLD-LFREE-08MM-250G', price: 745.00, moq: 20,    ltd: 7  },
    ];
    for (const p of amaraProducts) {
      await client.query(`
        INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
        VALUES ($1,$2,$3,$4,$5,TRUE)
        ON CONFLICT (supplier_id, product_id) DO NOTHING
      `, [sup.amara, productIds[p.sku], p.price, p.ltd, p.moq]);
    }
    console.log('Supplier products created...');

    // ── Purchase Orders (amounts in INR) ──────────────────────────────────────

    // PO-2026-0001: RECEIVED — STM32 MCUs from Mouser, Bengaluru
    // 2000 units × ₹78 = ₹1,56,000
    const { rows: [po1] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0001', $1, $2, 'received', 156000.00, $3, $4,
              'Emergency restock of STM32F103 MCUs — Bengaluru production line critical. Approved by GM Operations.',
              '2026-06-01', '2026-06-08')
      RETURNING id
    `, [sup.mouser, wh.blr, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1,$2,2000,78.00,2000)
    `, [po1.id, productIds['MCU-STM32F103C8T6']]);

    // Stock movement for received PO1
    const invSTM32BLR = invIds[`${wh.blr}_MCU-STM32F103C8T6`];
    if (invSTM32BLR) {
      await client.query(`
        INSERT INTO stock_movements
          (inventory_item_id, warehouse_id, product_id, movement_type,
           quantity, reference_type, reference_id, notes, created_by)
        VALUES ($1,$2,$3,'IN',2000,'purchase_order',$4,
                'Received from Mouser Electronics India Pvt. Ltd. — all units QC passed',$5)
      `, [invSTM32BLR, wh.blr, productIds['MCU-STM32F103C8T6'], po1.id, u.staffBLR]);
    }

    // PO-2026-0002: ORDERED — OLED displays + Li-Po batteries from Mouser, Pune
    // 1000 OLED × ₹175 + 500 battery × ₹285 = ₹1,75,000 + ₹1,42,500 = ₹3,17,500
    const { rows: [po2] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0002', $1, $2, 'ordered', 317500.00, $3, $4,
              'Q2 OLED display and Li-Po battery restock for IoT-Mini V3 assembly line at Pune. GST Invoice pending.',
              '2026-06-10', '2026-07-08')
      RETURNING id
    `, [sup.mouser, wh.pnq, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1,$2,1000,175.00,0), ($1,$3,500,285.00,0)
    `, [po2.id, productIds['DISP-OLED-096-128X64'], productIds['BAT-LIPO-3000MAH']]);

    // PO-2026-0003: APPROVED — PCBs + passives from SunTech, Bengaluru
    // 1000 PCB × ₹68 + 50000 MLCC × ₹0.90 + 80000 RES × ₹0.45
    // = ₹68,000 + ₹45,000 + ₹36,000 = ₹1,49,000
    const { rows: [po3] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, approved_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0003', $1, $2, 'approved', 149000.00, $3, $4,
              'Monthly PCB and passive component replenishment. SunTech confirmed lead time 21 days from Noida facility.',
              '2026-06-18', '2026-07-15')
      RETURNING id
    `, [sup.suntech, wh.blr, u.procure, u.admin]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1,$2,1000,68.00,0), ($1,$3,50000,0.90,0), ($1,$4,80000,0.45,0)
    `, [po3.id,
        productIds['PCB-FR4-100X80-2L'],
        productIds['CAP-MLCC-100NF-50V'],
        productIds['RES-10K-0402-1PCT']]);

    // PO-2026-0004: PENDING — PCBs + USB-C from SunTech, Pune (awaiting approval)
    // 1000 PCB × ₹68 + 5000 USB-C × ₹26 = ₹68,000 + ₹1,30,000 = ₹1,98,000
    const { rows: [po4] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, order_date, expected_date)
      VALUES ('PO-2026-0004', $1, $2, 'pending', 198000.00, $3,
              'Pune line PCB stock critically low — Board-B production scheduled 28 Jun. Requesting urgent approval from Ananya K.',
              '2026-06-22', '2026-07-18')
      RETURNING id
    `, [sup.suntech, wh.pnq, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1,$2,1000,68.00,0), ($1,$3,5000,26.00,0)
    `, [po4.id, productIds['PCB-FR4-100X80-2L'], productIds['CONN-USBC-SMD-16PIN']]);

    // PO-2026-0005: DRAFT — Power adapters from Amara Raja, Chennai
    // 200 units × ₹395 = ₹79,000
    const { rows: [po5] } = await client.query(`
      INSERT INTO purchase_orders
        (po_number, supplier_id, warehouse_id, status, total_amount,
         ordered_by, notes, expected_date)
      VALUES ('PO-2026-0005', $1, $2, 'draft', 79000.00, $3,
              'Chennai hub Q3 power adapter planning. Amara Raja quote valid until 30 Jul 2026.',
              '2026-07-31')
      RETURNING id
    `, [sup.amara, wh.chn, u.procure]);

    await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, product_id, quantity, unit_price, received_quantity)
      VALUES ($1,$2,200,395.00,0)
    `, [po5.id, productIds['PWR-ADAPTER-12V2A']]);

    console.log('Purchase orders created...');

    // ── Shipments ─────────────────────────────────────────────────────────────

    // SHP-2026-0001: in_transit — PO2 (Mouser → Pune, OLED + batteries)
    await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, notes)
      VALUES ('SHP-2026-0001', $1, $2, 'in_transit',
              'Blue Dart Express', 'BD-9934421-MUM-PNQ',
              '2026-06-12', '2026-07-08',
              'Dispatched from Mouser Mumbai warehouse. In transit to Pune facility via Blue Dart Express cargo.')
    `, [po2.id, wh.pnq]);

    // SHP-2026-0002: completed — PO1 (Mouser → Bengaluru, STM32 MCUs)
    await client.query(`
      INSERT INTO shipments
        (shipment_number, purchase_order_id, warehouse_id, status,
         carrier, tracking_number, shipped_date, expected_arrival, actual_arrival, notes)
      VALUES ('SHP-2026-0002', $1, $2, 'completed',
              'DTDC Courier & Cargo', 'DTDC-B2B-77234100',
              '2026-06-02', '2026-06-08', '2026-06-07',
              'Delivered one day ahead of schedule. All 2,000 STM32 units inspected. QC report ref: QC-BLR-2026-0247.')
    `, [po1.id, wh.blr]);

    console.log('Shipments created...');

    // ── Alerts ────────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
      VALUES
        ('low_stock', 'critical',
         'STM32F103C8T6 MCUs critically low — Bengaluru Plant',
         'Current stock: 87 units. Reorder point: 1,000. Board Rev-C production line will halt within 48 hours. PO-2026-0001 received 2,000 units but high consumption continues. Raise next order immediately.',
         $1, $2),

        ('low_stock', 'critical',
         'OLED Display (0.96") near stockout — Bengaluru Plant',
         'Current stock: 38 units against reorder point of 500. IoT-Mini V3 assembly line impacted. SHP-2026-0001 carrying 1,000 units in transit via Blue Dart, expected 08-Jul-2026.',
         $1, $3),

        ('low_stock', 'high',
         'FR4 PCBs below reorder threshold — Pune Facility',
         'Current stock: 420 units. Reorder point: 500. PO-2026-0004 pending Ananya Krishnamurthy approval. Board-B production run scheduled for 28-Jun-2026 — approval needed today.',
         $4, $5),

        ('low_stock', 'high',
         'Li-Po Battery (3000mAh) running low — Pune Facility',
         'Current stock: 280 units. Reorder point: 300. SHP-2026-0001 carrying 500 units in transit, expected 08-Jul-2026. Monitor stock carefully for next 2 weeks.',
         $4, $6),

        ('delayed_shipment', 'medium',
         'SHP-2026-0001 — Monitor Blue Dart Shipment',
         'Blue Dart shipment BD-9934421-MUM-PNQ from Mouser India expected 08-Jul-2026. Track for any customs or transit delays. Contact: Blue Dart helpline 1860-233-1234.',
         $4, NULL)
    `, [
      wh.blr, productIds['MCU-STM32F103C8T6'],
      productIds['DISP-OLED-096-128X64'],
      wh.pnq,
      productIds['PCB-FR4-100X80-2L'],
      productIds['BAT-LIPO-3000MAH'],
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
    console.log('  15 products    (MCUs, passives, displays, power, connectors, PCBs) — prices in INR');
    console.log('  39 inventory   records across 3 warehouses');
    console.log('  5 purchase orders (received, ordered, approved, pending, draft) — values in INR');
    console.log('  2 shipments    (1 in transit via Blue Dart, 1 completed via DTDC)');
    console.log('  5 alerts       (2 critical, 2 high, 1 medium)');
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
