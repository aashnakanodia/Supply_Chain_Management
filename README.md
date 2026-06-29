# Supply Chain Management System

A full-stack supply chain platform built for **TechVolt Electronics Pvt. Ltd.** — an Indian electronics distributor. Features a React frontend, real-time WebSocket events, role-based access control, automated inventory alerts, a full purchase order lifecycle, and password reset via email.

---

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Database:** PostgreSQL 14+ (raw SQL via `pg`, no ORM)
- **Auth:** JWT access tokens (15 min) + refresh tokens (7 days) · bcrypt (12 rounds)
- **Real-Time:** Socket.io (role + warehouse scoped rooms)
- **Email:** Resend API (password reset emails)
- **Security:** Helmet · CORS · express-rate-limit

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Plain CSS with CSS custom properties (no Tailwind)
- **Routing:** React Router v6
- **HTTP:** Axios with JWT interceptor + silent token refresh
- **Real-Time:** Socket.io-client
- **Charts:** Recharts
- **Icons:** lucide-react

---

## Architecture

Organized in three strict layers — **Routes → Controllers → Services** — with all business logic and SQL confined to services. Data-scoping (restricting warehouse_staff to their warehouse, suppliers to their own records) is enforced inside every service using a `scope` object derived from the JWT, never from user-supplied request data.

Real-time events use a Node.js `EventEmitter` as an internal bus — services emit events after every transaction commit, and Socket.io listens on the bus to broadcast to the correct rooms. The React frontend subscribes to these events and updates the UI live without polling.

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
│       ├── mailer.js           Resend email integration (password reset)
│       └── eventBus.js         EventEmitter singleton for real-time events
├── migrations/                 17 numbered SQL migration files
├── scripts/
│   ├── migrate.js              Runs pending migrations
│   └── seed.js                 Inserts Indian demo data + 5 role accounts
└── frontend/
    ├── index.html
    ├── vite.config.js          Proxies /api → localhost:3000
    └── src/
        ├── App.jsx             Routes + public/private guards
        ├── api/                Axios API layer (one file per resource)
        ├── components/
        │   ├── layout/         Sidebar, TopBar, AppLayout
        │   └── ui/             Badge, Modal, Spinner, EmptyState
        ├── context/            AuthContext (session restore, login, logout)
        ├── hooks/              useSocket, useToast
        ├── pages/              Landing, Auth, Dashboard, Inventory,
        │                       PurchaseOrders, Shipments, Alerts,
        │                       Users, ResetPassword
        └── utils/
            └── formatters.js   INR formatting, date, role labels
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
```

Edit `.env` and fill in all values:

```env
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=supply_chain_db
DB_USER=postgres
DB_PASSWORD=your_password

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
APP_URL=http://localhost:5173

# Resend (https://resend.com) — for password reset emails
RESEND_API_KEY=re_your_key_here
RESEND_FROM=TechVolt SCM <onboarding@resend.dev>

ANTHROPIC_API_KEY=sk-ant-your_key_here
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

### 6. Start the backend

```bash
npm run dev     # development (nodemon hot reload)
npm start       # production
```

Backend API: `http://localhost:3000/api/v1`  
WebSocket: `ws://localhost:3000`

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## Pages

| Page | Path | Access |
|---|---|---|
| Landing | `/` | Public |
| Sign In / Create Account | `/auth` | Public |
| Reset Password | `/reset-password` | Public |
| Dashboard | `/dashboard` | All roles |
| Inventory | `/inventory` | All roles |
| Purchase Orders | `/purchase-orders` | All roles |
| Shipments | `/shipments` | All roles |
| Alerts | `/alerts` | All roles |
| Users | `/users` | Admin only |

---

## API Endpoints

All responses follow a consistent shape:

```json
{ "success": true,  "data": { ... } }
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

### Auth endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |

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
| `admin` | Full access to everything including user management |
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
  → Approve PO (approved)          [PO_APPROVED event]
  → Mark as Ordered (ordered)      [PO_STATUS_CHANGED event]
  → Create Shipment
  → Update Shipment to in_transit  [SHIPMENT_STATUS_CHANGED event]
  → Mark PO as Received (received)
      → Auto credits inventory     [INVENTORY_CHANGED event]
      → Auto resolves low-stock alerts [ALERT_RESOLVED event]
```

---

## Password Reset Flow

```
Forgot password? link on sign-in
  → Enter email → POST /auth/forgot-password
  → Resend sends branded HTML email with 1-hour token link
  → User clicks link → /reset-password?token=xxx
  → Enter new password → POST /auth/reset-password
  → Token marked used → redirect to sign in
```

> If `RESEND_API_KEY` is not set, the reset link is printed to the backend terminal (useful for local development).
