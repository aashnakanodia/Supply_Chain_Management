# Supply Chain Management System

A production-ready REST API for end-to-end supply chain operations built for **TechVolt Electronics Pvt. Ltd.** — an Indian electronics distributor. Features role-based access control, real-time WebSocket events, automated inventory alerts, and a full purchase order lifecycle.

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Database:** PostgreSQL 14+ (raw SQL via `pg`, no ORM)
- **Auth:** JWT access tokens (15 min) + refresh tokens (7 days) · bcrypt (12 rounds)
- **Real-Time:** Socket.io (role + warehouse scoped rooms)
- **Security:** Helmet · CORS · express-rate-limit

---

## Architecture

Organized in three strict layers — **Routes → Controllers → Services** — with all business logic and SQL confined to services. Data-scoping (restricting warehouse_staff to their warehouse, suppliers to their own records) is enforced inside every service using a `scope` object derived from the JWT, never from user-supplied request data.

Real-time events use a Node.js `EventEmitter` as an internal bus — services emit events after every transaction commit, and Socket.io listens on the bus to broadcast to the correct rooms.

---

## Folder Structure

```
supply_chain_management/
├── server.js                   Entry point — DB check, HTTP server, Socket.io init
├── src/
│   ├── app.js                  Express setup, routes, global middleware
│   ├── config/
│   │   ├── env.js              Validates required env vars on startup
│   │   └── database.js         pg Pool singleton + transaction helper
│   ├── middleware/
│   │   ├── auth.js             JWT verification → req.user
│   │   ├── rbac.js             requirePermission() matrix
│   │   └── errorHandler.js     Global error → { success, error }
│   ├── services/               Business logic + SQL + scope enforcement
│   ├── controllers/            HTTP ↔ service translation
│   ├── routes/                 Route definitions + middleware chains
│   ├── socket/                 Socket.io init + EventBus → room routing
│   └── utils/
│       ├── AppError.js         Custom error class
│       ├── tokens.js           JWT sign/verify helpers
│       ├── scope.js            Derives data-scope from req.user
│       ├── validate.js         Custom input validation (no external library)
│       ├── audit.js            Writes to audit_logs after every mutation
│       └── eventBus.js         EventEmitter singleton for real-time events
├── migrations/                 16 numbered SQL migration files
└── scripts/
    ├── migrate.js              Runs pending migrations
    └── seed.js                 Inserts Indian demo data + 5 role accounts
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/aashnakanodia/Supply_Chain_Management.git
cd Supply_Chain_Management
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DB credentials and generate JWT secrets:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Create the database

```sql
CREATE DATABASE supply_chain_db;
```

### 4. Run migrations

```bash
npm run migrate
```

### 5. Seed demo data

```bash
npm run seed
```

### 6. Start the server

```bash
npm run dev     # development (hot reload)
npm start       # production
```

Server: `http://localhost:3000/api/v1`  
WebSocket: `ws://localhost:3000`

---

## API Endpoints

All responses follow a consistent shape:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "message": "...", "code": "ERROR_CODE" } }
```

| Resource | Base Path |
|---|---|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Warehouses | `/api/v1/warehouses` |
| Suppliers | `/api/v1/suppliers` |
| Products | `/api/v1/products` |
| Inventory | `/api/v1/inventory` |
| Purchase Orders | `/api/v1/purchase-orders` |
| Shipments | `/api/v1/shipments` |
| Alerts | `/api/v1/alerts` |
| Stock Movements | `/api/v1/stock-movements` |
| Dashboard | `/api/v1/dashboard` |
| Audit Logs | `/api/v1/audit-logs` |

---

## Real-Time Events (Socket.io)

Connect with a JWT token and listen for live events:

```js
const socket = io('http://localhost:3000', { auth: { token: '<jwt>' } });
socket.on('INVENTORY_CHANGED', (data) => console.log(data));
```

| Event | Triggered when |
|---|---|
| `INVENTORY_CHANGED` | Stock adjusted or PO received |
| `NEW_ALERT` | Inventory drops to or below reorder point |
| `ALERT_RESOLVED` | Stock replenished above reorder point |
| `PO_APPROVED` | Purchase order approved |
| `PO_STATUS_CHANGED` | PO status updated |
| `SHIPMENT_STATUS_CHANGED` | Shipment status updated |

Events are broadcast only to rooms the user belongs to (`role:admin`, `warehouse:<id>`, `supplier:<id>`).

---

## Roles & Permissions

| Role | Key Capabilities |
|---|---|
| `admin` | Full access to everything |
| `procurement_manager` | Create/approve POs, manage shipments, view all |
| `warehouse_staff` | Adjust inventory and manage shipments for their warehouse only |
| `supplier` | View their own POs, shipments, and product catalogue |
| `viewer` | Read-only access across all resources |

---

## Demo Accounts (after `npm run seed`)

| Email | Password | Role |
|---|---|---|
| rajesh.iyer@techvolt.in | Admin@1234 | admin |
| priya.sharma@techvolt.in | Admin@1234 | procurement_manager |
| suresh.kumar@techvolt.in | Admin@1234 | warehouse_staff (Bengaluru) |
| contact@brightelectronics.in | Admin@1234 | supplier |
| ananya.menon@techvolt.in | Admin@1234 | viewer |

---

## Supply Chain Flow

```
Create PO (pending)
  → Approve PO (approved)        [PO_APPROVED event]
  → Mark as Ordered (ordered)    [PO_STATUS_CHANGED event]
  → Create Shipment
  → Update Shipment to in_transit [SHIPMENT_STATUS_CHANGED event]
  → Mark PO as Received (received)
      → Auto credits inventory    [INVENTORY_CHANGED event]
      → Auto resolves low-stock alerts [ALERT_RESOLVED event]
```
